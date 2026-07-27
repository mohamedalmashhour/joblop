import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (process.env.RWOS_ENV === "production" && request.nextUrl.protocol === "https:") {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export const config = { matcher: "/:path*" };
