# A server function called from a route handler is never registered

A `createServerFn` imported only by a route `server.handlers` block builds green but fails at runtime with `Server function info not found for <id>`. Start emits a server-function provider module only when the function is client-referenced; a server handler alone does not create that reference, so the generated server-function manifest stays empty.

Keep the HTTP route thin and put the application work in a server-only feature operation, imported only where the handler runs:

```ts
// src/routes/api.search.ts
import { handleSearch } from '#/features/search/search.server'

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: ({ request }) => handleSearch(parseSearchRequest(request)),
    },
  },
})
```

The route-boundary gate permits a `.server.ts` import only when every binding it imports is used inside a `server` property (`serverHandlerImports` in `tests/routes/dependency-graph.ts`). A component or loader touching the same import still fails.

Use `createServerFn` when the browser or an isomorphic loader is the caller. Use a route `server.handlers` entry when an HTTP caller needs exact `Request`/`Response` semantics, and delegate to a server-only feature operation rather than calling an RPC stub.
