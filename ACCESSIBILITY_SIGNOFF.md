# Resident Workforce OS Accessibility Signoff

Status: **not signed off**. Static semantics and contrast-oriented fixes exist; no real-device or
assistive-technology evidence is recorded.

Evidence layers are cumulative and non-substitutable:

1. static lint and source semantics;
2. automated browser accessibility checks on the exact release;
3. keyboard-only and manual browser checks;
4. physical-device layout, touch and scaling checks;
5. VoiceOver/TalkBack/screen-reader execution;
6. dated acceptance by the named accessibility owner.

Passing an earlier layer never satisfies a later layer.

Required matrix:

| Surface        | Required evidence                                                        | Status |
| -------------- | ------------------------------------------------------------------------ | ------ |
| Employer web   | keyboard-only, current Chrome/Safari/Firefox, zoom/reflow, screen reader | Open   |
| Admin web      | keyboard-only, current Chrome/Safari/Firefox, dialogs/forms/live regions | Open   |
| Worker iOS     | production build, VoiceOver, dynamic type, touch targets, rotation       | Open   |
| Worker Android | production build, TalkBack, font scaling, touch targets, rotation        | Open   |

Test sign-in, navigation, organization selection, request create/edit/submit/correct/resubmit,
admin review/dispatch/error states, worker offer list/detail/accept/decline/conflict, Assignment
visibility, loading, empty, stale, unauthorized, and failure states.

For each run record device, OS, browser/app build, assistive technology/version, tester, date,
scenario, result, defect, fix commit, and retest. Do not mark this document signed off until a named
accessibility owner accepts all remaining exceptions.

## Required device record

| Field                | Required evidence                                                              |
| -------------------- | ------------------------------------------------------------------------------ |
| Device               | Exact manufacturer/model; identify any simulator, which cannot provide signoff |
| OS                   | Exact supported iOS/Android version                                            |
| Browser/WebView      | Exact version                                                                  |
| Assistive technology | VoiceOver/TalkBack/screen reader and version                                   |
| Build                | Immutable release commit and signed build identifier                           |
| Locale/direction     | English LTR and Arabic RTL                                                     |
| Display              | Default and maximum supported font scaling/dynamic type                        |

Acceptance includes labelled controls, semantic headings, visible keyboard focus, logical tab order,
form instructions and validation association, loading and live-region announcements, empty/denied/
stale/error/network/session-expiry states, platform-equivalent 44-by-44 touch targets, zoom/reflow,
RTL layout, Arabic content integrity, rotation, reduced motion, font scaling, and contrast.
