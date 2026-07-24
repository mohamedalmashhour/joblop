# RJDS Design Tokens and Responsive Rules v1.0

Status: Approved baseline
Token source: `packages/design-system/src/index.ts`

## 1. Token Philosophy

Tokens create visual consistency across public pages, worker mobile experiences, employer workflows, admin operations, and future dashboards. New hardcoded values should not be introduced when an approved token exists.

## 2. Color Tokens

Use the existing token names as the canonical implementation language.

| Token | Value | Usage |
| --- | --- | --- |
| `deepTeal` | `#071f4d` | Primary header, navigation, major operational emphasis |
| `deepTealMuted` | `#123b78` | Secondary emphasis, selected states, subdued primary controls |
| `cream` | `#fff8d8` | Warm highlight surfaces, non-critical emphasis |
| `surface` | `#f7faf9` | Page background and calm work surfaces |
| `surfaceRaised` | `#ffffff` | Cards, forms, panels, modal surfaces |
| `border` | `#dce8e8` | Card borders, dividers, table lines |
| `text` | `#0b1f3a` | Primary text |
| `muted` | `#6b7d80` | Secondary text and metadata |
| `warning` | `#b66b00` | Pending, urgent, needs review, non-final values |
| `danger` | `#c93434` | Errors, blockers, restricted, failed states |
| `success` | `#1f8f5f` | Confirmed, approved, ready, successful completion |
| `focus` | `#0d6efd` | Focus ring, active input, navigational focus |

## 3. Color Semantics

- Green means ready, approved, or completed. It must not imply payment settlement, eligibility, or employment unless that state is authoritative.
- Amber means pending, estimated, urgent, or needs human review.
- Red means error, failed, restricted, blocked, or unavailable.
- Blue means navigation, selection, focus, or information.
- Color must always be paired with text, icon, or status label.

## 4. Typography Tokens

| Token | Size | Usage |
| --- | ---: | --- |
| `title` | `28px` | Page title, dashboard title |
| `heading` | `20px` | Section headings, card titles |
| `body` | `16px` | Primary reading and form text |
| `small` | `13px` | Metadata, helper text, table secondary text |
| `micro` | `11px` | Compact labels, tags, dense metadata |

Rules:

- Do not scale font size directly with viewport width.
- Letter spacing should remain `0`.
- Use sentence case for labels and headings unless a product term requires capitalization.
- Avoid hero-scale typography inside dashboards and tool surfaces.

## 5. Spacing Tokens

| Token | Value | Usage |
| --- | ---: | --- |
| `xs` | `4px` | Tight icon/text relationships |
| `sm` | `8px` | Compact stack spacing |
| `md` | `12px` | Form row spacing, badge groups |
| `lg` | `16px` | Card padding, standard gaps |
| `xl` | `24px` | Section spacing |
| `xxl` | `32px` | Page-level separation |

Rules:

- Mobile pages should use `16px` side gutters unless the platform shell defines otherwise.
- Dense admin tables may use tighter row padding only if touch targets remain accessible for interactive controls.
- Do not create nested cards to simulate spacing.

## 6. Radius Tokens

| Token | Value | Usage |
| --- | ---: | --- |
| `sm` | `8px` | Standard cards, inputs, buttons |
| `md` | `12px` | Larger panels and mobile task cards |
| `lg` | `18px` | Rare large surfaces, mobile hero task panels |
| `pill` | `999px` | Badges, chips, capsules, segmented pills |

Cards should generally use `8px` unless an existing app area has already standardized another radius.

## 7. Touch Targets

| Token | Value | Usage |
| --- | ---: | --- |
| `minimumTarget` | `44px` | Minimum interactive control size |
| `comfortableTarget` | `56px` | Primary mobile actions and critical workflow buttons |

Every interactive target must have a visible focus state and an accessible name.

## 8. Responsive Rules

### Mobile First

Worker-facing surfaces are designed mobile-first. The first mobile viewport must answer the immediate task before secondary widgets appear.

### Breakpoint Guidance

- Small mobile: `320px-374px`
- Standard mobile: `375px-767px`
- Tablet: `768px-1023px`
- Desktop: `1024px-1439px`
- Wide desktop: `1440px+`

Use these as design review bands, not hardcoded obligations.

### Layout Rules

- Public pages use a constrained content width and clear content hierarchy.
- Worker pages prioritize current task, next shift, alerts, and action handoffs.
- Employer pages use workflow panels, lists, and status groups.
- Admin pages use dense but scannable tables, filters, and governed action panels.
- Financial pages must preserve line-item clarity and distinct lifecycle stages.

## 9. State Design

Every governed page should define:

- Loading.
- Empty.
- Partial.
- Stale.
- Restricted.
- Access denied.
- Service error.
- Unavailable.
- Success or completed where applicable.

State copy must explain what happened and what the user can do next. Avoid technical jargon.

## 10. Motion

Motion is optional and functional only:

- Use brief transitions for drawer open/close, filter changes, and state feedback.
- Do not animate critical status changes in a way that hides auditability.
- Respect reduced-motion preferences.

## 11. Charts and Metrics

Charts must show:

- Metric definition.
- Data freshness.
- Filter scope.
- Privacy threshold or aggregation note where needed.
- Export state where allowed.

Charts must not become workflow controls unless the page explicitly owns that action.
