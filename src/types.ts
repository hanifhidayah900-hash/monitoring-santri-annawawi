export type UserRole = 'admin' | 'ustadz' | 'user';

export interface UstadzPermissions {
  canManageAnnouncements: boolean;
  canManageExtracurriculars: boolean;
  assignedClassIds?: number[];
}

export interface Profile {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  role: UserRole;
  permissions: UstadzPermissions;
  created_at: string;
  updated_at: string;
}

export interface PondokClass {
  id: number;
  name: string;
  category: 'Banat' | 'Banin';
  homeroom_ustadz_id: number | null;
  homeroom_ustadz_name?: string | null;
  description: string;
  student_count?: number;
  created_at: string;
}

export interface Student {
  id: number;
  nis: string;
  full_name: string;
  gender: 'L' | 'P';
  birth_place: string;
  birth_date: string;
  address: string;
  photo_url: string;
  class_id: number;
  class_name?: string;
  class_category?: 'Banat' | 'Banin';
  dormitory: string;
  enrollment_year: number;
  status: 'Aktif' | 'Cuti' | 'Lulus' | 'Nonaktif';
  parent_id?: number | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  relationship?: string | null;
  homeroom_ustadz_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TahfidzRecord {
  id: number;
  student_id: number;
  student_name?: string;
  student_nis?: string;
  class_name?: string;
  ustadz_id: number;
  ustadz_name?: string;
  date: string;
  surah: string;
  juz: number;
  start_ayah: number;
  end_ayah: number;
  type: 'Hafalan Baru' | 'Murajaah' | "Tasmi'";
  score: number;
  quality: 'Mumtaz' | 'Jayyid Jiddan' | 'Jayyid' | 'Perlu Bimbingan';
  notes: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name?: string;
  student_nis?: string;
  class_id?: number;
  class_name?: string;
  class_category?: 'Banat' | 'Banin';
  ustadz_id: number;
  ustadz_name?: string;
  date: string;
  session: string;
  status: AttendanceStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ViolationCategory {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface ViolationRecord {
  id: number;
  student_id: number;
  student_name?: string;
  student_nis?: string;
  class_name?: string;
  ustadz_id: number;
  ustadz_name?: string;
  violation_category_id: number;
  category_name?: string;
  date: string;
  time: string;
  title: string;
  description: string;
  severity: 'Ringan' | 'Sedang' | 'Berat';
  coaching_action: string;
  notes: string;
  parent_visible: number;
  created_at: string;
  updated_at: string;
}

export interface CoachingRecord {
  id: number;
  student_id: number;
  student_name?: string;
  class_name?: string;
  ustadz_id: number;
  ustadz_name?: string;
  date: string;
  coaching_type: string;
  notes: string;
  follow_up: string;
  parent_visible: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityPhoto {
  id: number;
  title: string;
  description: string;
  image_url: string;
  category: string;
  class_id: number | null;
  class_name?: string | null;
  activity_date: string;
  uploaded_by: number;
  uploader_name?: string;
  visibility: 'Publik' | 'Wali Santri' | 'Internal';
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  attachment_url: string;
  target_audience: 'Semua' | 'Wali Santri' | 'Ustadz' | 'Internal';
  published_at: string;
  status: 'Diterbitkan' | 'Draf';
  created_by: number;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Extracurricular {
  id: number;
  name: string;
  description: string;
  schedule: string;
  location: string;
  supervisor_id: number | null;
  supervisor_name?: string | null;
  status: 'Aktif' | 'Nonaktif';
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ExtracurricularMember {
  id: number;
  extracurricular_id: number;
  extracurricular_name?: string;
  schedule?: string;
  location?: string;
  supervisor_name?: string;
  student_id: number;
  student_name?: string;
  student_nis?: string;
  class_name?: string;
  joined_at: string;
  status: 'Aktif' | 'Nonaktif';
  notes: string;
}

export interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_name?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}
