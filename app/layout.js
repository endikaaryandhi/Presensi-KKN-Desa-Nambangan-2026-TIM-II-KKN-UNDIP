// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Presensi KKN Nambangan",
  description: "Sistem presensi berbasis QR — Tim II KKN UNDIP Desa Nambangan 2026",
};

// viewport terpisah (Next 16): kunci lebar agar tampilan rapi di HP,
// dan cegah zoom liar saat fokus ke input.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}