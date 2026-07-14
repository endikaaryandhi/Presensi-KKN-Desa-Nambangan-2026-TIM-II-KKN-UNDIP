// app/layout.js
export const metadata = { title: "Presensi KKN Nambangan" };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}