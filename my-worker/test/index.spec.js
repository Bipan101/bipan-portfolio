import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src';

const mediumFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0">
  <channel>
    <title><![CDATA[Stories by Bipan Neupane on Medium]]></title>
    <item>
      <title><![CDATA[Testing Medium Integration]]></title>
      <link>https://medium.com/@bipan101/testing-medium-integration-123456</link>
      <guid isPermaLink="false">medium://p/123456</guid>
      <dc:creator><![CDATA[Bipan Neupane]]></dc:creator>
      <pubDate>Fri, 24 Jul 2026 12:00:00 GMT</pubDate>
      <category><![CDATA[Machine Learning]]></category>
      <description><![CDATA[A quick summary of the post.]]></description>
      <content:encoded><![CDATA[<p>A quick summary of the post.</p><img src="https://cdn.example.com/post-cover.jpg" />]]></content:encoded>
    </item>
  </channel>
</rss>`;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Medium RSS worker', () => {
	it('returns posts from the Medium feed', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(mediumFeed, {
				status: 200,
				headers: { 'Content-Type': 'application/rss+xml' },
			})
		);

		const request = new Request('http://example.com/posts?username=bipan101', {
			headers: { Origin: 'https://www.bipanneupane.com.np' },
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://www.bipanneupane.com.np');

		const payload = await response.json();
		expect(payload.posts).toHaveLength(1);
		expect(payload.posts[0]).toMatchObject({
			title: 'Testing Medium Integration',
			url: 'https://medium.com/@bipan101/testing-medium-integration-123456',
			brief: 'A quick summary of the post.',
			coverImage: { url: 'https://cdn.example.com/post-cover.jpg' },
			author: { name: 'Bipan Neupane', username: 'bipan101' },
		});
	});

	it('handles preflight requests', async () => {
		const response = await worker.fetch(
			new Request('http://example.com/posts', {
				method: 'OPTIONS',
				headers: {
					Origin: 'https://bipanneupane.com.np',
					'Access-Control-Request-Headers': 'Content-Type',
				},
			}),
			env,
			createExecutionContext()
		);

		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://bipanneupane.com.np');
	});
});
