import {
  borders,
  colorRoles,
  colors,
  elevation,
  layout,
  radii,
  spacing,
  statusColors,
  statusSemantics,
  touch,
  typographyRoles
} from "@rwos/design-system";
import type { dataStates } from "@rwos/design-system";

export const primitiveNames = [
  "AppShell",
  "ScreenContainer",
  "PageContainer",
  "Stack",
  "Inline",
  "Grid",
  "Typography",
  "Button",
  "PrimaryButton",
  "SecondaryButton",
  "TertiaryButton",
  "DangerButton",
  "IconButton",
  "Card",
  "Badge",
  "StatusBadge",
  "Input",
  "TextInput",
  "TextArea",
  "Select",
  "SearchInput",
  "Checkbox",
  "RadioGroup",
  "Switch",
  "FormField",
  "ValidationMessage",
  "Alert",
  "EmptyState",
  "LoadingState",
  "ErrorState",
  "Modal",
  "ConfirmationDialog",
  "Skeleton",
  "DataTable",
  "ResponsiveRecordList",
  "Section",
  "Divider"
] as const;

export type PrimitiveName = (typeof primitiveNames)[number];
export type StatusTone = keyof typeof statusColors;
export type DataState = (typeof dataStates)[number];

export const rjdsTraceability = {
  architecture: "Approved frozen Resident Job architecture",
  design: "RJDS v1.0",
  governance: "Resident Job Governance Baseline v1.0",
  classification: "Standard Engineering Process",
  acrRequired: false,
  dcrRequired: false,
  gcrRequired: false
} as const;

export const uiFoundation = {
  status: "rjds-wave-1-foundation",
  minimumTouchTarget: touch.minimumTarget,
  primitiveNames
} as const;

export const layoutRecipes = {
  pageContainer: {
    background: colorRoles.background,
    color: colorRoles.textPrimary,
    maxWidth: `${layout.contentMaxWidth}px`,
    padding: `${spacing.xl}px`,
    width: "100%"
  },
  stack: {
    display: "grid",
    gap: `${spacing.lg}px`
  },
  inline: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: `${spacing.sm}px`
  },
  grid: {
    display: "grid",
    gap: `${spacing.lg}px`,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
  },
  surface: {
    background: colorRoles.surface,
    border: borders.default,
    borderRadius: `${radii.sm}px`,
    boxShadow: elevation.raised
  }
} as const;

export const typographyRecipes = typographyRoles;

export const buttonRecipes = {
  primary: {
    background: colors.deepTeal,
    border: borders.transparent,
    borderRadius: `${radii.sm}px`,
    color: colors.surfaceRaised,
    minHeight: `${touch.comfortableTarget}px`,
    padding: `0 ${spacing.lg}px`
  },
  secondary: {
    background: colors.surfaceRaised,
    border: borders.default,
    borderRadius: `${radii.sm}px`,
    color: colors.deepTeal,
    minHeight: `${touch.minimumTarget}px`,
    padding: `0 ${spacing.lg}px`
  },
  tertiary: {
    background: "transparent",
    border: borders.transparent,
    borderRadius: `${radii.sm}px`,
    color: colors.deepTeal,
    minHeight: `${touch.minimumTarget}px`,
    padding: `0 ${spacing.md}px`
  },
  danger: {
    background: colors.danger,
    border: borders.transparent,
    borderRadius: `${radii.sm}px`,
    color: colors.surfaceRaised,
    minHeight: `${touch.comfortableTarget}px`,
    padding: `0 ${spacing.lg}px`
  },
  disabled: {
    background: statusColors.disabled.background,
    border: borders.default,
    color: statusColors.disabled.foreground,
    cursor: "not-allowed"
  },
  focusVisible: {
    outline: borders.focus,
    outlineOffset: "2px"
  }
} as const;

export const formRecipes = {
  field: {
    display: "grid",
    gap: `${spacing.xs}px`
  },
  label: {
    ...typographyRoles.label,
    color: colors.deepTeal
  },
  input: {
    background: colors.surfaceRaised,
    border: borders.default,
    borderRadius: `${radii.sm}px`,
    color: colors.text,
    minHeight: `${touch.comfortableTarget}px`,
    padding: `0 ${spacing.md}px`
  },
  helperText: {
    ...typographyRoles.helperText,
    color: colors.muted
  },
  validationMessage: {
    ...typographyRoles.helperText,
    color: colors.danger
  }
} as const;

export const cardRecipes = {
  standard: {
    background: colors.surfaceRaised,
    border: borders.default,
    borderRadius: `${radii.sm}px`,
    boxShadow: elevation.none,
    padding: `${spacing.lg}px`
  },
  raised: {
    background: colors.surfaceRaised,
    border: borders.default,
    borderRadius: `${radii.md}px`,
    boxShadow: elevation.raised,
    padding: `${spacing.lg}px`
  },
  warning: {
    background: statusColors.warning.background,
    border: `1px solid ${statusColors.warning.border}`,
    borderRadius: `${radii.sm}px`,
    padding: `${spacing.lg}px`
  }
} as const;

function createBadgeRecipe(tone: StatusTone) {
  const value = statusColors[tone];

  return {
    accessibleLabel: statusSemantics[tone],
    background: value.background,
    border: `1px solid ${value.border}`,
    borderRadius: `${radii.pill}px`,
    color: value.foreground,
    minHeight: "24px",
    padding: `${spacing.xs}px ${spacing.sm}px`
  } as const;
}

export const badgeRecipes = {
  neutral: createBadgeRecipe("neutral"),
  informational: createBadgeRecipe("informational"),
  success: createBadgeRecipe("success"),
  warning: createBadgeRecipe("warning"),
  danger: createBadgeRecipe("danger"),
  pending: createBadgeRecipe("pending"),
  disabled: createBadgeRecipe("disabled"),
  selected: createBadgeRecipe("selected"),
  restricted: createBadgeRecipe("restricted")
} as const;

export const alertRecipes = {
  informational: badgeRecipes.informational,
  success: badgeRecipes.success,
  warning: badgeRecipes.warning,
  danger: badgeRecipes.danger
} as const;

export const stateRecipes = {
  loading: {
    title: "Loading",
    tone: "informational",
    body: "Content is being prepared."
  },
  empty: {
    title: "No records yet",
    tone: "neutral",
    body: "There is no information to show for this view."
  },
  error: {
    title: "Something went wrong",
    tone: "danger",
    body: "The current view could not be loaded. Try again or contact support."
  },
  stale: {
    title: "Data may be stale",
    tone: "warning",
    body: "This information may not reflect the latest authoritative state."
  },
  partial: {
    title: "Partial information",
    tone: "warning",
    body: "Some information is unavailable. Visible values should be treated as incomplete."
  },
  unavailable: {
    title: "Currently unavailable",
    tone: "neutral",
    body: "This information is not available right now."
  },
  "access-denied": {
    title: "Access denied",
    tone: "restricted",
    body: "You do not have permission to view this information."
  },
  restricted: {
    title: "Restricted information",
    tone: "restricted",
    body: "Only authorized users can view this information."
  }
} as const satisfies Record<
  DataState,
  {
    title: string;
    tone: StatusTone;
    body: string;
  }
>;

export const dialogRecipes = {
  modal: {
    background: colors.surfaceRaised,
    border: borders.default,
    borderRadius: `${radii.md}px`,
    boxShadow: elevation.overlay,
    maxWidth: `${layout.modalMaxWidth}px`,
    padding: `${spacing.xl}px`,
    width: `min(100%, ${layout.modalMaxWidth}px)`
  },
  confirmation: {
    requiredElements: ["title", "plainLanguageRisk", "primaryAction", "secondaryAction"],
    highImpactActionsRequireReason: true
  },
  destructiveConfirmation: {
    requiredElements: ["title", "plainLanguageRisk", "typedOrExplicitConfirmation", "cancelAction"],
    highImpactActionsRequireReason: true
  }
} as const;

export const accessibilityContracts = {
  Button: {
    accessibleNameRequired: true,
    disabledStateMustBeProgrammatic: true,
    focusVisibleRequired: true,
    minimumTargetSize: touch.minimumTarget
  },
  FormField: {
    controlLabelAssociationRequired: true,
    describedByRequiredForHelperOrError: true,
    errorStateMustBeProgrammatic: true
  },
  IconButton: {
    accessibleNameRequired: true,
    decorativeIconHidden: true,
    minimumTargetSize: touch.minimumTarget
  },
  Modal: {
    accessibleNameRequired: true,
    focusContainmentRequired: true,
    initialFocusRequired: true,
    returnFocusRequired: true
  },
  StatusBadge: {
    textSignalRequired: true,
    colorOnlySignalForbidden: true
  },
  DataTable: {
    captionOrAccessibleNameRequired: true,
    headerAssociationRequired: true,
    responsiveOverflowContainerRequired: true
  }
} as const;

export const componentContracts = {
  AppShell: "Stable navigation and role context. Must not execute governed decisions.",
  PageContainer: "Consistent page width, background, and spacing.",
  Button: "Backward-compatible button primitive name; prefer explicit variants for new work.",
  PrimaryButton: "Primary page action only. Must not imply final approval unless authoritative.",
  SecondaryButton: "Secondary action or governed navigation.",
  TertiaryButton: "Low-emphasis action or inline navigation.",
  DangerButton: "Destructive or high-risk action with confirmation where required.",
  Input: "Backward-compatible input primitive name; prefer explicit form controls for new work.",
  TextInput: "Labelled text input with field-level validation.",
  FormField: "Label, control, helper text, and validation message wrapper.",
  Card: "Grouped content without creating false source-of-truth authority.",
  Badge: "Backward-compatible badge primitive name; prefer StatusBadge for governed statuses.",
  StatusBadge: "Text-first governed status. Color is never the only signal.",
  Alert: "Page or section notice with plain-language next step.",
  LoadingState: "Nonblank loading treatment.",
  EmptyState: "Actionable empty treatment.",
  ErrorState: "Recoverable error treatment without leaking restricted details.",
  Modal: "Accessible overlay for bounded tasks.",
  ConfirmationDialog: "Human confirmation for high-impact actions.",
  DataTable: "Scannable data with loading, empty, partial, stale, and error states.",
  ResponsiveRecordList: "Mobile-first record list alternative to dense tables."
} as const;

export function hasPrimitive(name: string): name is PrimitiveName {
  return primitiveNames.includes(name as PrimitiveName);
}
