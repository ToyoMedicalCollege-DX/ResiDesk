import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = new Set(["/", "/login"]);

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC.has(pathname) || pathname.startsWith("/auth/");
  if (pathname === "/alerts" || pathname.startsWith("/alerts/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/students";
    return NextResponse.redirect(redirectUrl);
  }

  const mustChangePassword = user?.user_metadata?.must_change_password === true;
  const isSetPassword = pathname === "/set-password";
  const isDesk =
    pathname.startsWith("/students") ||
    pathname.startsWith("/departments") ||
    pathname.startsWith("/settings");

  if (!user && (isDesk || isSetPassword)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isDesk) {
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!staff) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "not_staff");
      return NextResponse.redirect(redirectUrl);
    }
    if (mustChangePassword) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/set-password";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && isSetPassword && !mustChangePassword) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/students";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (staff) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = mustChangePassword ? "/set-password" : "/students";
      return NextResponse.redirect(redirectUrl);
    }
  }

  void isPublic;
  return supabaseResponse;
}
