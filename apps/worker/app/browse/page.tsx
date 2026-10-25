import { PublicJobBoard } from "./PublicJobBoard";

// Public, no-sign-in job board across Canada. A funnel front door for workers.
export const metadata = {
  title: "Find work across Canada — JobLop",
  description: "Browse open jobs across Canada, free and without an account. Sign up to apply."
};

export default function BrowsePage() {
  return <PublicJobBoard />;
}
