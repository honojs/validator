// @denoify-ignore
import { makeThisModuleAnExecutableReplacer } from 'denoify'

makeThisModuleAnExecutableReplacer(async ({ parsedImportExportStatement, version }) => {
  if (parsedImportExportStatement.parsedArgument.nodeModuleName === 'hono') {
    if ((parsedImportExportStatement as any)['statementType'] === 'declare module') {
      return `declare module "https://deno.land/x/hono@v${version}/mod.ts"`
    } else {
      return `import type { Handler, Context } from "https://deno.land/x/hono@v${version}/mod.ts"`
    }
  }

  if (parsedImportExportStatement.parsedArgument.nodeModuleName === 'validator') {
    if (!parsedImportExportStatement.isAsyncImport) {
      return `import validator from "https://esm.sh/validator@${version}"`
    } else {
      return `import ("https://esm.sh/validator@${version}")`
    }
  }
  if (parsedImportExportStatement.parsedArgument.nodeModuleName === 'jsonpath-plus') {
    return `import { JSONPath } from "https://esm.sh/jsonpath-plus@${version}"`
  }
  return undefined
})
