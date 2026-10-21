# ADR: <Decision-focused title>

Type: template
Status: proposed
Classification: architecture

## Problem

<!-- TODO: the situation that requires a decision. Facts and forces only, no advocacy. -->

## Proposal

<!-- TODO: the intended change in future tense: what we will do if accepted. -->

## Alternatives considered

<!-- TODO: each genuine alternative and why it lost — one bold-led paragraph each. Never invent options. -->

## Acceptance criteria

<!-- TODO: the observable state that means the decision is in force and upheld. -->

## Risks

<!-- TODO: what could go wrong, and what this change knowingly gives up. -->

<!--
Scaffolding a record with the create-adr skill writes the skeleton for the folder you name, so a record is born correct. The skill is expected installed globally at ~/.agents/skills/create-adr:

  SKILL=~/.agents/skills/create-adr
  python3 "$SKILL/scripts/init_adr.py" "<decision-focused title>" \
    --classification architecture --lifecycle proposed --root template_docs/adr

The full header, skeleton, classification set, and vocabulary are in [README.md](README.md).

  proposed/  Problem · Proposal · Alternatives considered · Acceptance criteria · Risks
  accepted/  Problem · Decision · Alternatives considered · Consequences
             (+ an optional present-tense Testing section and a Related section)
  rejected/  Problem · Proposal · Alternatives considered
             (the verdict lives on the Status line: Status: rejected — <why in one line>)

Acceptance is not implementation. An accepted record is kept current with paths, names, and defaults in the same change that moves the code.
-->
