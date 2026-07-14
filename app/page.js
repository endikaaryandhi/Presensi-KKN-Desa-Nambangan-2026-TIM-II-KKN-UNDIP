'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const LS_KEY = 'presensi_user';

// Status UI: 'idle' (belum scan) | 'scanning' | 'processing' | 'done'
export default function ScanPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { status, message, nama, waktu }

  const scannerRef = useRef(null);   // instance Html5Qrcode
  const startingRef = useRef(false); // cegah start ganda

  // Guard: hanya boleh diakses bila sudah login
  useEffect(() => {
    let u = null;
    try { u = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch {}
    if (!u?.nim) { router.replace('/login'); return; }
    setUser(u);

    // Matikan kamera bila komponen dilepas / pindah halaman
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function stopScanner() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      // stop() hanya valid saat sedang memindai
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch { /* diamkan: kamera mungkin sudah berhenti */ }
  }

  async function mulaiScan() {
    if (startingRef.current) return;
    startingRef.current = true;
    setError('');
    setResult(null);
    setPhase('scanning');

    try {
      // Import dinamis: html5-qrcode menyentuh objek browser,
      // jadi jangan di-import saat render server (SSR).
      const { Html5Qrcode } = await import('html5-qrcode');

      const scanner = new Html5Qrcode('reader', { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // utamakan kamera belakang di HP
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        onScanSuccess,
        () => { /* frame tanpa QR — abaikan agar console bersih */ }
      );
    } catch (err) {
      startingRef.current = false;
      setPhase('idle');
      // Pesan spesifik untuk kegagalan izin/kamera
      const msg = String(err?.message || err || '');
      if (/permission|denied|NotAllowed/i.test(msg)) {
        setError('Izin kamera ditolak. Aktifkan izin kamera di browser lalu coba lagi.');
      } else if (/secure|https|NotSupported/i.test(msg)) {
        setError('Kamera butuh HTTPS. Buka lewat domain https (Vercel) atau localhost.');
      } else if (/NotFound|no camera/i.test(msg)) {
        setError('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setError('Gagal membuka kamera. Coba muat ulang halaman.');
      }
    }
  }

  async function onScanSuccess(decodedText) {
    // Kunci: hentikan kamera dulu agar tidak trigger berkali-kali
    await stopScanner();
    startingRef.current = false;
    setPhase('processing');

    try {
      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: user.nama,
          idAnggota: user.nim,   // NIM sebagai kunci identitas
          deviceId: user.deviceId,
          qr_data: decodedText,  // isi QR untuk divalidasi server
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        setResult({
          status: 'error',
          message: data.error || 'Presensi gagal. Coba lagi.',
        });
      } else {
        setResult({
          status: data.status === 'sudah' ? 'warn' : 'ok',
          message: data.message,
          nama: data.nama,
          waktu: data.waktu,
          tanggal: data.tanggal,
        });
      }
    } catch (err) {
      setResult({ status: 'error', message: 'Tidak ada koneksi ke server.' });
    } finally {
      setPhase('done');
    }
  }

  function scanUlang() {
    setResult(null);
    setError('');
    setPhase('idle');
  }

  function logout() {
    try {
      localStorage.removeItem(LS_KEY);
      document.cookie = 'presensi_auth=; path=/; max-age=0; SameSite=Lax';
    } catch {}
    router.replace('/login');
  }

  if (!user) return null; // menunggu guard menyelesaikan cek

  const inisial = (user.nama?.trim()?.[0] || '?').toUpperCase();

  return (
    <main className="page">
      <div className="card">
        <div className="card__header">
          <h1>Sistem Presensi</h1>
          <p>KKN Desa Nambangan 2026</p>
        </div>

        <div className="card__body">
          {/* Identitas pengguna aktif */}
          <div className="user-chip">
            <div className="avatar">{inisial}</div>
            <div className="meta">
              <strong>{user.nama}</strong>
              <span>NIM {user.nim}</span>
            </div>
          </div>

          {error && <div className="alert alert--err">{error}</div>}

          {/* IDLE: tombol buka kamera */}
          {phase === 'idle' && (
            <>
              <p className="scan-hint">Tekan tombol, lalu arahkan kamera ke QR presensi.</p>
              <button className="btn btn--primary" onClick={mulaiScan}>
                Buka Kamera &amp; Scan QR
              </button>
            </>
          )}

          {/* SCANNING: viewfinder kamera */}
          {phase === 'scanning' && (
            <>
              <p className="scan-hint">Arahkan QR presensi ke dalam kotak.</p>
              <div id="reader" />
              <button className="btn btn--ghost" style={{ marginTop: 12 }} onClick={() => { stopScanner(); setPhase('idle'); }}>
                Batalkan
              </button>
            </>
          )}

          {/* PROCESSING: kirim ke server */}
          {phase === 'processing' && (
            <div className="result">
              <div className="spinner" />
              <p>Memproses presensi…</p>
            </div>
          )}

          {/* DONE: tampilkan hasil */}
          {phase === 'done' && result && (
            <div className="result">
              {result.status === 'ok' && (
                <div className="badge badge--ok">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {result.status === 'warn' && (
                <div className="badge badge--warn">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </div>
              )}
              {result.status === 'error' && (
                <div className="badge badge--err">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}

              <h2>
                {result.status === 'ok' && 'Presensi Berhasil'}
                {result.status === 'warn' && 'Sudah Presensi'}
                {result.status === 'error' && 'Gagal'}
              </h2>
              <p>{result.message}</p>
              {result.waktu && (
                <p className="kv">Waktu: <b>{result.tanggal} {result.waktu} WIB</b></p>
              )}

              <button className="btn btn--primary" style={{ marginTop: 18 }} onClick={scanUlang}>
                Scan Ulang
              </button>
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <button className="link-btn" onClick={logout}>Keluar (ganti akun)</button>
          </div>
        </div>

        <div className="card__footer">Tim II KKN UNDIP &copy; 2026</div>
      </div>
    </main>
  );
}