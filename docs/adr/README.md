# Application Architecture Decision Records

This directory holds the decisions specific to the Pharmassist POC application. Records that must govern every application derived from the template belong in [`template_docs/adr/`](../../template_docs/adr/README.md).

Both collections are written with the `create-adr` skill, which owns the format, the lifecycle, and the deterministic check. Where this application needs a rule the skill does not define, record it here rather than assuming it.

Use an application record for a durable choice such as persistence, authentication, deployment topology, an external provider, or a consistency policy. Product behavior belongs in `docs/specs/`; implementation mechanics belong in the owning technical design.

## Placement Test

A decision that governs applications derived from this template belongs in [`template_docs/adr/`](../../template_docs/adr/README.md). A decision that governs this application belongs here, even across feature replacement. The ownership table is stated once in the repository [README](../../README.md#documentation-ownership).

## Layout And Naming

```text
docs/adr/{lifecycle}/{classification}/{yyyy-mm-dd}-kebab-case-title.md
```

A record's path carries its lifecycle folder, its classification, and its first-proposed date, its title is its name, and there is no identifier. `proposed/` holds a recommendation under review, `accepted/` a decision that is agreed, `rejected/` a declined one whose reason is on the `Status:` line, and `archived/` frozen history. Inside each, the subfolder is named by the record's own `Classification:` line, so a record sits two levels down and the classification is greppable as a path. All four lifecycle folders are kept in git with a `.gitkeep`. A same-day collision is resolved by varying the slug, never by renaming an existing record.

The class is fixed at birth and travels with the record, so accepting a proposal moves one folder rather than two. Choosing the wrong class is itself a move — `git mv` the file and repair the relative links that pointed into the old subfolder in the same change.

A record is cited by its slug, the short handle its filename carries; the handles and the convention are listed in [`template_docs/adr/README.md`](../../template_docs/adr/README.md#citing-a-record).

## Format And Vocabulary

The header contract, the skeleton each lifecycle requires, the closed classification set, and the shared vocabulary are stated once, in [`template_docs/adr/README.md`](../../template_docs/adr/README.md), so a record reads identically in either collection and there is no second definition to drift. The check command is specified by `create-adr` and is run against this collection by path.

## Decision Process

Records start in `proposed/`. Maintainers move a record to `accepted/` or `rejected/` through pull-request review, which is the only thing that changes its status. Acceptance is never inferred from authorship, from implementation, or from silence.
