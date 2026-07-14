// middleware.js  (letakkan di root project, sejajar dengan folder app/)
import { NextResponse } from "next/server";

// Proteksi lunak: halaman scan ("/") hanya boleh diakses bila cookie sesi ada.
// Cookie diset saat login (bukan httpOnly, hanya penanda — bukan data sensitif).
export function middleware(req) {
  const sudahLogin = req.cookies.get("presensi_auth")?.value === "1";
  const { pathname } = req.nextUrl;

  // Belum login & mencoba buka halaman scan → arahkan ke /login
  if (!sudahLogin && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Sudah login & buka /login → arahkan ke scan
  if (sudahLogin && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Jalankan hanya untuk rute halaman (lewati API, static, favicon)
export const config = {
  matcher: ["/", "/login"],
};