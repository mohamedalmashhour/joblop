import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, touch, typography } from "@rwos/design-system";

import { directionsUrl, mapSearchUrl } from "./mapUrls";

/**
 * Native map capsule — links a job's address to real turn-by-turn directions. It opens the device map
 * app (Google/Apple Maps) with the job address as the destination, so routing uses the worker's own
 * GPS location. Linking to a maps URL is free and keyless — only embedding map tiles needs a billed
 * key, which we deliberately avoid. When the address is restricted or missing, nothing renders.
 */
export function JobLocationLink({ address }: { address: string | null | undefined }) {
  const trimmed = (address ?? "").trim();
  if (trimmed.length < 2 || /restricted|not provided/i.test(trimmed)) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.address}>{trimmed}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Get directions to ${trimmed}`}
          accessibilityRole="button"
          onPress={() => void Linking.openURL(directionsUrl(trimmed))}
          style={styles.directionsButton}
        >
          <Text style={styles.directionsText}>Get directions</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`View ${trimmed} on map`}
          accessibilityRole="button"
          onPress={() => void Linking.openURL(mapSearchUrl(trimmed))}
          style={styles.viewButton}
        >
          <Text style={styles.viewText}>View on map</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginTop: spacing.sm
  },
  address: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  directionsButton: {
    alignItems: "center",
    backgroundColor: colors.deepTeal,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: touch.minimumTarget,
    paddingHorizontal: spacing.lg
  },
  directionsText: {
    color: colors.surfaceRaised,
    fontSize: typography.small,
    fontWeight: "900"
  },
  viewButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: touch.minimumTarget,
    paddingHorizontal: spacing.lg
  },
  viewText: {
    color: colors.deepTeal,
    fontSize: typography.small,
    fontWeight: "800"
  }
});
