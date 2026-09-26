import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, LOCALES, LOCALE_HEADER } from "@/lib/types";

/**
 * Sends bare paths (`/`, `/books`) to the default locale, and leaves
 * `/admin`, assets and explicit locales alone.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const first = pathname.split("/")[1];
  if ((LOCALES as readonly string[]).includes(first)) {
    // Hand the locale to the server as a request header. A URL that matches no
    // route is answered by `app/global-not-found.tsx`, which renders outside the
    // `[lang]` layout and so cannot recover the locale from the route params.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LOCALE_HEADER, first);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|admin|favicon.ico|.*\\..*).*)"],
};
