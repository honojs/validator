import { Hono } from 'hono'
import { validation, validationResult } from '../src/index'

describe('Validator Middleware', () => {
  const app = new Hono()

  // query
  app.get(
    '/foo',
    validation((v) => [
      {
        query: {
          page: [v.required, v.isNumeric],
          q: v.isAlpha,
          q2: [v.isAlpha, [v.contains, 'abc']],
          q3: [[v.contains, 'abc'], v.isAlpha],
          q4: [
            [v.contains, 'abc'],
            [v.isLength, 1, 10],
          ],
          q5: [v.isEmpty, v.required],
          q6: [[v.contains, 'abc'], v.required, [v.isLength, 5, 100]],
        },
      },
    ]),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 400 response - query', async () => {
    const searchParams = new URLSearchParams({
      q: 'foobar',
      q2: 'abcdef',
      q3: 'abcdef',
      q4: 'abcde',
      q5: '123',
      q6: 'abcdef',
    })
    const req = new Request(`http://localhost/foo?${searchParams.toString()}`)
    const res = await app.request(req)
    expect(res.status).toBe(400)
    expect(await res.text()).toBe(
      [
        'Invalid Value: the query parameter "page" is invalid - required',
        'Invalid Value: the query parameter "q5" is invalid - isEmpty',
      ].join('\n')
    )
  })

  // body
  app.post(
    '/bar',
    validation((v) => [
      {
        body: {
          email: [v.trim, v.isEmail],
        },
      },
    ]),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 200 response - body', async () => {
    const formData = new FormData()
    formData.append('email', 'hono@honojs.dev ')
    const req = new Request('http://localhost/bar', {
      method: 'POST',
      body: formData,
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
  })

  // header & custom error message
  app.get(
    '/',
    validation((v, message) => [
      {
        header: {
          'x-header': [v.required, message('CUSTOM MESSAGE')],
        },
      },
    ]),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 400 response - header & custom error message', async () => {
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('CUSTOM MESSAGE')
  })

  // JSON
  app.post(
    '/json',
    validation((v) => [
      {
        json: {
          'post.author.email': v.isEmail,
        },
      },
    ]),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 200 response - JSON', async () => {
    const json = {
      post: {
        author: {
          email: 'hono@honojs.dev',
        },
      },
    }
    const req = new Request('http://localhost/json', {
      method: 'POST',
      body: JSON.stringify(json),
    })
    const res = await app.request(req)
    expect(res.status).toBe(200)
  })

  // Custom Error handling
  app.get(
    '/custom-error',
    // Custom Error handler should be above.
    async (c, next) => {
      await next()
      const result = validationResult(c)
      if (result.hasError) {
        return c.text('CUSTOM ERROR', 404)
      }
    },
    validation((v) => [
      {
        query: {
          userId: v.required,
        },
      },
    ]),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 404 response - custom error handling', async () => {
    const res = await app.request('http://localhost/custom-error')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('CUSTOM ERROR')
  })

  // Custom Validator
  const passwordValidator = (value: string) => {
    return value.match(/[a-zA-Z0-9+=]+/) ? true : false
  }
  app.post(
    '/custom-validator',
    validation((_, message) => [
      {
        body: {
          password: [passwordValidator, message('password is wrong')],
        },
      },
    ]),
    (c) => {
      return c.text('Valid')
    }
  )

  it('Should return 400 response - custom validator', async () => {
    const body = new FormData()
    body.append('password', 'abcd_+123')
    const res = await app.request('http://localhost/custom-validator', { method: 'POST' })
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('password is wrong')
  })
})
