// app/api/presensi/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = "Presensi";
const TZ = "Asia/Jakarta";

// Token rahasia yang HARUS cocok dengan isi QR presensi.
const PRESENSI_TOKEN = process.env.PRESENSI_TOKEN;

// Klien Sheets terautentikasi via service account (JWT)
function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// Waktu WIB dihitung server-side
function jakartaNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    tanggal: `${p.year}-${p.month}-${p.day}`,
    waktu: `${p.hour}:${p.minute}:${p.second}`,
    stamp: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`,
  };
}

// Cegah nilai diawali = + - @ agar tidak dieksekusi sebagai rumus
function sanitize(v) {
  const s = (v ?? "").toString().trim().slice(0, 120);
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

function tokenCocok(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ==================== TAMBAHAN: API UNTUK VALIDASI LOGIN KKN UNDIP ====================
// Menyediakan daftar NIM resmi Tim II KKN UNDIP Desa Nambangan 2026 yang boleh login.
// Silakan sesuaikan/tambahkan daftar NIM anggota tim Anda di bawah ini.
const DAFTAR_NIM_RESMI = [
  "21120123130089", // Contoh NIM Anda
  // "211201231XXXXX", // Tambahkan NIM anggota lainnya di sini
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const nim = searchParams.get("nim")?.trim();

    if (!nim) {
      return NextResponse.json({ ok: false, error: "NIM tidak boleh kosong." }, { status: 400 });
    }

    // Periksa apakah NIM terdaftar di daftar resmi tim KKN
    const terdaftar = DAFTAR_NIM_RESMI.includes(nim);

    if (!terdaftar) {
      return NextResponse.json({ ok: false, error: "Password atau Nama salah" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, message: "NIM valid." });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Gagal memvalidasi akun." }, { status: 500 });
  }
}
// =====================================================================================

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const nama = sanitize(body.nama);
    const idAnggota = sanitize(body.idAnggota);
    const deviceId = sanitize(body.deviceId);
    const qrData = (body.qr_data ?? "").toString().trim();

    // 1) Validasi identitas minimum
    if (!nama || !deviceId) {
      return NextResponse.json(
        { ok: false, error: "Nama dan perangkat tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Validasi tambahan saat presensi agar NIM penembak gelap tetap tertolak
    if (idAnggota && !DAFTAR_NIM_RESMI.includes(idAnggota)) {
      return NextResponse.json(
        { ok: false, error: "NIM tidak dikenali sebagai anggota resmi." },
        { status: 403 }
      );
    }

    // 2) Validasi QR
    if (PRESENSI_TOKEN) {
      if (!tokenCocok(qrData, PRESENSI_TOKEN)) {
        return NextResponse.json(
          { ok: false, error: "QR tidak valid. Pastikan memindai QR presensi resmi." },
          { status: 403 }
        );
      }
    } else if (!qrData) {
      return NextResponse.json(
        { ok: false, error: "QR kosong. Silakan pindai QR presensi." },
        { status: 400 }
      );
    }

    const sheets = getSheets();
    const { tanggal, waktu, stamp } = jakartaNow();
    const key = idAnggota || deviceId;

    // 3) Anti-duplikat
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A:F`,
    });
    const rows = read.data.values || [];
    const sudah = rows.some((r) => {
      const rowKey = (r[4] || "").trim() || (r[5] || "").trim();
      return r[1] === tanggal && rowKey === key;
    });

    if (sudah) {
      return NextResponse.json({
        ok: true, status: "sudah",
        message: "Kamu sudah presensi hari ini.",
        nama, tanggal, waktu,
      });
    }

    // 4) Tulis baris baru
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[stamp, tanggal, waktu, nama, idAnggota, deviceId]] },
    });

    return NextResponse.json({
      ok: true, status: "baru",
      message: "Presensi berhasil dicatat.",
      nama, tanggal, waktu,
    });
  } catch (err) {
    console.error("Presensi error:", err?.message);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 }
    );
  }
}