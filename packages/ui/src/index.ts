import { touch } from "@rwos/design-system";

export const primitiveNames = [
  "ScreenContainer",
  "Typography",
  "Button",
  "Card",
  "Badge",
  "Input",
  "EmptyState",
  "LoadingState",
  "ErrorState",
  "Section",
  "Divider"
] as const;

export const uiFoundation = {
  status: "shell-only",
  minimumTouchTarget: touch.minimumTarget,
  primitiveNames
} as const;
