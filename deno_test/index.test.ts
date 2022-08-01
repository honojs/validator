import { validation, validationResult } from '../deno_dist/mod.ts'
import { assertEquals, Hono } from './deps.ts'

// Test just only minimal patterns.
// Because others are tested well in Cloudflare Workers environment already.

Deno.test('Validator Middleware', async () => {
  const app = new Hono()
  app.get(
    '/foo',
    validation((v) => [
      {
        query: {
          q: [v.isAlpha, [v.contains, 'abc']],
        },
      },
    ])
  )
  app.get('/foo', (c) => c.text('valid'))

  let res = await app.request('http://localhost/foo?q=abcdef')
  assertEquals(res.status, 200)
  res = await app.request('http://localhost/foo?q=12345')
  assertEquals(res.status, 400)
  res = await app.request('http://localhost/foo?q=ghijkl')
  assertEquals(res.status, 400)

  app.post(
    '/bar',
    validation((v) => [
      {
        json: {
          'post.author.email': [v.trim, v.isEmail],
        },
      },
    ])
  )
  app.post('/bar', (c) => c.text('valid'))

  let req = new Request('http://localhost/bar', {
    method: 'POST',
    body: JSON.stringify({
      post: {
        author: {
          email: 'foo@honojs.dev ',
        },
      },
    }),
  })

  res = await app.request(req)
  assertEquals(res.status, 200)

  req = new Request('http://localhost/bar', {
    method: 'POST',
    body: JSON.stringify({
      post: {
        author: {
          email: 'foohonojs.dev',
        },
      },
    }),
  })

  res = await app.request(req)
  assertEquals(res.status, 400)
})
