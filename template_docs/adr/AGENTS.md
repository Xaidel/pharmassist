# Template ADR Agent Contract

This file is the agent-facing entry point for the template decision record collection. The human contract, including what warrants a record, the header and skeleton, the classification table, and the shared vocabulary, is in [README.md](README.md). The format and the lifecycle are owned by the `create-adr` skill.

## Discover

```bash
ls template_docs/adr/*/*

grep -rl '^Classification: architecture' template_docs/adr
grep -rl '^Status: accepted' template_docs/adr
```

There is no index. The path is `{lifecycle}/{classification}/{yyyy-mm-dd}-slug.md`: the lifecycle folder is the status, the classification subfolder is the class, and the filename holds the first-proposed date and slug. The three header lines carry type, status, and classification, and the check cross-verifies `Type:` against the collection and `Classification:` against the subfolder. Search for the decision question, or follow relative links from a related record or from [`architecture.md`](../architecture.md).

`ls template_docs/adr/accepted/*` lists the accepted records by class; `ls template_docs/adr/*/security` lists one class across every lifecycle, which is the right cut when the question is "what have we decided about trust boundaries" rather than "what is accepted".

## Before Drafting

1. Read [AGENTS.md](../../AGENTS.md), the vocabulary in [README.md](README.md#vocabulary), and the architecture record the subject touches.
2. Run the supersession check: `grep -rl '^Status: accepted' template_docs/adr` and read any record covering the same mechanism. If an accepted record already resolves the question, cite it instead of writing a duplicate.
3. If the subject is product scope, implementation sequencing, or a change that does not constrain later work, it belongs in `docs/specs/` or in ordinary review, not here. An application decision belongs in `docs/adr/`.
4. Scaffold the record. The skill is expected installed globally at `~/.agents/skills/create-adr`, so set it once and call its scripts:

   ```bash
   SKILL=~/.agents/skills/create-adr
   python3 "$SKILL/scripts/init_adr.py" "<decision-focused title>" \
     --classification <architecture|process|data|security|testing|feature|simplification|bug-fix> \
     --lifecycle proposed --root template_docs/adr
   ```

## Every Record Must

- Open with exactly `# ADR: <title>`, a blank line, `Type: template`, `Status: <status>`, `Classification: <class>`, then a blank line. No `Date:`, no `Deciders:`, no `ADR-NNNN` identifier anywhere.
- Satisfy the skeleton for its lifecycle folder, as [README.md](README.md#header-and-skeleton) states it. An accepted record has `## Problem`, `## Decision`, `## Alternatives considered`, and `## Consequences`, and may not contain `## Proposal`, `## Plan`, `## Migration plan`, or `## Acceptance criteria`. It states what confirms it in a present-tense `## Testing` section and its relationships in `## Related`.
- Use the terms in [README.md](README.md#vocabulary) rather than a synonym for the same concept.
- State the decision in present tense with testable invariants, and record what it costs as well as what it buys.
- Name what is enforced automatically and what is review-enforced. A `## Testing` section that claims an automated check must name the test that runs; a check that cannot validate the responsibility honestly belongs in the review list.
- Reference other records by relative markdown link with the handle as the link text, never by identifier or bare title.

## Before Reporting Work Complete

```bash
SKILL=~/.agents/skills/create-adr
python3 "$SKILL/scripts/check_adr.py" template_docs/adr
```

It must exit `0`. Fix every `path:line: message` first, then apply the skill's quality rubric, then confirm the record answers why the choice was made rather than only what will be built. Keep paths, names, and defaults in an accepted record current with the code in the same change that moves the code; that is maintenance of fact, not a licence to revisit the decision.

## On Lifecycle Transitions

A transition is a file move, a `Status:` rewrite, and a re-satisfied skeleton in one change. The classification subfolder is not part of the transition: the record keeps its class, so the move changes exactly one folder and `proposed/security/x.md` becomes `accepted/security/x.md`. Never rewrite an accepted record's decision or rationale: link the new record to it, and update the old record only with relationship links or factual corrections. A fully superseded record moves to `archived/` only after its replacement is accepted.

Repair every relative link into the folder the record left, in the same change. A link between two records of one class is unchanged by a lifecycle move, but a link across classes or across a reclassification does not resolve afterwards.
