// Public, unauthenticated transaction statement reached by a signed link.
// It performs NO data fetch: the page only verifies the token's signature +
// expiry (server-side, Node runtime) and renders the already-masked snapshot
// embedded in the token. A forged or expired link renders nothing but an
// "invalid link" notice.
import { verifyShare } from "../../../lib/shareToken";
import SharedStatement from "./SharedStatement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SharePage(
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const snapshot = verifyShare(token);
  return <SharedStatement snapshot={snapshot} />;
}
