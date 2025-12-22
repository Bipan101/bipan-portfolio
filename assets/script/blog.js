// Blog functionality - Hashnode API Integration
'use strict';

const HASHNODE_USERNAME = 'bipan101';
const HASHNODE_API = 'https://gql.hashnode.com';
const HASHNODE_WORKER_ENDPOINT =
  (typeof window !== 'undefined' && window.HASHNODE_WORKER_ENDPOINT)
  || (typeof document !== 'undefined'
    ? document.querySelector('meta[name="hashnode-worker-endpoint"]')?.getAttribute('content')
    : null)
  || (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://127.0.0.1:8787/posts'
    : null);

// First, get all of the user's publications
const GET_PUBLICATION_QUERY = `
  query GetUserPublication($username: String!) {
    user(username: $username) {
      publications(first: 10) {
        edges {
          node {
            id
            title
            url
            isTeam
          }
        }
      }
    }
  }
`;

// Then get posts from the publication
const GET_POSTS_QUERY = `
  query Publication($host: String!) {
    publication(host: $host) {
      isTeam
      title
      posts(first: 50) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            subtitle
            brief
            slug
            url
            coverImage {
              url
            }
            publishedAt
            updatedAt
            readTimeInMinutes
            reactionCount
            responseCount
            tags {
              id
              name
              slug
            }
            author {
              name
              username
            }
          }
        }
      }
    }
  }
`;

// Fetch blog posts with the Cloudflare Worker proxy so the PAT stays server-side
async function fetchHashnodePostsViaWorker() {
  if (!HASHNODE_WORKER_ENDPOINT) {
    throw new Error('Hashnode worker endpoint is not configured.');
  }

  try {
    const endpointUrl = new URL(HASHNODE_WORKER_ENDPOINT, window.location.origin);

    if (!endpointUrl.searchParams.has('username') && HASHNODE_USERNAME) {
      endpointUrl.searchParams.set('username', HASHNODE_USERNAME);
    }

    const response = await fetch(endpointUrl.toString(), {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
      credentials: 'omit',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`Worker responded with status ${response.status}`);
    }

    const payload = await response.json();

    if (!Array.isArray(payload.posts)) {
      throw new Error('Worker response is missing the posts array.');
    }

    return payload.posts;
  } catch (error) {
    console.error('Hashnode worker fetch failed:', error);
    throw error;
  }
}

// Fetch blog posts from Hashnode directly (no proxy)
async function fetchHashnodePostsDirect() {
  try {
    // First, get all of the user's publications
    const pubResponse = await fetch(HASHNODE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({
        query: GET_PUBLICATION_QUERY,
        variables: {
          username: HASHNODE_USERNAME
        }
      })
    });

    const pubData = await pubResponse.json();
    
    if (pubData.errors) {
      console.error('GraphQL errors:', pubData.errors);
      throw new Error('GraphQL Error');
    }

    const publicationEdges = pubData.data?.user?.publications?.edges || [];
    
    if (publicationEdges.length === 0) {
      return [];
    }

    // Fetch posts from ALL publications
    const allPostsPromises = publicationEdges.map(async (publicationEdge) => {
      const publicationUrl = publicationEdge.node.url;
      const host = new URL(publicationUrl).hostname;

      // Fetch posts from this publication
      const postsResponse = await fetch(HASHNODE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          query: GET_POSTS_QUERY,
          variables: {
            host: host
          }
        })
      });

      const postsData = await postsResponse.json();
      
      if (postsData.errors) {
        console.error('GraphQL errors for', host, ':', postsData.errors);
        return [];
      }

      const posts = postsData.data?.publication?.posts?.edges || [];
      
      return posts.map(edge => edge.node);
    });

    // Wait for all publications to be fetched
    const allPostsArrays = await Promise.all(allPostsPromises);
    
    // Flatten all posts into a single array
    const allPosts = allPostsArrays.flat();
    
    // Sort by publishedAt date (newest first)
    const sortedPosts = allPosts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return sortedPosts;
  } catch (error) {
    console.error('Error fetching Hashnode posts:', error);
    throw error;
  }
}

// Unified fetch helper that prefers the worker proxy but can fall back to direct calls
async function fetchHashnodePosts() {
  if (HASHNODE_WORKER_ENDPOINT) {
    try {
      return await fetchHashnodePostsViaWorker();
    } catch (workerError) {
      console.warn('Worker fetch failed. Falling back to direct Hashnode request.', workerError);
    }
  }

  return fetchHashnodePostsDirect();
}

// Alternative fetch method using Hashnode's RSS feed
async function fetchPostsAlternative(host) {
  try {
    // Try to use a simpler direct query
    const simpleQuery = `
      query Publication($host: String!) {
        publication(host: $host) {
          posts(first: 10) {
            edges {
              node {
                title
                brief
                url
                slug
                coverImage {
                  url
                }
                publishedAt
                readTimeInMinutes
                tags {
                  name
                  slug
                }
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch(HASHNODE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({
        query: simpleQuery,
        variables: { host }
      })
    });
    
    const data = await response.json();
    
    const posts = data.data?.publication?.posts?.edges || [];
    return posts.map(edge => edge.node);
  } catch (error) {
    console.error('Alternative method also failed:', error);
    return [];
  }
}

// Format date to readable format
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Sanitize HTML to prevent XSS attacks
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Create blog post card HTML
function createBlogCard(post) {
  const {
    title,
    coverImage,
    url,
    brief,
    subtitle,
    publishedAt,
    readTimeInMinutes
  } = post;
  
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(url);
  const imageUrl = coverImage?.url || 'https://cdn.hashnode.com/res/hashnode/image/upload/v1683525272582/MB5H4bOD3.png';
  const safeImage = escapeHtml(imageUrl);
  const formattedDate = publishedAt ? formatDate(publishedAt) : '';
  const readTimeLabel = readTimeInMinutes ? `${readTimeInMinutes} min read` : '';
  const dateAttr = publishedAt ? `datetime="${escapeHtml(publishedAt)}"` : '';
  
  const metaParts = [
    formattedDate ? `<time ${dateAttr}>${formattedDate}</time>` : '',
    readTimeLabel ? `<span class="blog-read-time">${escapeHtml(readTimeLabel)}</span>` : ''
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

// Display blog posts
function displayBlogPosts(posts) {
  const blogList = document.getElementById('blog-posts-list');
  const loadingElement = document.getElementById('blog-loading');
  const errorElement = document.getElementById('blog-error');

  // Hide loading
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }

  if (posts.length === 0) {
    blogList.innerHTML = `
      <li class="blog-empty">
        <ion-icon name="document-text-outline"></ion-icon>
        <p>No blog posts yet. Stay tuned for upcoming content!</p>
        <a href="https://hashnode.com/@bipan101" target="_blank" class="empty-blog-link">
          Visit my Hashnode blog
        </a>
      </li>
    `;
    return;
  }

  // Display all posts - map each post to HTML
  try {
    const postsHTML = posts.map((post) => {
      return createBlogCard(post);
    }).join('');
    
    blogList.innerHTML = postsHTML;
    
  } catch (error) {
    console.error('Error rendering blog posts:', error);
    showError();
  }
}

// Handle error state
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

// Initialize blog when page loads
async function initializeBlog() {
  // Only fetch posts when blog page is active
  const blogPage = document.querySelector('[data-page="blog"]');
  
  if (!blogPage) {
    return;
  }

  try {
    const posts = await fetchHashnodePosts();
    displayBlogPosts(posts);
  } catch (error) {
    console.error('Blog initialization failed:', error);
    showError();
  }
}

// Add manual refresh function
window.refreshBlogPosts = function() {
  const blogList = document.getElementById('blog-posts-list');
  const loadingElement = document.getElementById('blog-loading');
  
  // Reset state
  if (blogList) blogList.innerHTML = '';
  if (loadingElement) loadingElement.style.display = 'flex';
  
  // Re-initialize
  initializeBlog();
}

// Listen for navigation to blog page
document.addEventListener('DOMContentLoaded', () => {
  const navigationLinks = document.querySelectorAll('[data-nav-link]');
  
  navigationLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (this.innerHTML.toLowerCase() === 'blog') {
        // Small delay to ensure page transition completes
        setTimeout(initializeBlog, 100);
      }
    });
  });
  
  // Check if blog is already active on page load
  // Use a small delay to ensure DOM is fully ready
  setTimeout(() => {
    const activePage = document.querySelector('[data-page].active');
    if (activePage && activePage.dataset.page === 'blog') {
      initializeBlog();
    }
  }, 100);
});

// Also initialize immediately when the blog page becomes visible
// This handles the case when navigating to blog via URL hash or direct navigation
if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.dataset.page === 'blog' && target.classList.contains('active')) {
          // Check if posts are already loaded
          const blogList = document.getElementById('blog-posts-list');
          if (blogList && blogList.children.length === 0) {
            initializeBlog();
          }
        }
      }
    });
  });
  
  // Start observing after DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const blogPage = document.querySelector('[data-page="blog"]');
    if (blogPage) {
      observer.observe(blogPage, { attributes: true });
    }
  });
}
