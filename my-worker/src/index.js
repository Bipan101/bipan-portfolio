const HASHNODE_API_ENDPOINT = 'https://gql.hashnode.com';
const DEFAULT_USERNAME = 'bipan101';

const GET_PUBLICATION_QUERY = `
  query GetUserPublication($username: String!) {
    user(username: $username) {
      publications(first: 10) {
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

const GET_POSTS_QUERY = `
  query Publication($host: String!) {
    publication(host: $host) {
      posts(first: 50) {
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

const ALLOWED_ORIGINS = [
	'https://bipanneupane.com.np',
	'https://www.bipanneupane.com.np',
	'http://localhost:3000',
	'http://localhost:5500',
	'http://127.0.0.1:3000',
	'http://127.0.0.1:5500',
	'http://127.0.0.1:8787',
];

const buildCorsHeaders = (request, overrides = {}) => {
	const originHeader = request.headers.get('Origin');
	const allowedOrigin = ALLOWED_ORIGINS.includes(originHeader) ? originHeader : ALLOWED_ORIGINS[0];
	const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'GET,OPTIONS',
		'Access-Control-Allow-Headers': requestedHeaders || 'Content-Type',
		'Access-Control-Max-Age': '86400',
		'Vary': 'Origin',
		...overrides,
	};
};

const jsonResponse = (body, init = {}, request = null) => {
	const headers = buildCorsHeaders(request || new Request('http://localhost'), {
		'Content-Type': 'application/json',
		...(init.headers || {}),
	});
	return new Response(JSON.stringify(body), {
		...init,
		headers,
	});
};

const hashnodeRequest = async (query, variables, token) => {
	const response = await fetch(HASHNODE_API_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ query, variables }),
	});

	const payload = await response.json();

	if (!response.ok || payload.errors) {
		const message = payload.errors?.[0]?.message || `Hashnode error (${response.status})`;
		throw new Error(message);
	}

	return payload.data;
};

const getPublications = async (username, token) => {
	const data = await hashnodeRequest(GET_PUBLICATION_QUERY, { username }, token);
	return data?.user?.publications?.edges?.map((edge) => edge.node).filter(Boolean) || [];
};

const getPostsForHost = async (host, token) => {
	const data = await hashnodeRequest(GET_POSTS_QUERY, { host }, token);
	return data?.publication?.posts?.edges?.map((edge) => edge.node).filter(Boolean) || [];
};

const sanitizePosts = (posts) => {
	return posts
		.filter(Boolean)
		.map((post) => ({
			id: post.id,
			title: post.title,
			subtitle: post.subtitle,
			brief: post.brief,
			slug: post.slug,
			url: post.url,
			coverImage: post.coverImage,
			publishedAt: post.publishedAt,
			updatedAt: post.updatedAt,
			readTimeInMinutes: post.readTimeInMinutes,
			reactionCount: post.reactionCount,
			responseCount: post.responseCount,
			tags: post.tags,
			author: post.author,
		}));
};

export default {
	async fetch(request, env) {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: buildCorsHeaders(request),
			});
		}

		const url = new URL(request.url);
		const pathname = url.pathname === '/' ? '/posts' : url.pathname;

		if (pathname !== '/posts') {
			return jsonResponse({ error: 'Not Found' }, { status: 404 }, request);
		}

		if (request.method !== 'GET') {
			return jsonResponse({ error: 'Method Not Allowed' }, { status: 405 }, request);
		}

		const token = env.HASHNODE_TOKEN;
		if (!token) {
			return jsonResponse({ error: 'Missing HASHNODE_TOKEN secret' }, { status: 500 }, request);
		}

		const username = url.searchParams.get('username') || env.HASHNODE_USERNAME || DEFAULT_USERNAME;

		try {
			const publications = await getPublications(username, token);
			if (!publications.length) {
				return jsonResponse({ posts: [] }, {}, request);
			}

			const postsByPublication = await Promise.all(
				publications.map(async (publication) => {
					try {
						const publicationUrl = new URL(publication.url);
						return await getPostsForHost(publicationUrl.hostname, token);
					} catch (error) {
						console.error('Failed to fetch posts for publication:', publication.url, error.message);
						return [];
					}
				})
			);

			const allPosts = sanitizePosts(postsByPublication.flat());
			const uniquePostsMap = new Map();
			allPosts.forEach((post) => {
				if (!uniquePostsMap.has(post.id)) {
					uniquePostsMap.set(post.id, post);
				}
			});

			const sortedPosts = Array.from(uniquePostsMap.values()).sort(
				(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
			);

			return jsonResponse({ posts: sortedPosts }, {}, request);
		} catch (error) {
			console.error('Hashnode proxy error:', error.message);
			return jsonResponse({ error: 'Unable to fetch Hashnode posts at the moment.' }, { status: 502 }, request);
		}
	},
};
