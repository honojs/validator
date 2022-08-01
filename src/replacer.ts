// @denoify-ignore
import { makeThisModuleAnExecutableReplacer } from 'denoify'

makeThisModuleAnExecutableReplacer(async ({ parsedImportExportStatement }) => {
  if (parsedImportExportStatement.parsedArgument.nodeModuleName === 'hono') {
    if ((parsedImportExportStatement as any)['statementType'] === 'declare module') {
      return 'declare module "https://deno.land/x/hono@v2.0.6/mod.ts"'
    } else {
      return 'import type { Handler, Context } from "https://deno.land/x/hono@v2.0.6/mod.ts"'
    }
  }

  if (parsedImportExportStatement.parsedArgument.nodeModuleName === 'validator') {
    if (!parsedImportExportStatement.isAsyncImport) {
      return 'import validator from "https://esm.sh/validator@13.7.0"'
    } else {
      return 'import ("https://esm.sh/validator@13.7.0")'
    }
  }
  if (parsedImportExportStatement.parsedArgument.nodeModuleName === 'jsonpath-plus') {
    return 'import { JSONPath } from "https://esm.sh/jsonpath-plus@7.0.0"'
  }
  return undefined
})
