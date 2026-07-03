# Design

Visual system for Flaiir. Source of truth for tokens is `src/app/globals.css` `:root`; this file describes intent and usage.

## Theme

Light, paper-toned product UI with a near-black ink sidebar. One electric accent. Dark surfaces are reserved for the app shell (sidebar) and the marketing hero — never for random sections mid-page.

## Color

| Token | Value | Role |
|---|---|---|
| `--paper` | `#F5F5F7`-family | app background |
| `--card` | near-white | panel/card surface |
| `--ink` / `--ink-900` / `--ink-950` | `#15201A` / `#0B1220` | text, dark shell |
| `--lime` | `#C4F000` | THE accent — primary CTAs, active states |
| `--lime-deep` | `#7E9E0A` | accent on light backgrounds (contrast-safe) |
| `--lime-dim` | `#F2FAD6` | accent tint surfaces (chips, ROI banner) |
| `--hi` | green `#5BA02E`-family | positive outcomes (won, up-deltas) |
| `--coral` | `#E5573D` | negative outcomes (lost, overdue, down-deltas) |
| `--mid` | amber | in-between states (in talks, warnings) |
| `--slate` / `--slate-2` | grays | secondary/muted text |
| `--line` / `--line-2` | hairlines | borders, dividers |

Rules: one accent per screen; status colors only for status; source brand colors (Reddit orange etc.) appear only as small dots/labels, never as surfaces.

## Typography

- **Display** (`--font-display`): headings, big numbers. Weight 700–800, tracking −.02 to −.03em.
- **Body** (`--font-body`): default UI text.
- **Mono** (`--font-mono`): all data — numbers, labels, timestamps, chips, table cells. `tabular-nums` on comparable figures.
- Small caps mono labels (10–11px, letter-spacing .07–.12em) are the "data label" voice — used for KPI labels and panel meta, not on every heading.

## Components

- **Panels**: `--card` surface, 1px `--line` border, radius `--r-lg` (~14px), padding 20px. No shadows at rest; `--sh-md` on hover for interactive cards only.
- **KPI tiles** (`.an-kpi2`): mono label, display number, delta chip (`.an-delta` up/down/flat).
- **Tables** (`.an-tbl`): mono right-aligned numerics, hairline row dividers, no zebra.
- **Chips**: pill radius, tint backgrounds; at most 2–3 per row on cards.
- **Kanban** (`.kan-*`): 4 working columns + Lost tray; column identity via dot + tinted underline, not icons.
- **Buttons**: `.btn-primary` lime on ink text; ghost/line variants; `:active` scale press feedback everywhere.
- **Empty/error/loading**: every list has a composed empty state, a distinct network-error state, and skeleton loaders shaped like the content.

## Layout

- App shell: fixed dark sidebar (ink) + light content column, content max-width managed per page.
- Dashboards use dense 2-column grids (`.an-grid2`) of uniform panels; 5-across KPI strip collapsing 3/2 on smaller screens.
- Charts: SVG line/area for trends, thin baseline-anchored bars for discrete periods, stacked distribution bars for parts-of-whole. Single hue (lime) for single series; selective labels only (peak + latest); values in tooltips/`title`.

## Motion

Sparingly: width/height transitions on chart fills (.4–.5s ease), press scale on buttons, hover dim on sibling bars. No entrance animation reflexes; respect `prefers-reduced-motion`.
