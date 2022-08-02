import type { Handler, Context } from "https://deno.land/x/hono@v2.0.6/mod.ts"
import { JSONPath } from "https://esm.sh/jsonpath-plus@7.0.0"
import validator from './validator.ts'
export type Validator = typeof validator

type Result = {
  hasError: boolean
  messages: string[]
}

type Rule = Function | [Function, ...any]
type Rules = Rule | Rule[]

type Validate = {
  body?: Record<string, Rules>
  json?: Record<string, Rules>
  header?: Record<string, Rules>
  query?: Record<string, Rules>
  message?: string
}

type Func = {
  func: Function
  params: any[]
}

const validation = (validatorFunction: (validator: Validator) => Validate[]): Handler => {
  return async (c, next) => {
    const validations = validatorFunction(validator)

    const result: Result = {
      hasError: false,
      messages: [],
    }

    for (const v of validations) {
      const validate = (rules: Rules, value: string, message?: string) => {
        value ||= ''

        let funcCount = 0
        const funcs: Func[] = []

        const check = (rules: Rules) => {
          // q: v.required
          if (!Array.isArray(rules)) {
            if (typeof rules === 'function') {
              funcs[funcCount] = {
                func: rules,
                params: [],
              }
              funcCount++
            } else {
              funcs[funcCount - 1].params.push(rules)
            }
          } else {
            for (const rule of rules) {
              check(rule)
            }
          }
        }
        check(rules)

        let invalid = false
        funcs.map((f) => {
          const ok = f.func(value, ...f.params)
          if (!invalid && ok === false) {
            invalid = true
          }
          if (typeof ok !== 'boolean') {
            // ok is sanitized string
            value = ok
          }
        })

        if (invalid) {
          result.hasError = true
          result.messages.push(v.message || message || 'Invalid Value')
          return
        }
      }

      if (v.query) {
        const query = v.query
        Object.keys(query).map((key) => {
          const value = c.req.query(key)
          const message = `Invalid Value: the query parameter "${key}" is invalid`
          validate(query[key], value, message)
        })
      }

      if (v.header) {
        const header = v.header
        Object.keys(header).map((key) => {
          const value = c.req.headers.get(key) || ''
          const message = `Invalid Value: the request header "${key}" is invalid`
          validate(header[key], value, message)
        })
      }

      if (v.body) {
        const field = v.body
        const parsedBody = await c.req.parseBody()
        Object.keys(field).map(async (key) => {
          const value = parsedBody[key]
          const message = `Invalid Value: the request body "${key}" is invalid`
          validate(field[key], value, message)
        })
      }

      if (v.json) {
        const field = v.json
        const json = (await c.req.json()) as any
        Object.keys(field).map(async (key) => {
          const data = JSONPath({ path: key, json })
          const value = `${data[0]}` // Force converting to string
          const message = `Invalid Value: the JSON body "${key}" is invalid`
          validate(field[key], value, message)
        })
      }
    }

    c.set('validationResult', result)
    await next()
    if (result.hasError) {
      return c.text(result.messages.join('\n'), 400)
    }
  }
}

const validationResult = (c: Context): Result => {
  return c.get('validationResult')
}

export { validation, validationResult }
