# Validator Middleware for Hono

Validator middleware for [Hono](https://github.com/honojs/hono).
This middleware that wraps [validator.js](https://github.com/validatorjs/validator.js) validates form body, queries, headers, and JSON body.

![SS](https://user-images.githubusercontent.com/10682/184135311-bdc9bd65-3e58-4d36-9709-bdf324e808ad.png)

## Features

- **Hono integration** - You can use it just like any other middleware.
- **Multi platform** - Works on Cloudflare Workers, Deno, Bun, and others.
- **A lot of rules** - Rules defined in [validator.js](https://github.com/validatorjs/validator.js) are available.
- **Sanitization** - Sanitize functions like `trim` are also available.
- **Rendering error automatically** - If it's a bother, you don't have to set error messages.
- **Result set** - It's flexible to handle validation results.
- **JSON Path** - You can specify the JSON value using "_JSON Path_".

## Install

npm:

```
npm install hono
npm install @honojs/validator
```

Deno:

```ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { Hono } from 'https://deno.land/x/hono/mod.ts'
import { validation } from 'https://deno.land/x/hono_validator/mod.ts'

//...
serve(app.fetch)
```

Bun:

```
bun install hono
bun install @honojs/validator
```

## Usage

### Synopsis

```ts
import { Hono } from 'hono'
import { validation } from '@honojs/validator'

const app = new Hono()

app.post(
  '/post',
  validation((v, message) => ({
    body: {
      title: [v.required, message('Title is required!!')],
      body: [v.isLength, { max: 400 }],
    },
  })),
  (c) => c.text('Created!', 201)
)

export default app
```

### Validation Rules

Validator Middleware wraps [validator.js](https://github.com/validatorjs/validator.js). There are a lot of rules in the library.
You can validate four types of targets: form body, request headers, search params, and JSON body.

```ts
app.post(
  '*',
  validation((v) => ({
    body: {
      // Pass the parameters to the validator using array:
      name: [v.isAlpha, [v.contains, 'abc']],
      pref: [v.required, [v.isIn, ['valid', 'also_valid']]],
    },
    header: {
      'x-custom-header': v.isAlphanumeric,
    },
    query: {
      q: v.required,
    },
    json: {
      // You can specify the key using JSON Path:
      'post.author.email': [v.required, v.isEmail],
    },
  }))
)
```

### Sanitization

You can sanitize the values before passing the theme to the validator.

```ts
app.post(
  '/post',
  validation((v) => ({
    body: {
      email: [v.trim, v.isEmail],
    },
  }))
)
```

### Error Handling

If it's invalid, it will return "400" response with the messages set automatically.

![SS](https://user-images.githubusercontent.com/10682/183292440-b6010e05-d275-45fa-95d0-b2528e842d05.png)

### Custom Message

You can set custom error messages for each rule.

```ts
app.post(
  '/post',
  validation((v, message) => ({
    body: {
      title: [v.required, message('Please set the title! Please!')],
    },
  }))
)
```

### Custom Validator

Making custom validator is easy.

```ts
const passwordValidator = (value: string) => {
  return value.match(/[a-zA-Z0-9+=]+/) ? true : false
}

app.post(
  '/custom-validator',
  validation((_, message) => ({
    body: {
      password: [passwordValidator, message('password is wrong')],
    },
  }))
)
```

### Validation Results

You can handle the errors more flexibly using `done` method.

```ts
app.get(
  '/custom-error',
  validation((v) => ({
    body: {
      userId: v.required,
    },
    done: (result, c) => {
      if (result.hasError) {
        return c.json({ messages: result.messages }, 403)
      }
    },
  })),
  (c) => {
    return c.json({ messages: ['SUCCESS'] })
  }
)
```

## Contributing

Contributions Welcome! See the contribution guide on Hono repository.

- [Contribution Guide](https://github.com/honojs/hono/blob/main/docs/CONTRIBUTING.md)

## Related Projects

- Hono - <https://honojs.dev/>
- Hono Examples - <https://github.com/honojs/examples>
- validator.js - <https://github.com/validatorjs/validator.js>
- JSONPath-Plus - <http://goessner.net/articles/JsonPath/](https://github.com/JSONPath-Plus/JSONPath>

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
