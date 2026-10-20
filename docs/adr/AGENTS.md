# Application ADR Agent Contract

The agent-facing entry point for this application's decision records. The human contract is in [README.md](README.md), and the format, lifecycle, and check are owned by the `create-adr` skill. The header, skeleton, classification order, and vocabulary are the same as the template collection's ([`template_docs/adr/README.md`](../../template_docs/adr/README.md#vocabulary)), so a record reads identically wherever it is filed.

## Discover

```bash
ls docs/adr/*/*
grep -rl '^Status: accepted' docs/adr
```

There is no index. The path is `{lifecycle}/{classification}/{yyyy-mm-dd}-slug.md`: the lifecycle folder is the status, the classification subfolder is the class, and the filename holds the first-proposed date and slug. The three header lines carry type, status, and classification, and the check cross-verifies `Type: project` against this collection and `Classification:` against the subfolder. A record is cited by relative link with its handle as the link text, never by identifier.

## Before Drafting

1. Read [AGENTS.md](../../AGENTS.md) and the owning package README under [`docs/specs/`](../specs/README.md).
2. Check for an existing record on the same subject. If one already resolves the question, cite it instead of writing a duplicate.
3. Product scope belongs in a PRD, implementation sequencing in a technical design, and a decision that must govern every derived application belongs in [`template_docs/adr/`](../../template_docs/adr/README.md).
4. Scaffold the record. The skill is expected installed globally at `~/.agents/skills/create-adr`, so set it once and call its scripts:

   ```bash
   SKILL=~/.agents/skills/create-adr
   python3 "$SKILL/scripts/init_adr.py" "<decision-focused title>" \
     --classification <architecture|process|data|security|testing|feature|simplification|bug-fix> \
     --lifecycle proposed --root docs/adr
   ```

## Every Record Must

- Satisfy the skeleton for its lifecycle folder as [`template_docs/adr/README.md`](../../template_docs/adr/README.md#header-and-skeleton) states it: an accepted record has `## Problem`, `## Decision`, `## Alternatives considered`, and `## Consequences`, and states what confirms it in a present-tense `## Testing` section.
- Use the terms in that same vocabulary section rather than a synonym for the same concept, so an application record reads as part of the same architecture.
- Name what is enforced automatically and what is review-enforced.
- Never rewrite an accepted record's decision or rationale to accommodate the code; supersede it with a new linked record.

## Before Reporting Work Complete

```bash
SKILL=~/.agents/skills/create-adr
python3 "$SKILL/scripts/check_adr.py" docs/adr
```

It must exit `0`. Then apply the skill's quality rubric, and confirm the record answers why the choice was made rather than only what will be built.

## On Lifecycle Transitions

A transition is a file move, a `Status:` rewrite, and a re-satisfied skeleton in one change. Never rewrite an accepted record's decision or rationale: link the new record to it and update the old one only with relationship links or factual corrections. An application decision that turns out to be a rule for every derived application is recorded in `template_docs/adr/` instead, and referenced from here.
