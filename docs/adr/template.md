# ADR: <Decision-focused title>

Type: project
Status: proposed
Classification: architecture

## Problem

<!-- TODO: the application situation that requires a decision. Facts and forces only. -->

## Proposal

<!-- TODO: the intended change in future tense. -->

## Alternatives considered

<!-- TODO: each genuine alternative and why it lost — one bold-led paragraph each. -->

## Acceptance criteria

<!-- TODO: the observable state that means the decision is in force. -->

## Risks

<!-- TODO: what could go wrong, and what this change knowingly gives up. -->

<!--
Scaffold with the create-adr skill so the record is born correct for its folder. The skill is expected installed globally at ~/.agents/skills/create-adr:

  SKILL=~/.agents/skills/create-adr
  python3 "$SKILL/scripts/init_adr.py" "<decision-focused title>" \
    --classification <class> --lifecycle proposed --root docs/adr

The full header, skeleton, classification set, and vocabulary are in the template collection, which this collection shares: [template_docs/adr/README.md](../../template_docs/adr/README.md).

  proposed/  Problem · Proposal · Alternatives considered · Acceptance criteria · Risks
  accepted/  Problem · Decision · Alternatives considered · Consequences
             (+ an optional present-tense Testing section and a Related section)
  rejected/  Problem · Proposal · Alternatives considered
-->
