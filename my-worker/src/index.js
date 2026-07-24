import { XMLParser } from 'fast-xml-parser';

const DEFAULT_MEDIUM_USERNAME = 'bipan101';
const DEFAULT_FEED_BASE = 'https://medium.com/feed/@';
const DEFAULT_FALLBACK_IMAGE = 'https://miro.medium.com/v2/resize:fit:1200/1*9_rb_rMrKcz_91rJopF3_w.jpeg';

const ALLOWED_ORIGINS = [
	'https://bipanneupane.com.np',
	'https://www.bipanneupane.com.np',
	'http://localhost:3000',
	'http://localhost:5500',
	'http://127.0.0.1:3000',
	'http://127.0.0.1:5500',
	'http://127.0.0.1:8787',
];

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	trimValues: true,
	parseTagValue: false,
	removeNSPrefix: false,
	isArray: (name) => ['item', 'category'].includes(name),
});

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

const decodeHtmlEntities = (value = '') =>
	value
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();

const stripHtml = (value = '') => decodeHtmlEntities(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const toArray = (value) => {
	if (!value) {
		return [];
	}

	return Array.isArray(value) ? value : [value];
};

const buildFeedUrl = (username) => `${DEFAULT_FEED_BASE}${encodeURIComponent(username)}`;

const extractImageUrl = (item) => {
	const content = item['content:encoded'] || item.description || '';
	const imageMatch = content.match(/<img[^>]+src="([^"]+)"/i);
	if (imageMatch?.[1]) {
		return imageMatch[1];
	}

	const thumbnail = item['media:thumbnail']?.['@_url'] || item.thumbnail?.['@_url'];
	return thumbnail || DEFAULT_FALLBACK_IMAGE;
};

const estimateReadTime = (item) => {
	const content = stripHtml(item['content:encoded'] || item.description || '');
	if (!content) {
		return null;
	}

	const words = content.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
};

const sanitizePosts = (items) => {
	return toArray(items)
		.filter(Boolean)
		.map((item, index) => {
			const title = decodeHtmlEntities(item.title || 'Untitled');
			const url = decodeHtmlEntities(item.link || '');
			const descriptionText = stripHtml(item.description || item['content:encoded'] || '');
			const categories = toArray(item.category).map((category) => ({
				id: decodeHtmlEntities(String(category)).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
				name: decodeHtmlEntities(String(category)),
				slug: decodeHtmlEntities(String(category)).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
			}));

			return {
				id: decodeHtmlEntities(item.guid?.['#text'] || item.guid || url || `${title}-${index}`),
				title,
				subtitle: descriptionText,
				brief: descriptionText,
				slug: url ? new URL(url).pathname.split('/').filter(Boolean).pop() || '' : '',
				url,
				coverImage: { url: extractImageUrl(item) },
				publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
				updatedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
				readTimeInMinutes: estimateReadTime(item),
				reactionCount: null,
				responseCount: null,
				tags: categories,
				author: {
					name: decodeHtmlEntities(item['dc:creator'] || 'Bipan Neupane'),
					username: DEFAULT_MEDIUM_USERNAME,
				},
			};
		})
		.filter((post) => post.url);
};

const fetchMediumFeed = async (username) => {
	const response = await fetch(buildFeedUrl(username), {
		headers: {
			'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8',
			'User-Agent': 'bipan-portfolio-worker/1.0',
		},
	});

	if (!response.ok) {
		throw new Error(`Medium feed error (${response.status})`);
	}

	return response.text();
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

		const username = url.searchParams.get('username') || env.MEDIUM_USERNAME || DEFAULT_MEDIUM_USERNAME;

		try {
			const feedXml = await fetchMediumFeed(username);
			const parsed = parser.parse(feedXml);
			const items = parsed?.rss?.channel?.item || [];
			const sortedPosts = sanitizePosts(items).sort(
				(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
			);

			return jsonResponse({ posts: sortedPosts }, {}, request);
		} catch (error) {
			console.error('Medium proxy error:', error.message);
			return jsonResponse({ error: 'Unable to fetch Medium posts at the moment.' }, { status: 502 }, request);
		}
	},
};
