'use client';

import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function PresensiPage() {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Inisialisasi scanner QR Code
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
      },
      false
    );

    // Fungsi jika QR berhasil terbaca
    const onScanSuccess = async (decodedText) => {
      scanner.clear(); // Hentikan kamera setelah berhasil
      setScanResult(decodedText);
      setLoading(true);

      try {
        // Contoh pemanggilan ke API Presensi Anda
        // File rute API Anda sepertinya ada di app/api/presensi/route.js
        /*
        const response = await fetch('/api/presensi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_data: decodedText })
        });
        const data = await response.json();
        */
        
        // Simulasi loading API
        setTimeout(() => setLoading(false), 1500);

      } catch (error) {
        console.error("Gagal melakukan presensi", error);
        setLoading(false);
      }
    };

    scanner.render(onScanSuccess, (error) => {
      // Error handling (bisa diabaikan agar console tidak penuh)
    });

    // Cleanup saat komponen di-unmount
    return () => {
      scanner.clear().catch(error => console.error("Gagal mematikan kamera.", error));
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Header Form */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Sistem Presensi</h1>
          <p className="text-blue-100 mt-1">KKN Desa Nambangan 2026</p>
        </div>

        <div className="p-6 text-center">
          {!scanResult ? (
            <>
              <p className="text-gray-600 mb-4 font-medium">Arahkan QR Code Anda ke kamera</p>
              {/* Tempat kamera muncul */}
              <div id="reader" className="w-full rounded-lg overflow-hidden border-2 border-dashed border-blue-400"></div>
            </>
          ) : (
            <div className="flex flex-col items-center py-6">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-b-4 mb-4"></div>
                  <p className="text-gray-600 font-medium">Memproses Presensi...</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Presensi Berhasil!</h2>
                  <p className="text-gray-500 mt-2">Data ID: <span className="font-semibold text-gray-800">{scanResult}</span></p>
                  
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200"
                  >
                    Scan Ulang
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-100 p-4 text-center text-sm text-gray-500">
          Tim II KKN UNDIP &copy; 2026
        </div>
      </div>
    </div>
  );
}