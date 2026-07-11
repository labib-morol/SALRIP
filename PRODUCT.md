# Product

## Register

product

## Platform

web

## Users

The primary user is an on-the-ground operations analyst in Bangladesh who reviews mobile-money Super Agent liquidity and risk for bKash and Nagad. Their context is triage: a signal has been flagged and they need to quickly judge whether it is real and worth acting on, decide whether to promote it into a case, and coordinate the follow-through — all without ever moving, merging, or controlling funds. They work bilingually, so English and Bangla both have to carry the same weight on screen. The job on any given screen is to understand a flagged signal and its evidence fast enough to make a confident human call.

## Product Purpose

Vault (SALRIP — Super Agent Liquidity & Risk Intelligence Platform) is an explainable, review-oriented monitoring console. It coordinates liquidity pressure, unusual transaction patterns, and operational follow-through across providers as a single pane of glass, while never moving, merging, or controlling money. It exists because the dangerous failure modes in Super Agent liquidity — a quiet per-provider float drain masked by a healthy total, a structured burst of near-identical transfers, a frozen balance feed that contradicts the ledger, and a shared-cash shortage across both providers at once — live in the gaps a naïve per-provider dashboard cannot see. Success is an analyst who trusts a signal because they can see the exact figures behind it, acts or dismisses it with confidence, and leaves an audit trail — with the machine never having made the call.

## Positioning

Vault is the console that watches the space between mobile-money providers — the drains, bursts, stale feeds, and shared-cash shortages a per-provider view structurally misses — and presents every finding as an evidenced signal a human reviews, never an automated verdict.

## Brand Personality

Institutional, precise, calm. Vault should read like serious infrastructure rather than a product being sold: quiet confidence, exact figures, and no drama. Its voice is neutral and careful — it never accuses, never shouts, and stays mindful that there is a real small business behind every signal. Language is plain and review-oriented (the word "fraud" is forbidden anywhere in the product, in any language); tone favors clarity over cleverness.

## Anti-references

Vault must not look or feel like any of these: a consumer fintech app (bright, playful, marketing-driven — the design layer itself notes it is "NOT a consumer app"); an enforcement dashboard that presumes guilt (red alarms, "BLOCKED", accusatory framing); a generic admin template (a Bootstrap/Material sea of identical rounded cards with no point of view); or a black-box AI scorer (opaque risk numbers with no visible evidence or reasoning).

## Design Principles

**Review, not verdicts.** Every screen frames a finding as a signal a human reviews and decides on. Nothing is auto-blocked, frozen, or labelled as wrongdoing; the visual language stays neutral and non-alarmist so urgency reads as "look at this," not "someone is guilty."

**Explainable by construction.** Never surface a bare score. Each alert carries the exact numbers that triggered it, and the detail is always one step away. Trust is earned by showing the reasoning, not asserting it.

**Show what lives between providers.** Make the cross-provider blind spots visible, and keep the categorical channels strictly separate — whose money (provider identity) is never confusable with how urgent (severity). Different shape, not just different color.

**Earned familiarity.** The tool should disappear into the task: dense where the analyst needs density, consistent screen to screen, calm by default. Familiarity is a feature; surprise is spent only where it clarifies.

**Humane precision.** Analytically strict but careful with people. Bilingual by default — English and Bangla at parity — and always aware there is a real agent on the other side of the data.

## Accessibility & Inclusion

Bilingual parity is a first-class requirement: English and Bangla must both be fully legible, with a proper Bengali typeface (Noto Sans Bengali) and appropriate line-height, never treated as an afterthought. Meaning must never rest on color alone — provider is carried by a glyph plus name and severity by a filled, labelled badge, so the distinctions survive color blindness. All body text and state colors meet WCAG AA contrast against their backgrounds. Motion honors `prefers-reduced-motion`, and no essential state is ever conveyed through motion alone.
