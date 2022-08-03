import type { Handler, Context } from "https://deno.land/x/hono@v2.0.6/mod.ts"
import { JSONPath } from "https://esm.sh/jsonpath-plus@7.0.0"
import validator from './validator.ts'
export type Validator = typeof validator

type Rule = Function | [Function, ...any]
type Rules = Rule | Rule[]

type Validate = {
  body?: Record<string, Rules>
  json?: Record<string, Rules>
  header?: Record<string, Rules>
  query?: Record<string, Rules>
}

type Result = {
  hasError: boolean
  messages: string[]
  errors: Func[]
}

type Func = {
  rule: Function
  params: any[]
  message?: string
}

class Message {
  value: string
  constructor(value: string) {
    this.value = value
  }
  getMessage(): string {
    return this.value
  }
}

const message = (value: string): Message => {
  return new Message(value)
}

const validation = (
  validatorFunction: (validator: Validator, message: (value: string) => Message) => Validate[]
): Handler => {
  return async (c, next) => {
    const validations = validatorFunction(validator, message)

    const result: Result = {
      hasError: false,
      messages: [],
      errors: [],
    }

    for (const v of validations) {
      const validate = (rules: Rules, value: string, messageFunc: (ruleName: string) => string) => {
        value ||= ''

        let funcCount = 0
        const funcs: Func[] = []

        const check = (rules: Rules) => {
          if (!Array.isArray(rules)) {
            if (rules instanceof Message) {
              if (funcs[funcCount - 1]) {
                funcs[funcCount - 1].message = rules.getMessage()
              }
            } else if (typeof rules === 'function') {
              funcs[funcCount] = {
                rule: rules,
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
          const ok = f.rule(value, ...f.params)
          if (!invalid && ok === false) {
            invalid = true
            result.errors.push(f)
            if (f.message) {
              result.messages.push(f.message)
            } else {
              result.messages.push(messageFunc(f.rule.name))
            }
          }
          if (typeof ok !== 'boolean') {
            // ok is sanitized string
            value = ok
          }
        })

        if (invalid) {
          result.hasError = true
          return
        }
      }

      if (v.query) {
        const query = v.query
        Object.keys(query).map((key) => {
          const value = c.req.query(key)
          const message = (name: string) =>
            `Invalid Value: the query parameter "${key}" is invalid - ${name}`
          validate(query[key], value, message)
        })
      }

      if (v.header) {
        const header = v.header
        Object.keys(header).map((key) => {
          const value = c.req.headers.get(key) || ''
          const message = (name: string) =>
            `Invalid Value: the request header "${key}" is invalid - ${name}`
          validate(header[key], value, message)
        })
      }

      if (v.body) {
        const field = v.body
        const parsedBody = await c.req.parseBody()
        Object.keys(field).map(async (key) => {
          const value = parsedBody[key]
          const message = (name: string) =>
            `Invalid Value: the request body "${key}" is invalid - ${name}`
          validate(field[key], value, message)
        })
      }

      if (v.json) {
        const field = v.json
        const json = (await c.req.json()) as object
        Object.keys(field).map(async (key) => {
          const data = JSONPath({ path: key, json })
          const value = `${data[0]}` // Force converting to string
          const message = (name: string) =>
            `Invalid Value: the JSON body "${key}" is invalid - ${name}`
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
