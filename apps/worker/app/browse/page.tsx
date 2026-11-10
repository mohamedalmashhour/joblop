import { redirect } from "next/navigation";
import { findWorkHref, firstParam } from "../findWorkUrl";

// The old public job board. Jobs now live on the one Find work page (List / Map / Calendar); the
// board's other sections (what Joblop is, employers, contact) moved to /about.
export default async function BrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  redirect(findWorkHref({ tab: "list", q: firstParam(params.q), city: firstParam(params.city) ?? firstParam(params.where) }));
}
