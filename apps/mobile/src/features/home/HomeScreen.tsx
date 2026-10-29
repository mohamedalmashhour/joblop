import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@rwos/design-system";
import { BodyText, Card, Heading, ScreenContainer, SmallText } from "../../ui/primitives";
import { homeCopy, homeDestinations, type HomeDestination } from "./homeContent";

// The worker's real home: a greeting plus quick, reachable routes to every live destination (and the
// onboarding flow). Replaces the former fixture "service/support" hub. No data fetching, no fixtures.
export function HomeScreen({
  authenticated,
  onOpen
}: {
  authenticated: boolean;
  onOpen: (destination: HomeDestination) => void;
}) {
  return (
    <ScreenContainer testID="home-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Heading>{homeCopy.title}</Heading>
            <BodyText>{homeCopy.intro}</BodyText>
            {!authenticated ? <SmallText>{homeCopy.signedOutNote}</SmallText> : null}
          </Card>

          {homeDestinations.map((d) => (
            <Pressable
              accessibilityRole="button"
              key={d.id}
              onPress={() => onOpen(d.id)}
              style={styles.tile}
              testID={`home-tile-${d.id}`}
            >
              <Heading>{d.label}</Heading>
              <SmallText>{d.description}</SmallText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.md, paddingBottom: spacing.xxl },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  }
});
