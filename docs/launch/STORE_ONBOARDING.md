# JobLop — app store onboarding (Google Play + Apple App Store)

Reference for submitting the JobLop mobile app (`apps/mobile`). The app itself is build-ready; the
account/submit steps are owner-only. Money stays gated off; this is the app, not live payments.

## Identifiers
- **App name:** JobLop
- **iOS bundle id:** `com.joblop.app`
- **Android package:** `com.joblop.app`
- **Play developer account:** sybnb

## IARC content age rating (done)
- **Global Rating ID:** `c2aca51d-1678-86f6-85b0-3fb595155fcc`
- **Generated:** 2026-10-29, via the IARC questionnaire; **live on Google Play**.
- **Reuse:** on any other IARC-licensed storefront (Amazon Appstore, Galaxy Store, …), paste this
  Global Rating ID during onboarding instead of re-doing the questionnaire.
- **RE-RATE TRIGGER:** if the app changes in a way that changes the questionnaire answers — e.g. adding
  worker↔employer **messaging/chat**, **user-generated content**, **ads**, or **real in-app money/
  payments** — you must redo the IARC questionnaire and get a new rating. (Today: no ads, no UGC chat,
  payments gated off → current rating stands. Re-run it when live payments or messaging ship.)

## Build config (ready)
`apps/mobile/eas.json`:
- `production` builds iOS (store) and Android **app-bundle (.aab)** for Play; `appVersionSource: remote`
  + `autoIncrement` manage the iOS build number and Android versionCode.
- `development` / `preview` build internal APKs (Android) / simulator or internal (iOS).

## Owner steps to publish (not done by the agent)

### Android (Google Play) — rating already live
1. In Play Console, create/confirm the **JobLop** app under the `sybnb` account (package `com.joblop.app`).
2. `eas build --platform android --profile production` → produces the `.aab`.
3. Create a **Google Play service account**, download its JSON key, and set its path in
   `eas.json → submit.production.android.serviceAccountKeyPath` (keep the key OUT of git).
4. `eas submit --platform android --profile production` (uploads to the **internal** track first), then
   promote to closed/open testing → production in Play Console.
5. Complete the Play **Data safety** form, store listing, screenshots, privacy policy URL.

### iOS (Apple App Store)
See `docs/launch/IOS_APP_STORE_SUBMISSION.md`. Summary: Apple Developer account → App ID `com.joblop.app`
→ fill `eas.json → submit.production.ios` → `eas build`/`eas submit` → TestFlight → submit.

## Honest status
- The app is **test-mode** (payments gated off). A store build is a **pilot/TestFlight-grade** release,
  not a live-money launch — that still needs the money licence + KYC/AML + CPA sign-off (owner).
- The app icon is the real JobLop brand mark; branding is JobLop (no RezekMe).
