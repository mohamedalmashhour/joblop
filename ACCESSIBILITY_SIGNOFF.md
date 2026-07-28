# Resident Workforce OS Accessibility Signoff

Status: **not signed off**. Static semantics and contrast-oriented fixes exist; no real-device or
assistive-technology evidence is recorded.

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
