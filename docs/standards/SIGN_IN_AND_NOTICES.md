# Sign-in and notices standard

This is the owner's standard for Joblop and for any future platform built the same way.

## Accounts

| Step | What we ask for | Why |
|---|---|---|
| Create account | Name, mobile number, email, acceptance of the terms. **No password.** | The mobile number is how the person signs in; the email is where documents go. |
| Sign in | Mobile number, then a 6-digit code sent by text. The code lasts 10 minutes and works once. | Easiest for workers and employers. Nothing to remember or reset. |
| Optional extra | "Continue with Google" where it is already set up. | Never replaces the phone code. |

Staff accounts are not self-service: the owner grants staff access and the staff member signs in with their phone the same way.

## Notices

The rule lives in code at `apps/api/src/notifications/noticeChannels.ts`. Every notice must use it.

| Notice | Email | Text |
|---|---|---|
| Sign-in code | | Yes |
| Email confirmation code | Yes | Yes |
| Shift confirmed (worker) | Yes | Yes |
| Shift starting soon (worker) | Yes | Yes |
| A person is needed at the contact desk (staff) | Yes | Only when urgent |
| Invoice sent (with the PDF attached) | Yes | |
| Job request received, worker accepted (employer) | Yes | |
| Payout registered or paid (worker) | Yes | |
| Account notices, replies, greetings | Yes | |

**Email** carries documents and information. **Text** carries only what is urgent or important, because texts cost money and interrupt people. A new notice is email only unless it is added to the text list on purpose.

## Delivery requirements

- Texts in Canada and the United States need an approved toll-free or registered sender at the text provider (Brevo). Until it is approved, codes are not delivered to phones.
- Emails use the shared branded design built in `apps/api/src/mailer/emailSender.ts`.
