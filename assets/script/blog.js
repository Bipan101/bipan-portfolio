'use strict';

const MEDIUM_USERNAME = 'bipan101';
const MEDIUM_RSS_JSON_ENDPOINT =
  `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(`https://medium.com/feed/@${MEDIUM_USERNAME}`)}`;
const MEDIUM_WORKER_ENDPOINT =
  (typeof window !== 'undefined' && window.MEDIUM_WORKER_ENDPOINT)
  || (typeof document !== 'undefined'
    ? document.querySelector('meta[name="medium-worker-endpoint"]')?.getAttribute('content')
    : null)
  || (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://127.0.0.1:8787/posts'
    : null);

let blogFetchInFlight = null;

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function stripHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerHTML = text;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function extractFirstImageUrl(html) {
  if (!html) return '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function estimateReadTimeFromText(text) {
  const words = stripHtml(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function normalizeMediumRssItem(item) {
  const description = item.description || '';
  const contentImage = extractFirstImageUrl(description);
  const fallbackImage = item.thumbnail || contentImage || 'https://miro.medium.com/v2/resize:fit:1200/1*9_rb_rMrKcz_91rJopF3_w.jpeg';

  return {
    id: item.guid || item.link || item.title,
    title: item.title || 'Untitled',
    subtitle: stripHtml(description),
    brief: stripHtml(description),
    slug: '',
    url: item.link || '#',
    coverImage: { url: fallbackImage },
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    updatedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    readTimeInMinutes: estimateReadTimeFromText(description),
    reactionCount: null,
    responseCount: null,
    tags: [],
    author: {
      name: item.author || MEDIUM_USERNAME,
      username: MEDIUM_USERNAME,
    },
  };
}

async function fetchMediumPostsViaWorker() {
  if (!MEDIUM_WORKER_ENDPOINT) {
    throw new Error('Medium worker endpoint is not configured.');
  }

  const endpointUrl = new URL(MEDIUM_WORKER_ENDPOINT, window.location.origin);

  if (!endpointUrl.searchParams.has('username') && MEDIUM_USERNAME) {
    endpointUrl.searchParams.set('username', MEDIUM_USERNAME);
  }

  const response = await fetch(endpointUrl.toString(), {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
    },
    credentials: 'omit',
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`Worker responded with status ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.posts)) {
    throw new Error('Worker response is missing the posts array.');
  }

  return payload.posts;
}

async function fetchMediumPostsViaRssJson() {
  const response = await fetch(MEDIUM_RSS_JSON_ENDPOINT, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
    },
    credentials: 'omit',
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`RSS-to-JSON endpoint responded with status ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.items)) {
    throw new Error('RSS-to-JSON response is missing the items array.');
  }

  return payload.items.map(normalizeMediumRssItem);
}

function createBlogCard(post) {
  const safeTitle = escapeHtml(post.title);
  const safeUrl = escapeHtml(post.url);
  const imageUrl = post.coverImage?.url || 'https://miro.medium.com/v2/resize:fit:1200/1*9_rb_rMrKcz_91rJopF3_w.jpeg';
  const safeImage = escapeHtml(imageUrl);
  const formattedDate = post.publishedAt ? formatDate(post.publishedAt) : '';
  const readTimeLabel = post.readTimeInMinutes ? `${post.readTimeInMinutes} min read` : '';
  const dateAttr = post.publishedAt ? `datetime="${escapeHtml(post.publishedAt)}"` : '';

  const metaParts = [
    formattedDate ? `<time ${dateAttr}>${formattedDate}</time>` : '',
    readTimeLabel ? `<span class="blog-read-time">${escapeHtml(readTimeLabel)}</span>` : '',
  ].filter(Boolean).join('<span class="blog-meta-dot"></span>');

  return `
    <li class="blog-post-item">
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
        <figure class="blog-banner-box">
          <img src="${safeImage}" alt="${safeTitle}" loading="lazy">
        </figure>

        <div class="blog-content">
          ${metaParts ? `<div class="blog-meta">${metaParts}</div>` : ''}
          <h3 class="h3 blog-item-title">${safeTitle}</h3>
        </div>
      </a>
    </li>
  `;
}

function showError() {
  const loadingElement = document.getElementById('blog-loading');
  const errorElement = document.getElementById('blog-error');

  if (loadingElement) {
    loadingElement.style.display = 'none';
  }

  if (errorElement) {
    errorElement.style.display = 'flex';
  }
}

function displayBlogPosts(posts) {
  const blogList = document.getElementById('blog-posts-list');
  const loadingElement = document.getElementById('blog-loading');
  const errorElement = document.getElementById('blog-error');

  if (loadingElement) {
    loadingElement.style.display = 'none';
  }

  if (errorElement) {
    errorElement.style.display = 'none';
  }

  if (!blogList) {
    return;
  }

  if (posts.length === 0) {
    blogList.innerHTML = `
      <li class="blog-empty">
        <ion-icon name="document-text-outline"></ion-icon>
        <p>No blog posts yet. Stay tuned for upcoming content!</p>
        <a href="https://medium.com/@bipan101" target="_blank" class="empty-blog-link">
          Visit my Medium profile
        </a>
      </li>
    `;
    return;
  }

  blogList.innerHTML = posts.map(createBlogCard).join('');
}

async function initializeBlog() {
  const blogPage = document.querySelector('[data-page="blog"]');

  if (!blogPage) {
    return;
  }

  if (blogFetchInFlight) {
    return blogFetchInFlight;
  }

  blogFetchInFlight = (async () => {
    try {
      let posts = [];

      if (MEDIUM_WORKER_ENDPOINT) {
        try {
          posts = await fetchMediumPostsViaWorker();
        } catch (workerError) {
          console.warn('Medium worker fetch failed, falling back to RSS JSON.', workerError);
          posts = await fetchMediumPostsViaRssJson();
        }
      } else {
        posts = await fetchMediumPostsViaRssJson();
      }

      displayBlogPosts(posts);
    } catch (error) {
      console.error('Blog initialization failed:', error);
      showError();
    } finally {
      blogFetchInFlight = null;
    }
  })();

  return blogFetchInFlight;
}

window.refreshBlogPosts = function () {
  const blogList = document.getElementById('blog-posts-list');
  const loadingElement = document.getElementById('blog-loading');
  const errorElement = document.getElementById('blog-error');

  if (blogList) blogList.innerHTML = '';
  if (loadingElement) loadingElement.style.display = 'flex';
  if (errorElement) errorElement.style.display = 'none';

  initializeBlog();
};

document.addEventListener('DOMContentLoaded', () => {
  const navigationLinks = document.querySelectorAll('[data-nav-link]');

  navigationLinks.forEach((link) => {
    link.addEventListener('click', function () {
      if (this.innerHTML.toLowerCase() === 'blog') {
        setTimeout(initializeBlog, 100);
      }
    });
  });

  setTimeout(() => {
    const activePage = document.querySelector('[data-page].active');
    if (activePage && activePage.dataset.page === 'blog') {
      initializeBlog();
    }
  }, 100);
});

if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.dataset.page === 'blog' && target.classList.contains('active')) {
          const blogList = document.getElementById('blog-posts-list');
          if (blogList && blogList.children.length === 0) {
            initializeBlog();
          }
        }
      }
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    const blogPage = document.querySelector('[data-page="blog"]');
    if (blogPage) {
      observer.observe(blogPage, { attributes: true });
    }
  });
}
