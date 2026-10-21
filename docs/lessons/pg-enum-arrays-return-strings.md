# Cast Postgres enum arrays to `text[]` for `pg`

`node-postgres` does not parse arrays of custom enum types. A query returning `sale_form[]` arrives as the string `"{pack,strip,loose}"`, so Zod rejects it with `expected array, received string`.

Cast the array to `text[]` in SQL; the driver parses text arrays natively and the runtime schema still validates each member.

```sql
select
  coalesce(
    (
      select array_agg(forms.sale_form order by forms.form_order)
      from (...) forms
    ),
    '{}'::sale_form[]
  )::text[] as available_forms
```

`search.repository.server.ts` hit this when the search response gained `available_forms`. The fix is in the projection, not the Zod schema.
