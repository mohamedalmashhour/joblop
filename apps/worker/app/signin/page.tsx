import { redirect } from "next/navigation";

// Workers sign in on the home page card. The employer and staff sites use /signin, so a worker who
// types it lands on the sign-in tab of that card instead of a "Page not found" dead end.
export default function SignInRedirect(): never {
  redirect("/?tab=signin#auth-card");
}
