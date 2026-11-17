import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'annawawi.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      role TEXT NOT NULL CHECK(role IN ('admin', 'ustadz', 'user')),
      password_hash TEXT NOT NULL,
      permissions_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL CHECK(category IN ('Banat', 'Banin')),
      homeroom_ustadz_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nis TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('L', 'P')),
      birth_place TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      address TEXT NOT NULL,
      photo_url TEXT DEFAULT '',
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
      dormitory TEXT NOT NULL,
      enrollment_year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Cuti', 'Lulus', 'Nonaktif')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parent_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      relationship TEXT NOT NULL DEFAULT 'Orang Tua',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(parent_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS tahfidz_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      ustadz_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
      date TEXT NOT NULL,
      surah TEXT NOT NULL,
      juz INTEGER NOT NULL,
      start_ayah INTEGER NOT NULL,
      end_ayah INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Hafalan Baru', 'Murajaah', 'Tasmi''')),
      score INTEGER NOT NULL,
      quality TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      ustadz_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
      date TEXT NOT NULL,
      session TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, date, session)
    );

    CREATE TABLE IF NOT EXISTS violation_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS violation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      ustadz_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
      violation_category_id INTEGER NOT NULL REFERENCES violation_categories(id) ON DELETE RESTRICT,
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('Ringan', 'Sedang', 'Berat')),
      coaching_action TEXT NOT NULL,
      notes TEXT DEFAULT '',
      parent_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coaching_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      ustadz_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
      date TEXT NOT NULL,
      coaching_type TEXT NOT NULL,
      notes TEXT NOT NULL,
      follow_up TEXT NOT NULL,
      parent_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      activity_date TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
      visibility TEXT NOT NULL DEFAULT 'Wali Santri' CHECK(visibility IN ('Publik', 'Wali Santri', 'Internal')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      attachment_url TEXT DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT 'Semua' CHECK(target_audience IN ('Semua', 'Wali Santri', 'Ustadz', 'Internal')),
      published_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Diterbitkan' CHECK(status IN ('Diterbitkan', 'Draf')),
      created_by INTEGER NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS extracurriculars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      schedule TEXT NOT NULL,
      location TEXT NOT NULL,
      supervisor_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS extracurricular_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extracurricular_id INTEGER NOT NULL REFERENCES extracurriculars(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif')),
      notes TEXT DEFAULT '',
      UNIQUE(extracurricular_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const count = (db.prepare('SELECT COUNT(*) as c FROM profiles').get() as { c: number }).c;
  if (count === 0) {
    seedDatabase();
  }
}

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function seedDatabase() {
  const insertProfile = db.prepare(`
    INSERT INTO profiles (username, full_name, email, phone, avatar_url, role, password_hash, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminHash = bcrypt.hashSync('admin123', 10);
  const ustadzHash = bcrypt.hashSync('ustadz123', 10);
  const waliHash = bcrypt.hashSync('wali123', 10);

  const adminRes = insertProfile.run(
    'admin',
    'Administrator Pondok An-Nawawi',
    'admin@annawawi.sch.id',
    '0812-3456-0001',
    '',
    'admin',
    adminHash,
    JSON.stringify({ canManageAnnouncements: true, canManageExtracurriculars: true })
  );
  const adminId = Number(adminRes.lastInsertRowid);

  const hanifRes = insertProfile.run(
    'hanif hidayatullah',
    'Ustadz Hanif Hidayatullah',
    'hanif@annawawi.sch.id',
    '0812-3456-0002',
    '',
    'ustadz',
    ustadzHash,
    JSON.stringify({ canManageAnnouncements: true, canManageExtracurriculars: true })
  );
  const hanifId = Number(hanifRes.lastInsertRowid);

  const aisyahUstRes = insertProfile.run(
    'aisyah rahmawati',
    'Ustadzah Aisyah Rahmawati',
    'aisyah.ustadzah@annawawi.sch.id',
    '0812-3456-0003',
    '',
    'ustadz',
    ustadzHash,
    JSON.stringify({ canManageAnnouncements: false, canManageExtracurriculars: true })
  );
  const aisyahUstId = Number(aisyahUstRes.lastInsertRowid);

  const ahmadRes = insertProfile.run(
    'ahmad',
    'Bapak Ahmad Fauzi',
    'ahmad@wali.annawawi.sch.id',
    '0813-7788-1001',
    '',
    'user',
    waliHash,
    JSON.stringify({})
  );
  const ahmadId = Number(ahmadRes.lastInsertRowid);

  const sitiRes = insertProfile.run(
    'siti aminah',
    'Ibu Siti Aminah',
    'siti@wali.annawawi.sch.id',
    '0813-7788-1002',
    '',
    'user',
    waliHash,
    JSON.stringify({})
  );
  const sitiId = Number(sitiRes.lastInsertRowid);

  const insertClass = db.prepare(`
    INSERT INTO classes (name, category, homeroom_ustadz_id, description)
    VALUES (?, ?, ?, ?)
  `);

  const c7A = Number(insertClass.run('7A', 'Banat', aisyahUstId, 'Kelas 7A Putri (Banat) — Program Tahfidz & Reguler').lastInsertRowid);
  const c7B = Number(insertClass.run('7B', 'Banat', aisyahUstId, 'Kelas 7B Putri (Banat) — Program Bahasa & Reguler').lastInsertRowid);
  const c7C = Number(insertClass.run('7C', 'Banin', hanifId, 'Kelas 7C Putra (Banin) — Program Tahfidz & Reguler').lastInsertRowid);
  const c7D = Number(insertClass.run('7D', 'Banin', hanifId, 'Kelas 7D Putra (Banin) — Program Bahasa & Reguler').lastInsertRowid);

  const insertStudent = db.prepare(`
    INSERT INTO students (nis, full_name, gender, birth_place, birth_date, address, photo_url, class_id, dormitory, enrollment_year, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoStudents: Array<{
    nis: string;
    name: string;
    gender: 'L' | 'P';
    birthPlace: string;
    birthDate: string;
    address: string;
    classId: number;
    dorm: string;
    parentId?: number;
    rel?: string;
  }> = [
    // 7A Banat
    { nis: 'ANW-2601', name: 'Aisyah Putri Ramadhani (Contoh)', gender: 'P', birthPlace: 'Sleman', birthDate: '2013-05-14', address: 'Jl. Kaliurang KM 9, Sleman', classId: c7A, dorm: 'Asrama Khadijah 01', parentId: ahmadId, rel: 'Ayah Kandung' },
    { nis: 'ANW-2602', name: 'Fatimah Az-Zahra (Contoh)', gender: 'P', birthPlace: 'Purworejo', birthDate: '2013-08-21', address: 'Kec. Kutoarjo, Purworejo', classId: c7A, dorm: 'Asrama Khadijah 01', parentId: sitiId, rel: 'Ibu Kandung' },
    { nis: 'ANW-2603', name: 'Khadijah Nurul Huda (Contoh)', gender: 'P', birthPlace: 'Magelang', birthDate: '2013-03-11', address: 'Mertoyudan, Magelang', classId: c7A, dorm: 'Asrama Khadijah 02' },
    { nis: 'ANW-2604', name: 'Hafshah Salsabila (Contoh)', gender: 'P', birthPlace: 'Kebumen', birthDate: '2013-09-02', address: 'Gombong, Kebumen', classId: c7A, dorm: 'Asrama Khadijah 02' },
    { nis: 'ANW-2605', name: 'Zainab Al-Khansa (Contoh)', gender: 'P', birthPlace: 'Bantul', birthDate: '2013-11-19', address: 'Kasihan, Bantul', classId: c7A, dorm: 'Asrama Khadijah 03' },
    { nis: 'ANW-2606', name: 'Maryam Azzahra (Contoh)', gender: 'P', birthPlace: 'Wonosobo', birthDate: '2013-04-27', address: 'Mojotengah, Wonosobo', classId: c7A, dorm: 'Asrama Khadijah 03' },
    // 7B Banat
    { nis: 'ANW-2607', name: 'Nadia Safitri (Contoh)', gender: 'P', birthPlace: 'Temanggung', birthDate: '2013-06-15', address: 'Parakan, Temanggung', classId: c7B, dorm: 'Asrama Aisyah 01' },
    { nis: 'ANW-2608', name: 'Salma Fitria (Contoh)', gender: 'P', birthPlace: 'Yogyakarta', birthDate: '2013-02-09', address: 'Kotagede, Yogyakarta', classId: c7B, dorm: 'Asrama Aisyah 01' },
    { nis: 'ANW-2609', name: 'Zahira Aulia (Contoh)', gender: 'P', birthPlace: 'Klaten', birthDate: '2013-07-30', address: 'Delanggu, Klaten', classId: c7B, dorm: 'Asrama Aisyah 02' },
    { nis: 'ANW-2610', name: 'Kayla Mufidah (Contoh)', gender: 'P', birthPlace: 'Purwokerto', birthDate: '2013-10-08', address: 'Sokaraja, Banyumas', classId: c7B, dorm: 'Asrama Aisyah 02' },
    { nis: 'ANW-2611', name: 'Rania Jasmine (Contoh)', gender: 'P', birthPlace: 'Semarang', birthDate: '2013-12-03', address: 'Banyumanik, Semarang', classId: c7B, dorm: 'Asrama Aisyah 02' },
    // 7C Banin
    { nis: 'ANW-2612', name: 'Muhammad Zaki Ahmad (Contoh)', gender: 'L', birthPlace: 'Sleman', birthDate: '2013-01-22', address: 'Jl. Kaliurang KM 9, Sleman', classId: c7C, dorm: 'Asrama Abu Bakar 01', parentId: ahmadId, rel: 'Ayah Kandung' },
    { nis: 'ANW-2613', name: 'Abdullah Azzam (Contoh)', gender: 'L', birthPlace: 'Purworejo', birthDate: '2013-04-05', address: 'Kec. Kutoarjo, Purworejo', classId: c7C, dorm: 'Asrama Abu Bakar 01', parentId: sitiId, rel: 'Ibu Kandung' },
    { nis: 'ANW-2614', name: 'Umar Al-Faruq (Contoh)', gender: 'L', birthPlace: 'Kebumen', birthDate: '2013-06-18', address: 'Prembun, Kebumen', classId: c7C, dorm: 'Asrama Abu Bakar 02' },
    { nis: 'ANW-2615', name: 'Ali Zainal Abidin (Contoh)', gender: 'L', birthPlace: 'Magelang', birthDate: '2013-08-12', address: 'Muntilan, Magelang', classId: c7C, dorm: 'Asrama Abu Bakar 02' },
    { nis: 'ANW-2616', name: 'Yusuf Al-Mansur (Contoh)', gender: 'L', birthPlace: 'Solo', birthDate: '2013-09-25', address: 'Laweyan, Surakarta', classId: c7C, dorm: 'Asrama Abu Bakar 03' },
    { nis: 'ANW-2617', name: 'Ibrahim Khalil (Contoh)', gender: 'L', birthPlace: 'Cilacap', birthDate: '2013-03-29', address: 'Majenang, Cilacap', classId: c7C, dorm: 'Asrama Abu Bakar 03' },
    // 7D Banin
    { nis: 'ANW-2618', name: 'Bilal Habibi (Contoh)', gender: 'L', birthPlace: 'Kulon Progo', birthDate: '2013-05-07', address: 'Wates, Kulon Progo', classId: c7D, dorm: 'Asrama Umar 01' },
    { nis: 'ANW-2619', name: 'Salman Al-Farisi (Contoh)', gender: 'L', birthPlace: 'Bantul', birthDate: '2013-07-14', address: 'Sewon, Bantul', classId: c7D, dorm: 'Asrama Umar 01' },
    { nis: 'ANW-2620', name: 'Hasan Al-Banna (Contoh)', gender: 'L', birthPlace: 'Pekalongan', birthDate: '2013-10-17', address: 'Wiradesa, Pekalongan', classId: c7D, dorm: 'Asrama Umar 02' },
    { nis: 'ANW-2621', name: 'Husain Maulana (Contoh)', gender: 'L', birthPlace: 'Tegal', birthDate: '2013-11-04', address: 'Slawi, Tegal', classId: c7D, dorm: 'Asrama Umar 02' },
    { nis: 'ANW-2622', name: 'Tariq Ramadhan (Contoh)', gender: 'L', birthPlace: 'Purbalingga', birthDate: '2013-02-23', address: 'Bobotsari, Purbalingga', classId: c7D, dorm: 'Asrama Umar 02' },
  ];

  const insertParentLink = db.prepare(`
    INSERT INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, ?)
  `);

  const studentIds: Array<{ id: number; classId: number; gender: 'L' | 'P' }> = [];
  for (const s of demoStudents) {
    const res = insertStudent.run(
      s.nis,
      s.name,
      s.gender,
      s.birthPlace,
      s.birthDate,
      s.address,
      '',
      s.classId,
      s.dorm,
      2026,
      'Aktif'
    );
    const sid = Number(res.lastInsertRowid);
    studentIds.push({ id: sid, classId: s.classId, gender: s.gender });
    if (s.parentId) {
      insertParentLink.run(s.parentId, sid, s.rel || 'Orang Tua');
    }
  }

  // Seed Attendance Records across all 4 classes for today and past 6 days
  const insertAttendance = db.prepare(`
    INSERT INTO attendance_records (student_id, ustadz_id, date, session, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const statuses: Array<'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = ['Hadir', 'Hadir', 'Hadir', 'Hadir', 'Hadir', 'Hadir', 'Hadir', 'Izin', 'Sakit', 'Alpa'];
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const dStr = isoDaysAgo(dayOffset);
    studentIds.forEach((st, idx) => {
      const ustId = st.gender === 'P' ? aisyahUstId : hanifId;
      // KBM Pagi for all classes
      let status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' = 'Hadir';
      let note = 'Mengikuti KBM pagi tepat waktu';
      if (dayOffset === 0 && idx === 3) {
        status = 'Sakit';
        note = 'Istirahat di UKS pondok';
      } else if (dayOffset === 0 && idx === 14) {
        status = 'Izin';
        note = 'Izin urusan keluarga';
      } else if (dayOffset === 0 && idx === 19) {
        status = 'Alpa';
        note = 'Terlambat belum melapor ke piket';
      } else if (dayOffset > 0) {
        const pick = statuses[(idx + dayOffset) % statuses.length];
        status = pick;
        note =
          pick === 'Hadir'
            ? 'Hadir tertib'
            : pick === 'Izin'
              ? 'Izin resmi wali kamar'
              : pick === 'Sakit'
                ? 'Perawatan kesehatan asrama'
                : 'Tidak hadir tanpa keterangan';
      }
      insertAttendance.run(st.id, ustId, dStr, 'KBM Pagi', status, note);

      // Subuh & Tahfidz session for today and yesterday
      if (dayOffset <= 1) {
        const subuhStatus = dayOffset === 0 && idx === 3 ? 'Sakit' : 'Hadir';
        insertAttendance.run(
          st.id,
          ustId,
          dStr,
          'Subuh & Tahfidz',
          subuhStatus,
          subuhStatus === 'Hadir' ? 'Shalat jamaah & halaqah subuh' : 'Surat keterangan istirahat'
        );
      }
    });
  }

  // Seed Tahfidz Records
  const insertTahfidz = db.prepare(`
    INSERT INTO tahfidz_records (student_id, ustadz_id, date, surah, juz, start_ayah, end_ayah, type, score, quality, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tahfidzSeed = [
    [studentIds[0].id, aisyahUstId, isoDaysAgo(6), 'An-Naba', 30, 1, 20, 'Hafalan Baru', 92, 'Mumtaz', 'Tajwid dan makhraj sangat baik'],
    [studentIds[0].id, aisyahUstId, isoDaysAgo(3), 'An-Naba', 30, 21, 40, 'Hafalan Baru', 94, 'Mumtaz', 'Lancar tanpa teguran'],
    [studentIds[0].id, aisyahUstId, isoDaysAgo(0), 'An-Naziat', 30, 1, 26, 'Hafalan Baru', 90, 'Jayyid Jiddan', 'Perhatikan panjang mad pada ayat 18'],
    [studentIds[1].id, aisyahUstId, isoDaysAgo(2), 'Al-Mulk', 29, 1, 15, 'Murajaah', 88, 'Jayyid Jiddan', 'Murajaah juz 29 stabil'],
    [studentIds[6].id, aisyahUstId, isoDaysAgo(1), 'Abasa', 30, 1, 42, "Tasmi'", 95, 'Mumtaz', 'Tasmi sekali duduk lancar'],
    [studentIds[11].id, hanifId, isoDaysAgo(5), 'Al-Muzzammil', 29, 1, 20, 'Hafalan Baru', 86, 'Jayyid Jiddan', 'Irama tartil terjaga'],
    [studentIds[11].id, hanifId, isoDaysAgo(2), 'Al-Muddatstsir', 29, 1, 30, 'Hafalan Baru', 89, 'Jayyid Jiddan', 'Peningkatan kelancaran sangat baik'],
    [studentIds[11].id, hanifId, isoDaysAgo(0), 'Al-Qiyamah', 29, 1, 40, 'Murajaah', 93, 'Mumtaz', 'Setoran murajaah sangat lancar'],
    [studentIds[12].id, hanifId, isoDaysAgo(1), 'Al-Insan', 29, 1, 31, 'Hafalan Baru', 84, 'Jayyid', 'Perlu pengulangan ayat 15-20'],
    [studentIds[17].id, hanifId, isoDaysAgo(0), 'Al-Mursalat', 29, 1, 25, 'Hafalan Baru', 87, 'Jayyid Jiddan', 'Suara jelas dan tartil'],
  ];
  for (const row of tahfidzSeed) {
    insertTahfidz.run(...row);
  }

  // Seed Violation Categories
  const insertVCat = db.prepare(`INSERT INTO violation_categories (name, description) VALUES (?, ?)`);
  const vcDisiplin = Number(insertVCat.run('Kedisiplinan', 'Ketepatan waktu kegiatan, apel, dan ibadah berjamaah').lastInsertRowid);
  const vcKetertiban = Number(insertVCat.run('Ketertiban', 'Kepatuhan terhadap adab dan tata tertib lingkungan pondok').lastInsertRowid);
  const vcKebersihan = Number(insertVCat.run('Kebersihan', 'Kerapian lemari, ranjang, dan piket kebersihan asrama').lastInsertRowid);
  const vcAsrama = Number(insertVCat.run('Tata Tertib Asrama', 'Aturan jam malam, perizinan keluar, dan penggunaan barang').lastInsertRowid);
  const vcBelajar = Number(insertVCat.run('Kegiatan Belajar', 'Kehadiran dan kelengkapan perlengkapan belajar di kelas').lastInsertRowid);

  // Seed Violation Records
  const insertViolation = db.prepare(`
    INSERT INTO violation_records (student_id, ustadz_id, violation_category_id, date, time, title, description, severity, coaching_action, notes, parent_visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertViolation.run(
    studentIds[11].id,
    hanifId,
    vcDisiplin,
    isoDaysAgo(4),
    '04:50',
    'Terlambat Jamaah Subuh',
    'Santri datang terlambat 7 menit saat iqamah shalat Subuh berjamaah di masjid.',
    'Ringan',
    'Dinasihati secara persuasif dan membaca istighfar serta tilawah 1 halaman.',
    'Sudah menunjukkan perbaikan disiplin pada hari berikutnya.',
    1
  );
  insertViolation.run(
    studentIds[0].id,
    aisyahUstId,
    vcKebersihan,
    isoDaysAgo(5),
    '07:15',
    'Kerapian Loker Asrama',
    'Penataan buku dan seragam di loker asrama belum dirapikan sebelum berangkat sekolah.',
    'Ringan',
    'Pendampingan merapikan loker oleh musyrifah asrama.',
    'Orang tua dapat mengingatkan pembiasaan rapi dari rumah saat kunjungan.',
    1
  );
  insertViolation.run(
    studentIds[19].id,
    hanifId,
    vcAsrama,
    isoDaysAgo(1),
    '22:15',
    'Belum Tidur Melewati Jam Malam',
    'Masih mengobrol di koridor asrama setelah bel tidur malam pukul 22:00 WIB.',
    'Sedang',
    'Teguran lisan tertulis dan tugas piket kebersihan teras masjid.',
    'Catatan evaluasi internal piket asrama.',
    0
  );
  insertViolation.run(
    studentIds[14].id,
    hanifId,
    vcBelajar,
    isoDaysAgo(2),
    '08:00',
    'Tidak Membawa Kitab Nahwu',
    'Lupa membawa buku catatan dan kitab pada jam pelajaran pagi.',
    'Ringan',
    'Meminjam dari perpustakaan kelas dan membuat ringkasan materi.',
    'Perlu pengecekan jadwal malam sebelum tidur.',
    1
  );

  // Seed Coaching Records
  const insertCoaching = db.prepare(`
    INSERT INTO coaching_records (student_id, ustadz_id, date, coaching_type, notes, follow_up, parent_visible)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertCoaching.run(
    studentIds[0].id,
    aisyahUstId,
    isoDaysAgo(2),
    'Pembinaan Hafalan & Kemandirian',
    'Ananda menunjukkan semangat tinggi dalam halaqah tahfidz dan aktif membantu teman sekamar.',
    'Diarahkan untuk persiapan Tasmi Juz 30 akhir bulan ini.',
    1
  );
  insertCoaching.run(
    studentIds[11].id,
    hanifId,
    isoDaysAgo(1),
    'Pembinaan Kedisiplinan Waktu',
    'Setelah diingatkan terkait kedisiplinan Subuh, ananda sudah bangun lebih awal dan hadir 10 menit sebelum adzan.',
    'Pertahankan konsistensi dan lanjutkan target hafalan Juz 29.',
    1
  );
  insertCoaching.run(
    studentIds[19].id,
    hanifId,
    isoDaysAgo(0),
    'Konseling Khusus Asrama',
    'Pendekatan personal agar lebih mudah beradaptasi dengan jadwal istirahat malam pondok.',
    'Pemantauan lanjutan selama 1 minggu oleh wali asrama.',
    0
  );

  // Seed Activity Photos
  const insertPhoto = db.prepare(`
    INSERT INTO activity_photos (title, description, image_url, category, class_id, activity_date, uploaded_by, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPhoto.run(
    'Halaqah Tahfidz Pagi di Masjid Utama',
    'Kegiatan setoran hafalan Al-Qur’an santri setelah shalat Subuh bersama pembimbing tahfidz.',
    '/src/assets/images/kegiatan_tahfidz_quran_1794894201694.jpg',
    'Kegiatan tahfidz',
    c7C,
    isoDaysAgo(1),
    hanifId,
    'Publik'
  );
  insertPhoto.run(
    'Suasana Belajar Aktif Kelas 7',
    'Pembelajaran terpadu kurikulum pesantren modern dan sains dengan pendampingan aktif ustadz/ustadzah.',
    '/src/assets/images/kegiatan_belajar_kelas_1794894201836.jpg',
    'Kegiatan belajar',
    c7A,
    isoDaysAgo(2),
    aisyahUstId,
    'Publik'
  );
  insertPhoto.run(
    'Latihan Kepanduan & Pramuka Mingguan',
    'Melatih jiwa patriotik, kepemimpinan, dan kerja sama tim santri di lapangan utama Pondok Pesantren Modern An-Nawawi.',
    '/src/assets/images/kegiatan_ekstra_pramuka_1794894203598.jpg',
    'Kegiatan ekstrakurikuler',
    null,
    isoDaysAgo(3),
    hanifId,
    'Publik'
  );
  insertPhoto.run(
    'Lingkungan Kampus Pondok Pesantren Modern An-Nawawi',
    'Suasana sore hari di lingkungan asrama dan gedung pendidikan yang asri, bersih, dan kondusif.',
    '/src/assets/images/hero_pesantren_annawawi_1794894202062.jpg',
    'Kegiatan pondok lainnya',
    null,
    isoDaysAgo(4),
    adminId,
    'Publik'
  );

  // Seed Announcements
  const insertAnn = db.prepare(`
    INSERT INTO announcements (title, content, category, attachment_url, target_audience, published_at, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAnn.run(
    'Jadwal Ujian Tasmi’ Juz 30 dan Juz 29 Semester Ganjil',
    'Diberitahukan kepada seluruh santri dan wali santri kelas 7A, 7B, 7C, dan 7D bahwa pelaksanaan Ujian Tasmi’ akan dilaksanakan pada tanggal 25–28 bulan ini di Masjid Utama An-Nawawi. Mohon dukungan doa dan murajaah santri.',
    'Informasi tahfidz',
    '',
    'Semua',
    isoDaysAgo(1),
    'Diterbitkan',
    hanifId
  );
  insertAnn.run(
    'Ketentuan Kunjungan Wali Santri & Pembayaran Administrasi',
    'Kunjungan resmi wali santri dijadwalkan pada hari Ahad pukul 08.30–15.00 WIB. Wali santri dimohon membawa kartu identitas wali dan menjaga ketertiban area asrama.',
    'Informasi wali santri',
    '',
    'Wali Santri',
    isoDaysAgo(2),
    'Diterbitkan',
    adminId
  );
  insertAnn.run(
    'Rapat Evaluasi Kedisiplinan Musyrif & Wali Kelas',
    'Seluruh ustadz dan ustadzah pengampu kelas 7A–7D dimohon hadir pada rapat evaluasi bulanan di ruang rapat pimpinan setelah Ashar.',
    'Jadwal kegiatan',
    '',
    'Ustadz',
    isoDaysAgo(0),
    'Diterbitkan',
    adminId
  );

  // Seed Extracurriculars
  const insertEkstra = db.prepare(`
    INSERT INTO extracurriculars (name, description, schedule, location, supervisor_id, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const exPramuka = Number(insertEkstra.run('Pramuka', 'Pembinaan karakter disiplin, kepemimpinan, tali-temali, dan jiwa patriotik santri.', 'Sabtu, 15:30 - 17:00 WIB', 'Lapangan Utama An-Nawawi', hanifId, 'Aktif').lastInsertRowid);
  const exSilat = Number(insertEkstra.run('Pencak Silat', 'Seni bela diri tradisional untuk kesehatan fisik, ketangkasan, dan sportivitas.', 'Selasa & Kamis, 16:00 - 17:15 WIB', 'Pendopo Olahraga', hanifId, 'Aktif').lastInsertRowid);
  const exKaligrafi = Number(insertEkstra.run('Kaligrafi', 'Pengembangan seni tulis indah Arab (Khat Naskhi, Tsuluts, Diwani).', 'Rabu, 15:45 - 17:00 WIB', 'Ruang Seni & Bahasa', aisyahUstId, 'Aktif').lastInsertRowid);
  const exMuhadharah = Number(insertEkstra.run('Muhadharah', 'Latihan pidato tiga bahasa (Indonesia, Arab, Inggris) untuk melatih retorika dakwah.', 'Kamis Malam, 20:00 - 21:30 WIB', 'Aula Utama', hanifId, 'Aktif').lastInsertRowid);
  const exHadrah = Number(insertEkstra.run('Hadrah', 'Seni musik islami shalawat dan rebana untuk melestarikan budaya pesantren.', 'Jumat, 14:00 - 15:30 WIB', 'Serambi Masjid', aisyahUstId, 'Aktif').lastInsertRowid);
  const exArab = Number(insertEkstra.run('Bahasa Arab', 'Klub percakapan aktif (Muhadatsah) dan pengayaan kosakata harian.', 'Senin, 15:45 - 17:00 WIB', 'Ruang Kelas 7A', aisyahUstId, 'Aktif').lastInsertRowid);

  // Seed Extracurricular Members
  const insertEkstraMember = db.prepare(`
    INSERT INTO extracurricular_members (extracurricular_id, student_id, joined_at, status, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertEkstraMember.run(exKaligrafi, studentIds[0].id, isoDaysAgo(30), 'Aktif', 'Perkembangan khat Naskhi sangat rapi');
  insertEkstraMember.run(exArab, studentIds[0].id, isoDaysAgo(30), 'Aktif', 'Aktif berbicara bahasa Arab di asrama');
  insertEkstraMember.run(exPramuka, studentIds[11].id, isoDaysAgo(30), 'Aktif', 'Menjabat sebagai ketua regu putra');
  insertEkstraMember.run(exMuhadharah, studentIds[11].id, isoDaysAgo(30), 'Aktif', 'Sudah tampil pidato bahasa Arab minggu lalu');
  insertEkstraMember.run(exSilat, studentIds[12].id, isoDaysAgo(30), 'Aktif', 'Mengikuti latihan fisik rutin');
  insertEkstraMember.run(exHadrah, studentIds[1].id, isoDaysAgo(30), 'Aktif', 'Vokalis tim hadrah putri');
  insertEkstraMember.run(exPramuka, studentIds[6].id, isoDaysAgo(30), 'Aktif', 'Anggota aktif regu putri');

  // Seed System Settings
  const insertSetting = db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`);
  insertSetting.run('pondok_name', 'Pondok Pesantren Modern An-Nawawi');
  insertSetting.run('academic_year', '2026/2027');
  insertSetting.run('semester', 'Ganjil');
  insertSetting.run('address', 'Jl. Pendidikan Pesantren No. 01, Purworejo, Jawa Tengah');
  insertSetting.run('phone', '(0275) 321-456');

  // Seed Initial Audit Log
  db.prepare(`INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`).run(
    adminId,
    'SEED_INITIAL',
    'system',
    '0',
    'Inisialisasi database dan data contoh Pondok Pesantren Modern An-Nawawi'
  );
}
