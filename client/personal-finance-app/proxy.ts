import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedPaths = ["/home", "/money", "/plan", "/goals", "/insights"];

export default auth(async (request) => {
  const isLoggedIn = !!request.auth?.user;
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isLoggedIn && isProtected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/home/:path*",
    "/money/:path*",
    "/plan/:path*",
    "/goals/:path*",
    "/insights/:path*",
    "/login",
    "/signup",
  ],
};