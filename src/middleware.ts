import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Allow access to auth-related paths
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // Allow access to API routes
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
