---
name: Vault
description: Institutional monitoring & case-coordination console for bKash & Nagad Super Agents.
colors:
  brand: "#0e3a34"
  brand-hover: "#12514a"
  brand-ink: "#eaf3f1"
  brand-accent: "#caa14a"
  bkash: "#e21380"
  bkash-soft: "#fde7f3"
  nagad: "#f5821f"
  nagad-soft: "#fdeedd"
  sev-high: "#c4162b"
  sev-high-soft: "#fbe4e6"
  sev-med: "#985a00"
  sev-med-soft: "#fbeecf"
  sev-low: "#556a74"
  sev-low-soft: "#e7edf0"
  ok: "#157a4e"
  ok-soft: "#e0f0e6"
  bg: "#eef1f2"
  surface: "#ffffff"
  surface-2: "#f7f9f9"
  ink: "#10201e"
  ink-2: "#334744"
  muted: "#5c6f6c"
  muted-2: "#849794"
  border: "#dbe2e3"
  border-strong: "#c5d0d1"
typography:
  headline:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  bangla:
    fontFamily: "Noto Sans Bengali, IBM Plex Sans, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: "normal"
rounded:
  xs: "4px"
  sm: "6px"
  card: "10px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.sm}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.sev-high}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  provider-tag:
    backgroundColor: "{colors.bkash-soft}"
    textColor: "{colors.bkash}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  severity-badge:
    backgroundColor: "{colors.sev-high-soft}"
    textColor: "{colors.sev-high}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  chip-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-inactive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: Vault

## 1. Overview

**Creative North Star: "The Vault Room"**

Vault is designed like the back office of a bank, not the front counter. The room is quiet, the light is even, the figures on the ledger are exact, and the only warmth is a thin line of brass. Deep vault-teal owns the chrome; everything else is a calm near-white surface with hairline borders, so the analyst's attention goes to the numbers and the signals, never to the interface. This is a console for reviewing, not selling — it should read as serious infrastructure that a professional trusts on their tenth hour of the day.

The system is deliberately dense and flat. Depth is drawn with 1px borders and tonal layering between two neutral surfaces, not with shadow theatrics. Color is rationed hard and split into strictly separate channels: teal is the app's own voice, provider colors say *whose money* (bKash magenta, Nagad orange), and severity colors say *how urgent* (red, amber, slate). These channels are never allowed to blur — a provider tag is a shaped, named pill; a severity badge is a filled, labelled chip — because a misread between "whose money" and "how urgent" is an operational error, not a cosmetic one.

What this system rejects is as important as what it embraces. It is not a consumer fintech app — no bright gradients, playful mascots, or marketing gloss (`globals.css` literally notes it is "NOT a consumer app"). It is not an enforcement dashboard — no blaring red alarms, no "BLOCKED", no language that presumes guilt. It is not a generic admin template — no Bootstrap/Material sea of identical rounded cards with no point of view. And it is never a black-box scorer — every signal is shown with the exact figures that produced it.

**Key Characteristics:**
- Deep vault-teal chrome; calm near-white content surfaces; brass used only as a hairline accent.
- Flat, border-defined depth — hairline borders and tonal layering, not shadow.
- Three separate categorical color channels (brand / provider / severity) that never blur.
- Tabular monospace figures for every monetary or numeric readout.
- Bilingual by construction — English and Bangla at parity, Bangla in a dedicated Bengali face.
- Institutional, precise, calm: the tool disappears into the task.

## 2. Colors

A restrained institutional palette: one deep teal identity, two provider hues, a three-step severity ramp, and a cool near-neutral ground barely tinted toward the brand.

### Primary
- **Vault Teal** (#0e3a34): The app's own identity. Owns the sidebar chrome, primary buttons, active-nav and selected states, and links. This is the only color used for the product's *own* voice — never for provider or severity meaning.
- **Vault Teal Hover** (#12514a): The lifted state of any teal surface (primary button hover, chrome interactions).
- **Brass Accent** (#caa14a): A rare hairline warmth — the sidebar logo tile and the active-nav tick. Used sparingly, as a line, never as a fill across content.
- **Teal Ink** (#eaf3f1): Text and iconography that sits on teal chrome.

### Secondary
Provider identity — *whose money*. Always presented as a shaped, named tag (glyph + provider name), never as a bare swatch.
- **bKash Magenta** (#e21380): The bKash provider tag. Nudged toward magenta (blue channel raised from the official #E2136E) specifically so it can never be misread as the HIGH-severity red at badge size.
- **bKash Soft** (#fde7f3): The tint behind a bKash tag.
- **Nagad Orange** (#f5821f): The Nagad provider tag — a bright, saturated orange, deliberately far in lightness from the dark MEDIUM amber.
- **Nagad Soft** (#fdeedd): The tint behind a Nagad tag.

### Tertiary
Severity — *how urgent*. Always a filled, labelled badge with a leading dot; never carried by color alone.
- **Signal Red** (#c4162b) / **soft** (#fbe4e6): HIGH severity. Urgency, not accusation — it means "look at this now," never "guilty."
- **Caution Amber** (#985a00) / **soft** (#fbeecf): MEDIUM severity. A dark ochre, intentionally muted so it reads apart from Nagad's bright orange — and dark enough to clear AA as small text on white.
- **Slate** (#556a74) / **soft** (#e7edf0): LOW severity. Quiet, informational.
- **Confirm Green** (#157a4e) / **soft** (#e0f0e6): Positive/resolved outcomes (case resolved, healthy state).

### Neutral
A cool ground with a faint teal bias — chosen, not defaulted.
- **Page Ground** (#eef1f2): The app background behind all content.
- **Surface** (#ffffff): Cards, tables, panels — the reading surface.
- **Surface Sunken** (#f7f9f9): The second neutral layer — table headers, inset wells, hover rows, sidebars of a panel.
- **Ink** (#10201e) / **Ink-2** (#334744): Primary and secondary body text.
- **Muted** (#5c6f6c) / **Muted-2** (#849794): Labels, metadata, and de-emphasized text. Both sit above 4.5:1 on Surface.
- **Border** (#dbe2e3) / **Border Strong** (#c5d0d1): Hairline dividers and stronger control outlines.

### Named Rules
**The Three-Channel Rule.** Brand, provider, and severity are three separate color languages and must never be confused. Teal is the product's own voice; provider hues mean *whose money* and only ever appear as shaped, named tags; severity hues mean *how urgent* and only ever appear as filled, labelled badges. Never color a provider with a severity hue, or vice versa.

**The Rationed Teal Rule.** The brand teal carries chrome, primary action, and selection — nothing decorative. If teal is spreading into content surfaces or standing in for status, it is being overused.

## 3. Typography

**Display / UI Font:** IBM Plex Sans (with ui-sans-serif, system-ui fallback)
**Data Font:** IBM Plex Mono (with ui-monospace fallback) — every figure that lines up in a column
**Bangla Font:** Noto Sans Bengali (with IBM Plex Sans fallback)

**Character:** One institutional sans carries the entire UI — headings, labels, body, and controls — because a product console needs consistency, not display/body contrast. Plex Sans is technical and slightly humanist without being warm; the `cv05` and `ss01` OpenType features are on globally for a cleaner single-story feel. The one deliberate pairing is by *function*: Plex Mono for numeric data, so money and counts sit in exact tabular columns and never reflow between rows.

### Hierarchy
- **Headline** (600, 1.625rem / ~26px, line-height 1.2, -0.01em): Page titles in the `PageHeader`. One per screen.
- **Title** (600, 0.875rem / 14px, line-height 1.4): Card headers and section titles.
- **Body** (400, 0.875rem / 14px, line-height 1.55): Default reading text and table cells. Prose caps at 65–75ch; dense tables may run wider.
- **Label** (600, 0.6875rem / 11px, letter-spacing 0.06em, uppercase): Table column heads, filter-group labels, badge text, eyebrow metadata.
- **Data** (Plex Mono, 500, ~0.8125rem / 13px, tabular-nums): Money, IDs, counts, timestamps — anything in a column. Applied via the `.tnum` utility.
- **Bangla** (Noto Sans Bengali, 400, ~0.9375rem / 15px, line-height 1.85): Bangla explanation copy, via the `.bangla` utility, with generous leading tuned for Bengali script.

### Named Rules
**The Tabular Figure Rule.** Every monetary or numeric readout uses `.tnum` (Plex Mono + `tabular-nums`). Numbers that shift horizontally between rows are a defect.

**The Bilingual Parity Rule.** English and Bangla are equals. Bangla is never a shrunken afterthought — it renders in Noto Sans Bengali at its own comfortable size and 1.85 line-height, and every alert explanation carries both languages.

## 4. Elevation

Flat by doctrine. Depth is built from hairline borders and two tonal neutral surfaces (Surface #ffffff over Page Ground #eef1f2, with Surface Sunken #f7f9f9 for inset layers), not from shadow. Cards carry only a whisper of shadow to lift them off the page; there is no elevation ladder, no floating panels stacked by z-depth. The one ambient motion is the skeleton shimmer during loading.

### Shadow Vocabulary
- **Card whisper** (`box-shadow: 0 1px 2px rgba(16,32,30,0.04)`): The near-invisible lift on cards — barely there, tinted with the ink hue rather than pure black. This is the *only* shadow in the system.

### Named Rules
**The Flat-By-Default Rule.** Surfaces separate by border and tone, not shadow. If you reach for a drop shadow to distinguish two panels, add a hairline border or step the tone to Surface Sunken instead. Reserve any real elevation strictly for genuinely floating UI (a modal backdrop), and even then keep it quiet.

## 5. Components

Precise and restrained: quiet controls, hairline borders, color reserved for state and meaning. Every interactive element shares one shape vocabulary and one set of states.

### Buttons
- **Shape:** Gently rounded (6px, `rounded-md`). Two heights: sm (32px) and md (40px).
- **Primary:** Solid Vault Teal fill with Teal Ink text and a matching teal border. For the single most important action on a surface.
- **Secondary (default):** Surface background, Ink text, Border-Strong outline. The everyday control.
- **Ghost:** Transparent with Muted text and no border until hover (fills to Surface Sunken). For low-emphasis and toolbar actions.
- **Danger:** Surface background with a Signal-Red text and border, filling to Signal-Red-soft on hover — a bordered, not blaring, destructive action. Note: "danger" here means a consequential action, never an accusation.
- **Hover / Focus / Loading:** `transition-colors` only (150–250ms). Disabled drops opacity (0.4–0.5) and shows `not-allowed`. Loading swaps in a spinning `border-t-transparent` ring.

### Chips (filter controls)
- **Style:** Pill-shaped (`rounded-full`), 12px horizontal padding, 11–12px medium text.
- **State:** Active = solid Vault-Teal fill with Teal-Ink text and teal border. Inactive = Surface fill, Muted text, Border-Strong outline, hovering to Surface Sunken. Used as the provider/severity/area filters on the Alerts list.

### Provider Tag (signature)
- **Style:** A pill (`rounded-full`) with the provider color as *both* text and border on the provider's soft tint, led by a shape glyph (◆ bKash, ● Nagad) then the provider name. The glyph + name is what makes provider identity survive color blindness and separates it from severity badges.

### Severity Badge (signature)
- **Style:** A small filled chip (`rounded-md`) in the severity's soft tint with the severity color as text and a leading dot, label in uppercase. Filled + dotted + labelled — structurally distinct from the outlined provider tag.

### Cards / Containers
- **Corner Style:** 10px (`--radius-card`).
- **Background:** Surface (#ffffff) on the Page Ground; Surface Sunken for inset headers/wells.
- **Shadow Strategy:** The single Card-whisper shadow (see Elevation). Never more.
- **Border:** 1px Border hairline, always. The border does the separating.
- **Internal Padding:** 20px (`p-5`) standard; 14px on dense list cards.

### Inputs / Fields
- **Style:** Surface background, Border-Strong hairline, 6px radius, matching the button vocabulary.
- **Focus:** Border shifts to Vault Teal; no glow. Keep focus states visible and quiet.

### Navigation
- **Style:** A fixed 240px Vault-Teal sidebar. Nav items are Teal-Ink at 70% opacity, brightening to white on hover (white/5 fill) and active (white/10 fill) with a brass tick on the active item. Icons are 16px 1.5px-stroke line icons (Lucide vocabulary). Dense, calm, always-visible.

### States (loading / empty / error)
- **Loading:** Skeleton shimmer blocks, never a centered spinner mid-content.
- **Empty:** A "designed empty" on a faint dotted canvas (`.canvas-grid`) with an icon, a title, a teaching sentence, and an action — never a blank void.
- **Error:** A bordered Signal-Red panel that shows the real message plus a Retry — never a silent blank.

## 6. Do's and Don'ts

### Do:
- **Do** keep the three color channels separate: teal for the product's own voice, provider hues only as shaped named tags, severity hues only as filled labelled badges. (The Three-Channel Rule.)
- **Do** render every monetary or numeric value with `.tnum` (Plex Mono + tabular figures) so columns align.
- **Do** show the exact triggering figures on every alert — explainable by construction, never a bare score.
- **Do** give provider and severity a shape/label difference, not just a color difference, so meaning survives color blindness.
- **Do** treat Bangla as an equal: Noto Sans Bengali, its own comfortable size and 1.85 line-height, present alongside English.
- **Do** separate surfaces with 1px borders and tonal layering (Surface over Page Ground over Surface Sunken). (The Flat-By-Default Rule.)
- **Do** keep body text at Ink/Ink-2 and confirm Muted text clears 4.5:1; honor `prefers-reduced-motion` on the skeleton shimmer and any transition.

### Don't:
- **Don't** make it look like a consumer fintech app — no bright gradients, playful mascots, or marketing gloss. This is "NOT a consumer app."
- **Don't** make it an enforcement dashboard — no blaring red alarms, no "BLOCKED", no language or color that presumes guilt. Signal Red means *urgent to review*, not *guilty*.
- **Don't** ship a generic admin template — no Bootstrap/Material sea of identical rounded cards with no point of view.
- **Don't** present a black-box score — never a risk number without the evidence behind it.
- **Don't** let bKash Magenta drift back toward the official #E2136E if it starts reading as Signal Red at badge size; keep the raised blue channel (#e21380).
- **Don't** add drop shadows to separate panels; add a border or step the tone instead.
- **Don't** use display fonts, gradient text, or side-stripe (`border-left`) accents anywhere; controls stay in the one restrained Plex vocabulary.
- **Don't** spread the brand teal into content or use it to signal status; ration it to chrome, primary action, and selection.
