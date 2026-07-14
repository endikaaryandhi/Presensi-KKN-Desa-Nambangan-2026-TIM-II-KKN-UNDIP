// app/page.js
"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [phase, setPhase] = useState("loading");
  const [nama, setNama] = useState("");
  const [idAnggota, setIdAnggota] = useState("");
  const [result, setResult] = useState(null);

  function deviceId() {
    let d = localStorage.getItem("presensi_device");
    if (!d) {
      d = crypto.randomUUID();
      localStorage.setItem("presensi_device", d);
    }
    return d;
  }

  async function kirim(identity) {
    setPhase("sending");
    try {
      const res = await fetch("/api/presensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...identity, deviceId: deviceId() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResult(data);
      setPhase(data.status === "sudah" ? "dup" : "done");
    } catch (e) {
      setResult({ error: e.message });
      setPhase("error");
    }
  }

  // Saat halaman dibuka: kalau identitas tersimpan → langsung kirim
  useEffect(() => {
    const saved = localStorage.getItem("presensi_identity");
    if (saved) kirim(JSON.parse(saved));
    else setPhase("form");
  }, []);

  function daftar() {
    if (!nama.trim()) return;
    const identity = { nama: nama.trim(), idAnggota: idAnggota.trim() };
    localStorage.setItem("presensi_identity", JSON.stringify(identity));
    kirim(identity);
  }

  return (
    <main style={S.wrap}>
      <div style={S.card}>
        <h1 style={S.title}>Presensi</h1>

        {phase === "loading" && <p>Memuat…</p>}
        {phase === "sending" && <p>Mengirim presensi…</p>}

        {phase === "form" && (
          <>
            <p style={S.hint}>Isi sekali saja. Scan berikutnya otomatis.</p>
            <input style={S.input} placeholder="Nama lengkap"
              value={nama} onChange={(e) => setNama(e.target.value)} />
            <input style={S.input} placeholder="NIM / ID (opsional)"
              value={idAnggota} onChange={(e) => setIdAnggota(e.target.value)} />
            <button style={S.btn} onClick={daftar}>Presensi</button>
          </>
        )}

        {phase === "done" && (
          <div style={S.ok}>
            <p style={S.big}>✅ Berhasil</p>
            <p>{result.nama}</p>
            <p>{result.tanggal} · {result.waktu} WIB</p>
          </div>
        )}

        {phase === "dup" && (
          <div style={S.ok}>
            <p style={S.big}>ℹ️ Sudah presensi</p>
            <p>{result.nama} · {result.waktu} WIB</p>
          </div>
        )}

        {phase === "error" && (
          <div>
            <p style={{ color: "#c0392b" }}>Gagal: {result?.error}</p>
            <button style={S.btn} onClick={() => location.reload()}>Coba lagi</button>
          </div>
        )}

        {(phase === "done" || phase === "dup") && (
          <button style={S.link} onClick={() => {
            localStorage.removeItem("presensi_identity");
            location.reload();
          }}>Bukan saya / ganti identitas</button>
        )}
      </div>
    </main>
  );
}

const S = {
  wrap: { minHeight: "100dvh", display: "grid", placeItems: "center",
          background: "#0f172a", fontFamily: "system-ui", padding: 16 },
  card: { background: "#fff", borderRadius: 16, padding: 24, width: "100%",
          maxWidth: 360, textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,.3)" },
  title: { margin: "0 0 12px", fontSize: 22 },
  hint: { color: "#64748b", fontSize: 14 },
  input: { width: "100%", padding: 12, margin: "8px 0", borderRadius: 10,
           border: "1px solid #cbd5e1", fontSize: 16, boxSizing: "border-box" },
  btn: { width: "100%", padding: 12, marginTop: 8, borderRadius: 10, border: 0,
         background: "#2563eb", color: "#fff", fontSize: 16, fontWeight: 600 },
  ok: { padding: 8 }, big: { fontSize: 20, fontWeight: 700 },
  link: { marginTop: 16, background: "none", border: 0, color: "#64748b",
          textDecoration: "underline", fontSize: 13, cursor: "pointer" },
};