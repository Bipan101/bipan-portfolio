// Blog functionality - Hashnode API Integration
'use strict';

const HASHNODE_USERNAME = 'bipan101';
const HASHNODE_API = 'https://gql.hashnode.com';

// First, get the user's publication host
const GET_PUBLICATION_QUERY = `
  query GetUserPublication($username: String!) {
    user(username: $username) {
      publications(first: 1) {
        edges {
          node {
            id
            title
            url
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
      posts(first: 20) {
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

// Fetch blog posts from Hashnode
async function fetchHashnodePosts() {
  try {
    // First, get the user's publication
    const pubResponse = await fetch(HASHNODE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_PUBLICATION_QUERY,
        variables: {
          username: HASHNODE_USERNAME
        }
      })
    });

    const pubData = await pubResponse.json();
    console.log('Publication data:', pubData); // Debug log
    
    if (pubData.errors) {
      console.error('GraphQL errors:', pubData.errors);
      throw new Error('GraphQL Error');
    }

    const publicationEdge = pubData.data?.user?.publications?.edges?.[0];
    
    if (!publicationEdge) {
      console.log('No publication found for user');
      return [];
    }

    // Extract the host from the publication URL
    const publicationUrl = publicationEdge.node.url;
    const host = new URL(publicationUrl).hostname;
    
    console.log('Publication host:', host); // Debug log

    // Now fetch posts from the publication
    const postsResponse = await fetch(HASHNODE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_POSTS_QUERY,
        variables: {
          host: host
        }
      })
    });

    const postsData = await postsResponse.json();
    console.log('Posts data:', postsData); // Debug log
    console.log('Full posts structure:', JSON.stringify(postsData, null, 2)); // Detailed debug
    
    if (postsData.errors) {
      console.error('GraphQL errors:', postsData.errors);
      throw new Error('GraphQL Error');
    }

    const posts = postsData.data?.publication?.posts?.edges || [];
    console.log('Extracted posts array:', posts); // Debug extracted posts
    console.log('Number of posts found:', posts.length); // Count
    
    // If no posts found, try alternative method
    if (posts.length === 0) {
      console.log('No posts found via GraphQL, trying alternative...');
      // Try fetching via RSS/alternative
      return await fetchPostsAlternative(host);
    }
    
    return posts.map(edge => edge.node);
  } catch (error) {
    console.error('Error fetching Hashnode posts:', error);
    throw error;
  }
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
      },
      body: JSON.stringify({
        query: simpleQuery,
        variables: { host }
      })
    });
    
    const data = await response.json();
    console.log('Alternative method response:', data);
    
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
  const { title, coverImage, url } = post;
  
  // Sanitize all user-generated content
  const safeTitle = escapeHtml(title);
  
  // Use cover image if available, otherwise use a placeholder
  const imageUrl = coverImage?.url || 'https://cdn.hashnode.com/res/hashnode/image/upload/v1683525272582/MB5H4bOD3.png';
  
  return `
    <li class="blog-post-item">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
        <figure class="blog-banner-box">
          <img src="${escapeHtml(imageUrl)}" alt="${safeTitle}" loading="lazy">
        </figure>

        <div class="blog-content">
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

  console.log('Displaying posts:', posts);
  console.log('Total posts to display:', posts.length);

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
    const postsHTML = posts.map((post, index) => {
      console.log(`Creating card for post ${index + 1}:`, post.title);
      return createBlogCard(post);
    }).join('');
    
    blogList.innerHTML = postsHTML;
    console.log('Successfully rendered', posts.length, 'blog posts');
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
    showError();
  }
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
