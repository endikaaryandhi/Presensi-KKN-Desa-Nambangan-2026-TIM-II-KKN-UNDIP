// app/api/presensi/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = "Presensi";
const TZ = "Asia/Jakarta";

// Klien Sheets terautentikasi via service account (JWT)
function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    // Vercel menyimpan newline sebagai literal "\n" → kembalikan ke newline asli
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// Waktu WIB dihitung server-side; hourCycle h23 menghindari bug "24:00"
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

// Cegah nilai diawali = + - @ agar tidak dieksekusi sebagai rumus di Sheets
function sanitize(v) {
  const s = (v ?? "").toString().trim().slice(0, 120);
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const nama = sanitize(body.nama);
    const idAnggota = sanitize(body.idAnggota);
    const deviceId = sanitize(body.deviceId);

    // Validasi minimum
    if (!nama || !deviceId) {
      return NextResponse.json(
        { ok: false, error: "Nama dan device tidak boleh kosong." },
        { status: 400 }
      );
    }

    const sheets = getSheets();
    const { tanggal, waktu, stamp } = jakartaNow();

    // Kunci identitas: pakai NIM bila ada, jika tidak pakai deviceId
    const key = idAnggota || deviceId;

    // Anti-duplikat: sudah presensi hari ini?
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A:F`,
    });
    const rows = read.data.values || [];
    const sudah = rows.some((r) => {
      const rowKey = (r[4] || "").trim() || (r[5] || "").trim(); // E:ID atau F:Device
      return r[1] === tanggal && rowKey === key;
    });

    if (sudah) {
      return NextResponse.json({
        ok: true, status: "sudah",
        message: "Kamu sudah presensi hari ini.",
        nama, tanggal, waktu,
      });
    }

    // Tulis baris baru — RAW agar aman dari formula injection
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