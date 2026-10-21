# Drop dependent views before dropping columns

Postgres refuses `alter table ... drop column` when a view selects `table.*` and depends on that column.

Renaming a table does not rewrite the view's dependency: the view keeps its old name, and it still depends on the old columns.

Drop the view before changing the column set, then recreate the view against the new shape.

`0002_poc_sale_forms.sql` hit this when dropping `price_observation.pack_size` while `price_record_with_mdrp` still selected `pr.*`.

```sql
drop view price_record_with_mdrp;
alter table price_observation drop column pack_size;
create view price_observation_with_mdrp as ...;
```
