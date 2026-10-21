# Windows path separators break source-inventory gates

The template's architecture gates (`tests/routes/*`) assume POSIX paths. On Windows, `collectSourceFiles` returns `src\routes\...` and `resolveSource` normalizes to backslashes, while every rule compares against `src/routes/...`. The result is a cascade of false findings: every `#/` import reads as unresolved, shared UI is mistaken for feature code, and synthetic dependency-graph fixtures fail.

Normalize to POSIX separators at both boundaries:

```ts
const relativePath = join(directory, entry).replaceAll('\\', '/')

const base = normalize(join(dirname(importer), specifier)).replaceAll('\\', '/')
```

Keep the source inventory and the resolver agreeing on one separator; patching only one side moves the failure rather than fixing it.
