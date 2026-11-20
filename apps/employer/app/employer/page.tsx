import { redirect } from "next/navigation";

// The workspace has no page of its own at this address; send it to the employer's dashboard.
export default function EmployerHomePage() {
  redirect("/employer/dashboard");
}
