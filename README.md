# Validator Middleware for Hono

Validator middleware for [Hono](https://github.com/honojs/hono).
This middleware that wraps [validator.js](https://github.com/validatorjs/validator.js) validates form body, queries, headers, and JSON body.

**IT'S BETA QUALITY. DO NOT USE IT FOR PRODUCTION USAGE.**

## Install

npm:

```
npm install @honojs/validator
```

Deno:

```ts
import { validation } from 'https://deno.land/x/hono_validator/mod.ts'
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
    query: {
      userId: v.required,
    },
    done: (result, c) => {
      if (result.hasError) {
        return c.json({ OK: false }, 404)
      }
    },
  })),
  (c) => {
    return c.json({ OK: true })
  }
)
```

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
