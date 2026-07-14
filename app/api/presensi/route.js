import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inisialisasi Supabase Client
// Pastikan variabel ini ada di file .env.local Anda
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Gunakan service role key untuk akses server-side
);

export async function POST(req) {
  try {
    const { nim, nama } = await req.json();

    // Validasi input
    if (!nim || !nama) {
      return NextResponse.json(
        { error: 'NIM dan Nama wajib diisi' },
        { status: 400 }
      );
    }

    // 1. Verifikasi apakah mahasiswa terdaftar di tabel 'mahasiswa'
    const { data: user, error: dbError } = await supabase
      .from('mahasiswa')
      .select('*')
      .eq('nim', nim)
      .ilike('nama', nama) // ilike membuat pencarian nama tidak sensitif case (Endika == endika)
      .single();

    if (dbError || !user) {
      return NextResponse.json(
        { error: 'NIM atau Nama tidak terdaftar' },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Selamat datang, ${user.nama}. Presensi berhasil dicatat.` 
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}