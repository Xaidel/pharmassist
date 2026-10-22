# A pending migration looks like a database outage

After pulling a commit that adds a file under `migrations/`, a long-lived local database still has the old schema.
Every query that touches the changed objects then throws, and the route handlers map any non-Zod error to `503 DATABASE_UNAVAILABLE` ("Prices are temporarily unavailable", "Pharmacy details are temporarily unavailable").
Endpoints that avoid the changed objects keep working, so the database looks only partly down.

Check what the database has applied before debugging the code:

```sh
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select filename from schema_migrations order by 1"'
```

If a file in `migrations/` is missing, apply it and reseed (the seed is idempotent):

```sh
bun run db:migrate
bun run db:seed
```

Seen with `0003_mdrp_ranking.sql`: search and the pharmacy directory worked while `/api/results` and `/api/pharmacies/{id}` returned 503.
