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
  const { title, brief, coverImage, publishedAt, readTimeInMinutes, url, tags } = post;
  
  // Sanitize all user-generated content
  const safeTitle = escapeHtml(title);
  const safeBrief = escapeHtml(brief);
  
  // Use cover image if available, otherwise use a placeholder
  const imageUrl = coverImage?.url || 'https://cdn.hashnode.com/res/hashnode/image/upload/v1683525272582/MB5H4bOD3.png';
  
  // Get first 2-3 tags
  const displayTags = tags.slice(0, 3);
  
  return `
    <li class="blog-post-item">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
        <figure class="blog-banner-box">
          <img src="${escapeHtml(imageUrl)}" alt="${safeTitle}" loading="lazy">
        </figure>

        <div class="blog-content">
          <div class="blog-meta">
            <p class="blog-category">
              <ion-icon name="calendar-outline"></ion-icon>
              <time datetime="${publishedAt}">${formatDate(publishedAt)}</time>
            </p>
            <span class="dot"></span>
            <p class="blog-category">
              <ion-icon name="time-outline"></ion-icon>
              <span>${readTimeInMinutes} min read</span>
            </p>
          </div>

          <h3 class="h3 blog-item-title">${safeTitle}</h3>

          <p class="blog-text">
            ${safeBrief}
          </p>

          ${displayTags.length > 0 ? `
            <div class="blog-tags">
              ${displayTags.map(tag => `<span class="blog-tag">#${escapeHtml(tag.name)}</span>`).join('')}
            </div>
          ` : ''}
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

  // Display posts
  blogList.innerHTML = posts.map(post => createBlogCard(post)).join('');
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
  const activePage = document.querySelector('[data-page].active');
  if (activePage && activePage.dataset.page === 'blog') {
    initializeBlog();
  }
});
