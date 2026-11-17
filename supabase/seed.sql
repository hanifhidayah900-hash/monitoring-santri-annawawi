-- Seed Data Referensi Pondok Pesantren Modern An-Nawawi (Supabase)
INSERT INTO public.classes (name, category, description) VALUES
  ('7A', 'Banat', 'Kelas 7A Putri (Banat) — Program Tahfidz & Reguler'),
  ('7B', 'Banat', 'Kelas 7B Putri (Banat) — Program Bahasa & Reguler'),
  ('7C', 'Banin', 'Kelas 7C Putra (Banin) — Program Tahfidz & Reguler'),
  ('7D', 'Banin', 'Kelas 7D Putra (Banin) — Program Bahasa & Reguler')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.violation_categories (name, description) VALUES
  ('Kedisiplinan', 'Ketepatan waktu kegiatan, apel, dan ibadah berjamaah'),
  ('Ketertiban', 'Kepatuhan terhadap adab dan tata tertib lingkungan pondok'),
  ('Kebersihan', 'Kerapian lemari, ranjang, dan piket kebersihan asrama'),
  ('Tata Tertib Asrama', 'Aturan jam malam, perizinan keluar, dan penggunaan barang'),
  ('Kegiatan Belajar', 'Kehadiran dan kelengkapan perlengkapan belajar di kelas')
ON CONFLICT (name) DO NOTHING;
