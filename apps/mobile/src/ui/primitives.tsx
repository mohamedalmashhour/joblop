import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, touch, typography } from "@rwos/design-system";
import { uiFoundation } from "@rwos/ui";

type CommonProps = PropsWithChildren<{
  testID?: string;
}>;

export function ScreenContainer({ children, testID }: CommonProps) {
  return (
    <View style={styles.screen} testID={testID}>
      {children}
    </View>
  );
}

export function Heading({ children, testID }: CommonProps) {
  return (
    <Text accessibilityRole="header" style={styles.heading} testID={testID}>
      {children}
    </Text>
  );
}

export function BodyText({ children, testID }: CommonProps) {
  return (
    <Text style={styles.body} testID={testID}>
      {children}
    </Text>
  );
}

export function SmallText({ children, testID }: CommonProps) {
  return (
    <Text style={styles.small} testID={testID}>
      {children}
    </Text>
  );
}

export function Card({ children, testID }: CommonProps) {
  return (
    <View style={styles.card} testID={testID}>
      {children}
    </View>
  );
}

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Badge({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <View style={[styles.badge, styles[`${tone}Badge`]]}>
      <Text style={[styles.badgeText, styles[`${tone}BadgeText`]]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  testID
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles[`${variant}Button`], disabled ? styles.disabledButton : null]}
      testID={testID}
    >
      <Text
        style={[styles.buttonText, variant === "secondary" ? styles.secondaryButtonText : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default"
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card testID="empty-state">
      <Heading>{title}</Heading>
      <BodyText>{body}</BodyText>
    </Card>
  );
}

export function LoadingState({ label = "Loading shifts" }: { label?: string }) {
  return (
    <Card testID="loading-state">
      <ActivityIndicator color={colors.deepTeal} />
      <BodyText>{label}</BodyText>
    </Card>
  );
}

export function ErrorState({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card testID="error-state">
      <Heading>{title}</Heading>
      <BodyText>{body}</BodyText>
      {action}
    </Card>
  );
}

export const primitiveContract = uiFoundation.primitiveNames;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surfaceSubtle,
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  heading: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "800"
  },
  body: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22
  },
  small: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14
  },
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.deepTealMuted,
    fontSize: typography.small,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  neutralBadge: {
    backgroundColor: "#eef5f5"
  },
  successBadge: {
    backgroundColor: "#e7f6ed"
  },
  warningBadge: {
    backgroundColor: "#fff1d6"
  },
  dangerBadge: {
    backgroundColor: "#fde8e8"
  },
  badgeText: {
    fontSize: typography.micro,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  neutralBadgeText: {
    color: colors.deepTeal
  },
  successBadgeText: {
    color: "#166534"
  },
  warningBadgeText: {
    color: "#7c2d12"
  },
  dangerBadgeText: {
    color: "#991b1b"
  },
  button: {
    alignItems: "center",
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: touch.comfortableTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButton: {
    backgroundColor: colors.navy
  },
  secondaryButton: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1
  },
  dangerButton: {
    backgroundColor: colors.danger
  },
  disabledButton: {
    opacity: 0.6
  },
  buttonText: {
    color: colors.surfaceRaised,
    fontSize: typography.body,
    fontWeight: "700"
  },
  secondaryButtonText: {
    color: colors.deepTeal
  },
  inputGroup: {
    gap: spacing.xs
  },
  inputLabel: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "700"
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    minHeight: touch.comfortableTarget,
    paddingHorizontal: spacing.md
  }
});
