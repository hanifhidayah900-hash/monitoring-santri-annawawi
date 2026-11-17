-- Migration 001: Skema Database Sistem Monitoring Santri Pondok Pesantren Modern An-Nawawi
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin', 'ustadz', 'user')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CLASSES (7A, 7B Banat; 7C, 7D Banin; Kondisional Admin)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('Banat', 'Banin')),
  homeroom_ustadz_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. STUDENTS
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nis TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('L', 'P')),
  birth_place TEXT NOT NULL,
  birth_date DATE NOT NULL,
  address TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  dormitory TEXT NOT NULL,
  enrollment_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Cuti', 'Lulus', 'Nonaktif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PARENT_STUDENTS
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'Orang Tua',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

-- 5. TAHFIDZ_RECORDS
CREATE TABLE IF NOT EXISTS public.tahfidz_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  ustadz_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  surah TEXT NOT NULL,
  juz INTEGER NOT NULL,
  start_ayah INTEGER NOT NULL,
  end_ayah INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Hafalan Baru', 'Murajaah', 'Tasmi''')),
  score INTEGER NOT NULL,
  quality TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ATTENDANCE_RECORDS (Mencegah absensi ganda per santri + tanggal + sesi)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  ustadz_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  session TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, date, session)
);

-- 7. VIOLATION_CATEGORIES & VIOLATION_RECORDS
CREATE TABLE IF NOT EXISTS public.violation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.violation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  ustadz_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  violation_category_id UUID NOT NULL REFERENCES public.violation_categories(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  time TEXT DEFAULT '',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Ringan', 'Sedang', 'Berat')),
  coaching_action TEXT NOT NULL,
  notes TEXT DEFAULT '',
  parent_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. COACHING_RECORDS
CREATE TABLE IF NOT EXISTS public.coaching_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  ustadz_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  coaching_type TEXT NOT NULL,
  notes TEXT NOT NULL,
  follow_up TEXT NOT NULL,
  parent_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ACTIVITY_PHOTOS
CREATE TABLE IF NOT EXISTS public.activity_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  activity_date DATE NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  visibility TEXT NOT NULL DEFAULT 'Wali Santri' CHECK (visibility IN ('Publik', 'Wali Santri', 'Internal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  attachment_url TEXT DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT 'Semua' CHECK (target_audience IN ('Semua', 'Wali Santri', 'Ustadz', 'Internal')),
  published_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Diterbitkan' CHECK (status IN ('Diterbitkan', 'Draf')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. EXTRACURRICULARS & MEMBERS
CREATE TABLE IF NOT EXISTS public.extracurriculars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  schedule TEXT NOT NULL,
  location TEXT NOT NULL,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.extracurricular_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extracurricular_id UUID NOT NULL REFERENCES public.extracurriculars(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  notes TEXT DEFAULT '',
  UNIQUE (extracurricular_id, student_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tahfidz_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracurriculars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracurricular_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Orang tua hanya baca anak sendiri; Admin & Ustadz kelola sesuai peran
CREATE POLICY "Students read policy" ON public.students FOR SELECT USING (
  public.current_user_role() IN ('admin', 'ustadz')
  OR id IN (SELECT student_id FROM public.parent_students WHERE parent_id = auth.uid())
);
CREATE POLICY "Students admin write" ON public.students FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "Tahfidz read policy" ON public.tahfidz_records FOR SELECT USING (
  public.current_user_role() IN ('admin', 'ustadz')
  OR student_id IN (SELECT student_id FROM public.parent_students WHERE parent_id = auth.uid())
);
CREATE POLICY "Tahfidz write policy" ON public.tahfidz_records FOR INSERT WITH CHECK (public.current_user_role() IN ('admin', 'ustadz'));
CREATE POLICY "Tahfidz update policy" ON public.tahfidz_records FOR UPDATE USING (public.current_user_role() IN ('admin', 'ustadz'));

CREATE POLICY "Attendance read policy" ON public.attendance_records FOR SELECT USING (
  public.current_user_role() IN ('admin', 'ustadz')
  OR student_id IN (SELECT student_id FROM public.parent_students WHERE parent_id = auth.uid())
);
CREATE POLICY "Attendance write policy" ON public.attendance_records FOR INSERT WITH CHECK (public.current_user_role() IN ('admin', 'ustadz'));
CREATE POLICY "Attendance update policy" ON public.attendance_records FOR UPDATE USING (public.current_user_role() IN ('admin', 'ustadz'));

CREATE POLICY "Violations read policy" ON public.violation_records FOR SELECT USING (
  public.current_user_role() IN ('admin', 'ustadz')
  OR (parent_visible = TRUE AND student_id IN (SELECT student_id FROM public.parent_students WHERE parent_id = auth.uid()))
);
CREATE POLICY "Violations write policy" ON public.violation_records FOR INSERT WITH CHECK (public.current_user_role() IN ('admin', 'ustadz'));
CREATE POLICY "Violations update policy" ON public.violation_records FOR UPDATE USING (public.current_user_role() IN ('admin', 'ustadz'));

-- Profiles: user tidak boleh mengubah role dirinya sendiri
CREATE POLICY "Profile self read" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.current_user_role() IN ('admin', 'ustadz'));
CREATE POLICY "Profile self update no role change" ON public.profiles FOR UPDATE USING (id = auth.uid())
  WITH CHECK (role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
