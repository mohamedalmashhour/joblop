import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import {
  Badge,
  BodyText,
  Button,
  Card,
  Heading,
  ScreenContainer,
  Section,
  SmallText
} from "../../ui/primitives";
import {
  getOnboardingCompletionScore,
  onboardingDataTruth,
  onboardingTruthBoundaries,
  workerOnboardingFlow,
  workerOnboardingStatuses,
  workerProfileSections
} from "./workerOnboardingContent";

type OnboardingScreenKind =
  | "signup"
  | "profile"
  | "qualifications"
  | "availability"
  | "review";

const screenContent: Record<
  OnboardingScreenKind,
  {
    title: string;
    subtitle: string;
    nextLabel: string;
  }
> = {
  signup: {
    title: "Worker sign up",
    subtitle: "Create an account shell without claiming worker approval.",
    nextLabel: "Continue to profile"
  },
  profile: {
    title: "Identity and profile setup",
    subtitle: "Capture worker-owned identity, contact, language, and accessibility needs.",
    nextLabel: "Continue to qualifications"
  },
  qualifications: {
    title: "Role and qualification setup",
    subtitle: "Collect roles, experience, certifications, authorization, and review states.",
    nextLabel: "Continue to availability"
  },
  availability: {
    title: "Availability and preferences",
    subtitle: "Configure service area, travel, availability calendar, rate, and urgent preferences.",
    nextLabel: "Review onboarding"
  },
  review: {
    title: "Onboarding review",
    subtitle: "Review fixture data before dashboard handoff. Submission is not verification.",
    nextLabel: "Open worker dashboard"
  }
};

export function WorkerOnboardingScreen({
  kind,
  onBack,
  onNext
}: {
  kind: OnboardingScreenKind;
  onBack: () => void;
  onNext: () => void;
}) {
  const content = screenContent[kind];

  return (
    <ScreenContainer testID={`worker-onboarding-${kind}`}>
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back" onPress={onBack} variant="secondary" />
          <Card>
            <Badge label="fixture onboarding" tone="warning" />
            <Heading>{content.title}</Heading>
            <BodyText>{content.subtitle}</BodyText>
            <SmallText>Completion score: {getOnboardingCompletionScore()}% fixture.</SmallText>
          </Card>

          <Section title="Onboarding flow">
            {workerOnboardingFlow.map((step) => (
              <Card key={step.screen}>
                <Heading>{step.title}</Heading>
                <SmallText>{step.boundary}</SmallText>
              </Card>
            ))}
          </Section>

          <Section title="Profile sections">
            {workerProfileSections.map((section) => (
              <Card key={section.title}>
                <Badge label={section.status} tone={section.status === "Review Pending" ? "warning" : "neutral"} />
                <Heading>{section.title}</Heading>
                {section.fields.map((field) => (
                  <SmallText key={field}>- {field}</SmallText>
                ))}
              </Card>
            ))}
          </Section>

          <Section title="Truthful states">
            <Card>
              {workerOnboardingStatuses.map((status) => (
                <SmallText key={status}>- {status}</SmallText>
              ))}
            </Card>
          </Section>

          <Section title="Boundaries">
            <Card>
              {onboardingTruthBoundaries.map((boundary) => (
                <SmallText key={boundary}>- {boundary}</SmallText>
              ))}
            </Card>
            <Card>
              {onboardingDataTruth.map((truth) => (
                <SmallText key={truth}>- {truth}</SmallText>
              ))}
            </Card>
          </Section>

          <Button label={content.nextLabel} onPress={onNext} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export function WorkerDashboardHandoffScreen({
  onOpenAvailable,
  onOpenProfile
}: {
  onOpenAvailable: () => void;
  onOpenProfile: () => void;
}) {
  return (
    <ScreenContainer testID="worker-dashboard-handoff">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Badge label="worker dashboard" tone="success" />
            <Heading>Worker dashboard</Heading>
            <BodyText>
              Dashboard summarizes next steps after fixture onboarding. It does not bypass review,
              verify credentials, or guarantee assignments.
            </BodyText>
          </Card>
          <Button label="Browse available shifts" onPress={onOpenAvailable} />
          <Button label="Review profile" onPress={onOpenProfile} variant="secondary" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export const workerOnboardingScreenKinds = Object.keys(screenContent) as OnboardingScreenKind[];

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  stack: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  }
});
