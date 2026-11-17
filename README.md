# Monitoring Santri — Pondok Pesantren Modern An-Nawawi

Sistem Monitoring Kedisiplinan dan Aktivitas Santri Berbasis Web untuk **Pondok Pesantren Modern An-Nawawi**.

## Fitur Utama

1. **Halaman Profil Pondok Pesantren Modern An-Nawawi** (`/`):
   - Identitas resmi & logo Pondok Pesantren Modern An-Nawawi
   - Visi & Misi Pondok Pesantren Modern An-Nawawi
   - Struktur kelas (7A & 7B Banat, 7C & 7D Banin, serta kelas tambahan kondisional)
   - Galeri dokumentasi kegiatan dan pengumuman publik
2. **Autentikasi & Tiga Hak Akses (Role-Based Access Control)**:
   - **Admin** (`admin` / `admin123`): Kelola penuh santri, kelas kondisional, ustadz/ustadzah (beserta izin akses), orang tua/wali, tahfidz, absensi, pelanggaran, dokumentasi, pengumuman, ekstrakurikuler, laporan CSV/cetak, dan pengaturan sistem.
   - **Ustadz / Ustadzah** (`hanif hidayatullah` / `ustadz123`): Input absensi per kelas, input tahfidz, catat pelanggaran, catatan pembinaan, unggah foto dokumentasi, serta kelola pengumuman/ekstrakurikuler sesuai izin admin.
   - **Orang Tua / Wali** (`ahmad` / `wali123`): Mode **Baca-Saja (Read-Only)** khusus untuk melihat profil, tahfidz, absensi, pembinaan, foto kegiatan, pengumuman, dan ekstrakurikuler anak yang terhubung dengan akun wali (dilindungi pada level API backend dan UI).
3. **Absensi Per Kelas Anti-Duplikasi**:
   - Pengisian absensi massal per kelas (`7A`, `7B`, `7C`, `7D`, dan kelas baru) per sesi (`KBM Pagi`, `Subuh & Tahfidz`, `KBM Siang`, `Kajian Malam`) dengan `UNIQUE(student_id, date, session)`.

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Aplikasi berjalan pada `http://localhost:3000` dengan database SQLite persisten di `data/annawawi.db`.

## Panduan Deployment & Integrasi Supabase / Vercel

1. Upload repository ini ke GitHub.
2. Untuk produksi full-stack Node.js + SQLite (atau Cloud Run / Railway / Render), gunakan perintah build `npm run build` dan start `npm start`.
3. Untuk migrasi ke Supabase PostgreSQL + Vercel:
   - Jalankan SQL pada `supabase/migrations/001_initial_schema.sql` dan `supabase/seed.sql` di SQL Editor Supabase.
   - Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada Environment Variables proyek di Vercel.
   - Jangan pernah menyimpan `SUPABASE_SERVICE_ROLE_KEY` pada kode frontend.
