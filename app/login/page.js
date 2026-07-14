'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Kunci penyimpanan identitas di sisi klien
const LS_KEY = 'presensi_user';
const DEVICE_KEY = 'presensi_device';
// Umur sesi cookie (12 jam) — cukup untuk sekali sesi presensi
const COOKIE_MAX_AGE = 60 * 60 * 12;

// Ambil / buat deviceId unik & persisten (dipakai server untuk anti-duplikat
// bila NIM tidak ada). crypto.randomUUID tersedia di semua browser modern.
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export default function LoginPage() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Jika sudah login, langsung lempar ke halaman scan
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) router.replace('/');
    } catch {}
  }, [router]);

  function validasi() {
    const n = nama.trim();
    const id = nim.trim();
    if (n.length < 3) return 'Nama minimal 3 karakter.';
    // NIM Undip berupa angka (mis. 21120123130089). Longgar: 8–20 digit.
    if (!/^\d{8,20}$/.test(id)) return 'NIM harus berupa 8–20 digit angka.';
    return '';
  }

  function handleSubmit(e) {
    e?.preventDefault?.();
    setError('');

    const pesan = validasi();
    if (pesan) { setError(pesan); return; }

    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      const user = { nama: nama.trim(), nim: nim.trim(), deviceId };
      localStorage.setItem(LS_KEY, JSON.stringify(user));
      // Cookie non-httpOnly hanya sebagai penanda sesi agar middleware
      // bisa memproteksi rute /. Bukan menyimpan data sensitif.
      document.cookie = `presensi_auth=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      router.replace('/');
    } catch (err) {
      setSubmitting(false);
      setError('Tidak bisa menyimpan sesi. Aktifkan penyimpanan/localStorage browser.');
    }
  }

  return (
    <main className="page">
      <div className="card">
        <div className="card__header">
          <h1>Login Presensi</h1>
          <p>Tim II KKN UNDIP · Desa Nambangan 2026</p>
        </div>

        <div className="card__body">
          {error && <div className="alert alert--err">{error}</div>}

          {/* Bukan <form> supaya konsisten dengan pola event handler React */}
          <div>
            <div className="field">
              <label htmlFor="nama">Nama Lengkap</label>
              <input
                id="nama"
                type="text"
                autoComplete="name"
                placeholder="mis. Endika Aryandhi"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              />
            </div>

            <div className="field">
              <label htmlFor="nim">NIM</label>
              <input
                id="nim"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="mis. 21120123130089"
                value={nim}
                onChange={(e) => setNim(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              />
              <div className="hint">Gunakan NIM asli — dipakai untuk mencegah presensi ganda.</div>
            </div>

            <button
              className="btn btn--primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Memproses…' : 'Masuk & Lanjut Scan QR'}
            </button>
          </div>
        </div>

        <div className="card__footer">Tim II KKN UNDIP &copy; 2026</div>
      </div>
    </main>
  );
}