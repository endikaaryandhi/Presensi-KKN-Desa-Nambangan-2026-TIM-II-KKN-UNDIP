'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const LS_KEY = 'presensi_user';
const DEVICE_KEY = 'presensi_device';
const COOKIE_MAX_AGE = 60 * 60 * 12;

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

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) router.replace('/');
    } catch {}
  }, [router]);

  function validasi() {
    const n = nama.trim();
    const id = nim.trim();
    if (n.length < 3) return 'Nama minimal 3 karakter.';
    if (!/^\d{8,20}$/.test(id)) return 'NIM harus berupa 8–20 digit angka.';
    return '';
  }

  // ==================== PERBAIKAN: OPERASI VERIFIKASI SEBELUM LOGIN ====================
  async function handleSubmit(e) {
    e?.preventDefault?.();
    setError('');

    const pesan = validasi();
    if (pesan) { setError(pesan); return; }

    setSubmitting(true);
    try {
      // Lakukan pengecekan NIM ke server API
      const res = await fetch(`/api/presensi?nim=${nim.trim()}`, {
        method: 'GET',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'NIM salah atau tidak terdaftar.');
        setSubmitting(false);
        return;
      }

      // Jika NIM valid, lanjutkan proses pembuatan sesi login
      const deviceId = getDeviceId();
      const user = { nama: nama.trim(), nim: nim.trim(), deviceId };
      localStorage.setItem(LS_KEY, JSON.stringify(user));
      
      document.cookie = `presensi_auth=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      router.replace('/');
    } catch (err) {
      setSubmitting(false);
      setError('Terjadi masalah jaringan atau penyimpanan browser dinonaktifkan.');
    }
  }
  // =====================================================================================

  return (
    <main className="page">
      <div className="card">
        <div className="card__header">
          <h1>Login Presensi</h1>
          <p>Tim II KKN UNDIP · Desa Nambangan 2026</p>
        </div>

        <div className="card__body">
          {error && <div className="alert alert--err">{error}</div>}

          <div>
            <div className="field">
              <label htmlFor="nama">Nama Panggilan</label>
              <input
                id="nama"
                type="text"
                autoComplete="name"
                placeholder="mis. aca, hariz, enrico (huruf kecil semua)"
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