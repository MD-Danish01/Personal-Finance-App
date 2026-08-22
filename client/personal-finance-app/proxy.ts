// import { createServerClient } from "@supabase/ssr";
// import { NextResponse, type NextRequest } from "next/server";

// export async function proxy(request: NextRequest) {
//   let supabaseResponse = NextResponse.next({ request });

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll();
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
//           supabaseResponse = NextResponse.next({ request });
//           cookiesToSet.forEach(({ name, value, options }) =>
//             supabaseResponse.cookies.set(name, value, options),
//           );
//         },
//       },
//     },
//   );

//   const { data } = await supabase.auth.getUser();
//   const user = data.user;

//   const protectedPaths = ["/home", "/money", "/plan", "/goals", "/insights"];
//   const isProtected = protectedPaths.some(
//     (path) =>
//       request.nextUrl.pathname === path ||
//       request.nextUrl.pathname.startsWith(`${path}/`),
//   );

//   if (!user && isProtected) {
//     const url = request.nextUrl.clone();
//     url.pathname = "/login";
//     url.searchParams.set("next", request.nextUrl.pathname);
//     return NextResponse.redirect(url);
//   }

//   if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
//     return NextResponse.redirect(new URL("/home", request.url));
//   }

//   return supabaseResponse;
// }

// export const config = {
//   matcher: [
//     "/home/:path*",
//     "/money/:path*",
//     "/plan/:path*",
//     "/goals/:path*",
//     "/insights/:path*",
//     "/login",
//     "/signup",
//   ],
// };