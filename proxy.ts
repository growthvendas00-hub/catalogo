import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";

export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnv) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  if (request.nextUrl.pathname === "/") {
    const referral = request.nextUrl.searchParams.get("cupom") ?? request.nextUrl.searchParams.get("ref");
    if (referral) {
      const { data } = await supabase.rpc("record_attribution_visit", {
        p_code: referral,
        p_landing: `${request.nextUrl.pathname}${request.nextUrl.search}`,
        p_user_agent: request.headers.get("user-agent") ?? "",
      });
      const attribution = Array.isArray(data) ? data[0] : data;
      if (attribution?.code) {
        const couponEnd = attribution.ends_at ? new Date(attribution.ends_at).getTime() : Number.POSITIVE_INFINITY;
        const maxAge = Math.max(0, Math.min(30 * 24 * 60 * 60, Math.floor((couponEnd - Date.now()) / 1000)));
        if (maxAge > 0) response.cookies.set("laus_ref", String(attribution.code), {
          httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge,
        });
      }
    }
  }
  return response;
}

export const config = { matcher: ["/", "/admin/:path*", "/vendedor/:path*", "/api/admin/:path*"] };
