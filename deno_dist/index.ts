import type { Handler, Context } from "https://deno.land/x/hono@v2.0.6/mod.ts"
import { JSONPath } from "https://esm.sh/jsonpath-plus@7.0.0"
import validator from './validator.ts'
export type Validator = typeof validator

type Param = string | number | Record<string, string | number> | Message
type Rule = Function | [Function, ...Param[]]
type RuleSet = Rule | Rule[]

type Validate = {
  body?: Record<string, RuleSet>
  json?: Record<string, RuleSet>
  header?: Record<string, RuleSet>
  query?: Record<string, RuleSet>
}

type ResultSet = {
  hasError: boolean
  messages: string[]
  errors: Result[]
}

type Result = {
  rule: Function
  params: Param[]
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

    const result: ResultSet = {
      hasError: false,
      messages: [],
      errors: [],
    }

    for (const v of validations) {
      const validate = (
        ruleSet: RuleSet,
        value: string,
        messageFunc: (ruleName: string) => string
      ) => {
        value ||= ''

        let count = 0
        const results: Result[] = []

        const check = (ruleSet: RuleSet) => {
          if (!Array.isArray(ruleSet)) {
            if (ruleSet instanceof Message) {
              if (results[count - 1]) {
                results[count - 1].message = ruleSet.getMessage()
              }
            } else if (typeof ruleSet === 'function') {
              results[count] = {
                rule: ruleSet,
                params: [],
              }
              count++
            } else {
              results[count - 1].params.push(ruleSet)
            }
          } else {
            for (const rule of ruleSet) {
              check(rule as RuleSet)
            }
          }
        }
        check(ruleSet)

        let invalid = false
        results.map((r) => {
          const ok = r.rule(value, ...r.params)
          if (!invalid && ok === false) {
            invalid = true
            result.errors.push(r)
            if (r.message) {
              result.messages.push(r.message)
            } else {
              result.messages.push(messageFunc(r.rule.name))
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

const validationResult = (c: Context): ResultSet => {
  return c.get('validationResult')
}

export { validation, validationResult }
