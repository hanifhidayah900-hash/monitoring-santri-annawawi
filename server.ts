import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './src/server/db.ts';

initDatabase();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'annawawi-monitoring-santri-secret-key-2026';

const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'ustadz' | 'user';
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

function getProfileById(id: number) {
  const row = db
    .prepare(
      `SELECT id, username, full_name, email, phone, avatar_url, role, permissions_json, created_at, updated_at
       FROM profiles WHERE id = ?`
    )
    .get(id) as any;
  if (!row) return null;
  return {
    ...row,
    permissions: JSON.parse(row.permissions_json || '{}'),
  };
}

function logAudit(actorId: number | null, action: string, entityType: string, entityId: string | number | bigint, details: string) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`
    ).run(actorId, action, entityType, String(entityId), details);
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

function getLinkedStudentIds(parentId: number): number[] {
  const rows = db
    .prepare(`SELECT student_id FROM parent_students WHERE parent_id = ?`)
    .all(parentId) as Array<{ student_id: number }>;
  return rows.map((r) => r.student_id);
}

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi tidak valid. Silakan masuk kembali.' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    const profile = getProfileById(decoded.id);
    if (!profile) {
      return res.status(401).json({ error: 'Akun tidak ditemukan.' });
    }
    req.user = { id: profile.id, username: profile.username, role: profile.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Token kedaluwarsa atau tidak valid.' });
  }
};

const requireRole = (roles: Array<'admin' | 'ustadz' | 'user'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error:
          req.user.role === 'user'
            ? 'Akses ditolak: Akun Orang Tua/Wali hanya memiliki hak akses baca (Read-Only).'
            : 'Akses ditolak: Anda tidak memiliki izin untuk aksi ini.',
      });
    }
    next();
  };
};

// ==================== PUBLIC ROUTES ====================
app.get('/api/public/summary', (_req, res) => {
  try {
    const studentCount = (db.prepare(`SELECT COUNT(*) as c FROM students WHERE status = 'Aktif'`).get() as any).c;
    const classRows = db
      .prepare(
        `SELECT c.id, c.name, c.category, c.description, COUNT(s.id) as student_count
         FROM classes c LEFT JOIN students s ON s.class_id = c.id AND s.status = 'Aktif'
         GROUP BY c.id ORDER BY c.name ASC`
      )
      .all();
    const ustadzCount = (db.prepare(`SELECT COUNT(*) as c FROM profiles WHERE role = 'ustadz'`).get() as any).c;
    const ekstraCount = (db.prepare(`SELECT COUNT(*) as c FROM extracurriculars WHERE status = 'Aktif'`).get() as any).c;
    const photos = db
      .prepare(
        `SELECT p.id, p.title, p.description, p.image_url, p.category, p.activity_date, pr.full_name as uploader_name
         FROM activity_photos p JOIN profiles pr ON pr.id = p.uploaded_by
         WHERE p.visibility = 'Publik'
         ORDER BY p.activity_date DESC, p.id DESC LIMIT 6`
      )
      .all();
    const announcements = db
      .prepare(
        `SELECT a.id, a.title, a.content, a.category, a.published_at, pr.full_name as author_name
         FROM announcements a JOIN profiles pr ON pr.id = a.created_by
         WHERE a.status = 'Diterbitkan' AND a.target_audience = 'Semua'
         ORDER BY a.published_at DESC, a.id DESC LIMIT 4`
      )
      .all();
    res.json({
      stats: { studentCount, ustadzCount, classCount: classRows.length, ekstraCount },
      classes: classRows,
      photos,
      announcements,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat ringkasan profil pondok.' });
  }
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password, expectedRole } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email dan password wajib diisi.' });
    }
    const cleanId = String(identifier).trim().toLowerCase();
    const user = db
      .prepare(
        `SELECT * FROM profiles WHERE LOWER(username) = ? OR LOWER(email) = ?`
      )
      .get(cleanId, cleanId) as any;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Username/email atau password salah.' });
    }

    if (expectedRole && user.role !== expectedRole) {
      const roleLabels: Record<string, string> = {
        admin: 'Admin',
        ustadz: 'Ustadz/Ustadzah',
        user: 'Orang Tua/Wali',
      };
      return res.status(403).json({
        error: `Akun ini terdaftar sebagai ${roleLabels[user.role] || user.role}, bukan ${roleLabels[expectedRole] || expectedRole}. Silakan pilih jenis akun yang sesuai.`,
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const profile = getProfileById(user.id);
    logAudit(user.id, 'LOGIN', 'profiles', user.id, `Masuk sebagai ${user.role}`);
    res.json({ token, user: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan saat proses login.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  const profile = getProfileById(req.user!.id);
  let children: any[] = [];
  if (profile.role === 'user') {
    children = db
      .prepare(
        `SELECT s.*, c.name as class_name, c.category as class_category, ps.relationship,
                u.full_name as homeroom_ustadz_name
         FROM students s
         JOIN parent_students ps ON ps.student_id = s.id
         JOIN classes c ON c.id = s.class_id
         LEFT JOIN profiles u ON u.id = c.homeroom_ustadz_id
         WHERE ps.parent_id = ?
         ORDER BY s.full_name ASC`
      )
      .all(profile.id);
  }
  res.json({ user: profile, children });
});

app.put('/api/profile/me', requireAuth, (req: AuthRequest, res) => {
  try {
    const { full_name, phone, avatar_url, current_password, new_password } = req.body;
    const current = db.prepare(`SELECT * FROM profiles WHERE id = ?`).get(req.user!.id) as any;
    if (!current) return res.status(404).json({ error: 'Profil tidak ditemukan.' });

    let nextPasswordHash = current.password_hash;
    if (new_password) {
      if (!current_password || !bcrypt.compareSync(current_password, current.password_hash)) {
        return res.status(400).json({ error: 'Password saat ini tidak sesuai.' });
      }
      if (String(new_password).length < 6) {
        return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      }
      nextPasswordHash = bcrypt.hashSync(new_password, 10);
    }

    db.prepare(
      `UPDATE profiles SET full_name = ?, phone = ?, avatar_url = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      full_name?.trim() || current.full_name,
      phone !== undefined ? phone : current.phone,
      avatar_url !== undefined ? avatar_url : current.avatar_url,
      nextPasswordHash,
      req.user!.id
    );

    logAudit(req.user!.id, 'UPDATE_PROFILE', 'profiles', req.user!.id, 'Memperbarui profil akun pribadi');
    res.json({ user: getProfileById(req.user!.id), message: 'Profil berhasil diperbarui.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
});

// ==================== UPLOAD IMAGE ====================
app.post('/api/upload', requireAuth, (req: AuthRequest, res) => {
  try {
    const { imageData, filename } = req.body;
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'Data gambar tidak valid.' });
    }
    const match = imageData.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Format gambar harus PNG, JPG, atau WEBP.' });
    }
    const ext = match[1].split('/')[1].replace('jpeg', 'jpg');
    const safeName = (filename || 'upload').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'img';
    const outName = `${safeName}_${Date.now()}.${ext}`;
    const outPath = path.join(uploadsDir, outName);
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 6 * 1024 * 1024) {
      return res.status(400).json({ error: 'Ukuran gambar maksimal 6 MB.' });
    }
    fs.writeFileSync(outPath, buffer);
    res.json({ url: `/uploads/${outName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengunggah gambar.' });
  }
});

// ==================== DASHBOARD SUMMARY ====================
app.get('/api/dashboard/summary', requireAuth, (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const role = req.user!.role;

    if (role === 'user') {
      const childIds = getLinkedStudentIds(req.user!.id);
      const requestedStudentId = req.query.studentId ? Number(req.query.studentId) : childIds[0];
      if (!childIds.length) {
        return res.json({
          children: [],
          selectedStudent: null,
          stats: { tahfidzCount: 0, attendanceRate: 0, hadirCount: 0, absentCount: 0, violationCount: 0, ekstraCount: 0 },
          attendanceTrend: [],
          tahfidzTrend: [],
          recentActivities: [],
        });
      }
      if (requestedStudentId && !childIds.includes(requestedStudentId)) {
        return res.status(403).json({ error: 'Anda tidak berhak melihat data santri lain.' });
      }
      const targetId = requestedStudentId || childIds[0];
      const children = db
        .prepare(
          `SELECT s.*, c.name as class_name, c.category as class_category, ps.relationship,
                  u.full_name as homeroom_ustadz_name
           FROM students s
           JOIN parent_students ps ON ps.student_id = s.id
           JOIN classes c ON c.id = s.class_id
           LEFT JOIN profiles u ON u.id = c.homeroom_ustadz_id
           WHERE ps.parent_id = ? ORDER BY s.full_name ASC`
        )
        .all(req.user!.id) as any[];
      const selectedStudent = children.find((c) => c.id === targetId) || children[0];

      const tahfidzCount = (db.prepare(`SELECT COUNT(*) as c FROM tahfidz_records WHERE student_id = ?`).get(targetId) as any).c;
      const attSummary = db
        .prepare(
          `SELECT
             COUNT(*) as total,
             SUM(CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
             SUM(CASE WHEN status != 'Hadir' THEN 1 ELSE 0 END) as tidak_hadir
           FROM attendance_records WHERE student_id = ?`
        )
        .get(targetId) as any;
      const violationCount = (
        db.prepare(`SELECT COUNT(*) as c FROM violation_records WHERE student_id = ? AND parent_visible = 1`).get(targetId) as any
      ).c;
      const ekstraCount = (
        db.prepare(`SELECT COUNT(*) as c FROM extracurricular_members WHERE student_id = ? AND status = 'Aktif'`).get(targetId) as any
      ).c;

      const attendanceTrend = db
        .prepare(
          `SELECT date,
                  SUM(CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
                  SUM(CASE WHEN status = 'Izin' THEN 1 ELSE 0 END) as izin,
                  SUM(CASE WHEN status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
                  SUM(CASE WHEN status = 'Alpa' THEN 1 ELSE 0 END) as alpa
           FROM attendance_records
           WHERE student_id = ?
           GROUP BY date ORDER BY date ASC LIMIT 14`
        )
        .all(targetId);

      const tahfidzTrend = db
        .prepare(
          `SELECT date, surah, score, (end_ayah - start_ayah + 1) as ayat_count
           FROM tahfidz_records WHERE student_id = ? ORDER BY date ASC, id ASC LIMIT 12`
        )
        .all(targetId);

      const recentTahfidz = db
        .prepare(
          `SELECT 'tahfidz' as kind, date, ('Setoran ' || surah || ' ayat ' || start_ayah || '-' || end_ayah || ' (' || quality || ')') as title,
                  notes as detail, u.full_name as actor
           FROM tahfidz_records t JOIN profiles u ON u.id = t.ustadz_id
           WHERE t.student_id = ? ORDER BY t.date DESC, t.id DESC LIMIT 4`
        )
        .all(targetId);
      const recentAtt = db
        .prepare(
          `SELECT 'absensi' as kind, date, (session || ' · ' || status) as title, notes as detail, u.full_name as actor
           FROM attendance_records a JOIN profiles u ON u.id = a.ustadz_id
           WHERE a.student_id = ? ORDER BY a.date DESC, a.id DESC LIMIT 4`
        )
        .all(targetId);
      const recentCoach = db
        .prepare(
          `SELECT 'pembinaan' as kind, date, coaching_type as title, notes as detail, u.full_name as actor
           FROM coaching_records c JOIN profiles u ON u.id = c.ustadz_id
           WHERE c.student_id = ? AND c.parent_visible = 1 ORDER BY c.date DESC, c.id DESC LIMIT 3`
        )
        .all(targetId);

      const recentActivities = [...recentTahfidz, ...recentAtt, ...recentCoach]
        .sort((a: any, b: any) => b.date.localeCompare(a.date))
        .slice(0, 8);

      const totalAtt = attSummary?.total || 0;
      const attendanceRate = totalAtt > 0 ? Math.round(((attSummary.hadir || 0) / totalAtt) * 100) : 100;

      return res.json({
        children,
        selectedStudent,
        stats: {
          tahfidzCount,
          attendanceRate,
          hadirCount: attSummary?.hadir || 0,
          absentCount: attSummary?.tidak_hadir || 0,
          violationCount,
          ekstraCount,
        },
        attendanceTrend,
        tahfidzTrend,
        recentActivities,
      });
    }

    // Admin or Ustadz dashboard summary
    const totalStudents = (db.prepare(`SELECT COUNT(*) as c FROM students WHERE status = 'Aktif'`).get() as any).c;
    const totalUstadz = (db.prepare(`SELECT COUNT(*) as c FROM profiles WHERE role = 'ustadz'`).get() as any).c;
    const totalParents = (db.prepare(`SELECT COUNT(*) as c FROM profiles WHERE role = 'user'`).get() as any).c;

    const todayAtt = db
      .prepare(
        `SELECT
           COUNT(DISTINCT CASE WHEN status = 'Hadir' THEN student_id END) as hadir,
           COUNT(DISTINCT CASE WHEN status != 'Hadir' THEN student_id END) as tidak_hadir
         FROM attendance_records WHERE date = ?`
      )
      .get(today) as any;

    const totalViolations = (db.prepare(`SELECT COUNT(*) as c FROM violation_records`).get() as any).c;
    const totalTahfidz = (db.prepare(`SELECT COUNT(*) as c FROM tahfidz_records`).get() as any).c;
    const todayTahfidz = (db.prepare(`SELECT COUNT(*) as c FROM tahfidz_records WHERE date = ?`).get(today) as any).c;
    const totalEkstra = (db.prepare(`SELECT COUNT(*) as c FROM extracurriculars WHERE status = 'Aktif'`).get() as any).c;
    const totalPhotos = (db.prepare(`SELECT COUNT(*) as c FROM activity_photos`).get() as any).c;

    const attendanceByDay = db
      .prepare(
        `SELECT date,
                SUM(CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN status = 'Izin' THEN 1 ELSE 0 END) as izin,
                SUM(CASE WHEN status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
                SUM(CASE WHEN status = 'Alpa' THEN 1 ELSE 0 END) as alpa
         FROM attendance_records
         GROUP BY date ORDER BY date ASC LIMIT 10`
      )
      .all();

    const tahfidzByClass = db
      .prepare(
        `SELECT c.name as class_name, COUNT(t.id) as total_setoran, ROUND(AVG(t.score), 1) as avg_score
         FROM classes c
         LEFT JOIN students s ON s.class_id = c.id
         LEFT JOIN tahfidz_records t ON t.student_id = s.id
         GROUP BY c.id ORDER BY c.name ASC`
      )
      .all();

    const violationsByCategory = db
      .prepare(
        `SELECT vc.name as category, COUNT(v.id) as total
         FROM violation_categories vc
         LEFT JOIN violation_records v ON v.violation_category_id = vc.id
         GROUP BY vc.id ORDER BY total DESC`
      )
      .all();

    const ekstraStats = db
      .prepare(
        `SELECT e.name, COUNT(em.id) as members
         FROM extracurriculars e
         LEFT JOIN extracurricular_members em ON em.extracurricular_id = e.id AND em.status = 'Aktif'
         GROUP BY e.id ORDER BY members DESC`
      )
      .all();

    const recentTahfidz = db
      .prepare(
        `SELECT 'tahfidz' as kind, t.date, (s.full_name || ' · Setoran ' || t.surah) as title,
                ('Ayat ' || t.start_ayah || '-' || t.end_ayah || ' · Nilai ' || t.score) as detail,
                u.full_name as actor
         FROM tahfidz_records t
         JOIN students s ON s.id = t.student_id
         JOIN profiles u ON u.id = t.ustadz_id
         ORDER BY t.id DESC LIMIT 4`
      )
      .all();
    const recentViolations = db
      .prepare(
        `SELECT 'pelanggaran' as kind, v.date, (s.full_name || ' · ' || v.title) as title,
                (v.severity || ' · ' || v.coaching_action) as detail,
                u.full_name as actor
         FROM violation_records v
         JOIN students s ON s.id = v.student_id
         JOIN profiles u ON u.id = v.ustadz_id
         ORDER BY v.id DESC LIMIT 3`
      )
      .all();
    const recentPhotos = db
      .prepare(
        `SELECT 'foto' as kind, p.activity_date as date, ('Foto: ' || p.title) as title,
                p.category as detail, u.full_name as actor
         FROM activity_photos p JOIN profiles u ON u.id = p.uploaded_by
         ORDER BY p.id DESC LIMIT 3`
      )
      .all();
    const recentAnnouncements = db
      .prepare(
        `SELECT 'pengumuman' as kind, a.published_at as date, ('Pengumuman: ' || a.title) as title,
                a.target_audience as detail, u.full_name as actor
         FROM announcements a JOIN profiles u ON u.id = a.created_by
         ORDER BY a.id DESC LIMIT 2`
      )
      .all();

    const recentActivities = [...recentTahfidz, ...recentViolations, ...recentPhotos, ...recentAnnouncements]
      .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 10);

    res.json({
      stats: {
        totalStudents,
        totalUstadz,
        totalParents,
        hadirHariIni: todayAtt?.hadir || 0,
        tidakHadirHariIni: todayAtt?.tidak_hadir || 0,
        totalViolations,
        totalTahfidz,
        todayTahfidz,
        totalEkstra,
        totalPhotos,
      },
      attendanceByDay,
      tahfidzByClass,
      violationsByCategory,
      ekstraStats,
      recentActivities,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat ringkasan dashboard.' });
  }
});

// ==================== CLASSES (CONDITIONAL ADMIN MANAGEMENT) ====================
app.get('/api/classes', requireAuth, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, u.full_name as homeroom_ustadz_name,
              COUNT(CASE WHEN s.status = 'Aktif' THEN 1 END) as student_count
       FROM classes c
       LEFT JOIN profiles u ON u.id = c.homeroom_ustadz_id
       LEFT JOIN students s ON s.class_id = c.id
       GROUP BY c.id
       ORDER BY c.name ASC`
    )
    .all();
  res.json(rows);
});

app.post('/api/classes', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    const { name, category, homeroom_ustadz_id, description } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Nama kelas dan kategori (Banat/Banin) wajib diisi.' });
    }
    const result = db
      .prepare(`INSERT INTO classes (name, category, homeroom_ustadz_id, description) VALUES (?, ?, ?, ?)`)
      .run(name.trim(), category, homeroom_ustadz_id || null, description || '');
    logAudit(req.user!.id, 'CREATE', 'classes', result.lastInsertRowid, `Menambahkan kelas ${name}`);
    res.status(201).json({ id: result.lastInsertRowid, message: `Kelas ${name} berhasil ditambahkan.` });
  } catch (err: any) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'Nama kelas sudah ada.' });
    }
    res.status(500).json({ error: 'Gagal menambahkan kelas.' });
  }
});

app.put('/api/classes/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    const { name, category, homeroom_ustadz_id, description } = req.body;
    db.prepare(
      `UPDATE classes SET name = ?, category = ?, homeroom_ustadz_id = ?, description = ? WHERE id = ?`
    ).run(name.trim(), category, homeroom_ustadz_id || null, description || '', req.params.id);
    logAudit(req.user!.id, 'UPDATE', 'classes', req.params.id, `Memperbarui kelas ${name}`);
    res.json({ message: 'Data kelas berhasil diperbarui.' });
  } catch {
    res.status(500).json({ error: 'Gagal memperbarui kelas.' });
  }
});

app.delete('/api/classes/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    const count = (db.prepare(`SELECT COUNT(*) as c FROM students WHERE class_id = ?`).get(req.params.id) as any).c;
    if (count > 0) {
      return res.status(400).json({ error: 'Kelas masih memiliki santri aktif. Pindahkan santri terlebih dahulu.' });
    }
    db.prepare(`DELETE FROM classes WHERE id = ?`).run(req.params.id);
    logAudit(req.user!.id, 'DELETE', 'classes', req.params.id, 'Menghapus kelas');
    res.json({ message: 'Kelas berhasil dihapus.' });
  } catch {
    res.status(500).json({ error: 'Gagal menghapus kelas.' });
  }
});

// ==================== STUDENTS ====================
app.get('/api/students', requireAuth, (req: AuthRequest, res) => {
  try {
    let query = `
      SELECT s.*, c.name as class_name, c.category as class_category,
             u.full_name as homeroom_ustadz_name,
             ps.parent_id, p.full_name as parent_name, p.phone as parent_phone, ps.relationship
      FROM students s
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN profiles u ON u.id = c.homeroom_ustadz_id
      LEFT JOIN parent_students ps ON ps.student_id = s.id
      LEFT JOIN profiles p ON p.id = ps.parent_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (req.user!.role === 'user') {
      query += ` AND s.id IN (SELECT student_id FROM parent_students WHERE parent_id = ?)`;
      params.push(req.user!.id);
    }
    if (req.query.classId) {
      query += ` AND s.class_id = ?`;
      params.push(Number(req.query.classId));
    }
    if (req.query.dormitory) {
      query += ` AND s.dormitory = ?`;
      params.push(String(req.query.dormitory));
    }
    if (req.query.status) {
      query += ` AND s.status = ?`;
      params.push(String(req.query.status));
    }
    if (req.query.search) {
      const term = `%${String(req.query.search).trim()}%`;
      query += ` AND (s.full_name LIKE ? OR s.nis LIKE ?)`;
      params.push(term, term);
    }
    query += ` ORDER BY c.name ASC, s.full_name ASC`;
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data santri.' });
  }
});

app.post('/api/students', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    const {
      nis,
      full_name,
      gender,
      birth_place,
      birth_date,
      address,
      photo_url,
      class_id,
      dormitory,
      enrollment_year,
      status,
      parent_id,
      relationship,
    } = req.body;
    if (!nis || !full_name || !class_id) {
      return res.status(400).json({ error: 'NIS, nama lengkap, dan kelas wajib diisi.' });
    }
    const result = db
      .prepare(
        `INSERT INTO students (nis, full_name, gender, birth_place, birth_date, address, photo_url, class_id, dormitory, enrollment_year, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        nis.trim(),
        full_name.trim(),
        gender || 'L',
        birth_place || '-',
        birth_date || '2013-01-01',
        address || '-',
        photo_url || '',
        Number(class_id),
        dormitory || 'Asrama Utama',
        Number(enrollment_year) || 2026,
        status || 'Aktif'
      );
    const sid = Number(result.lastInsertRowid);
    if (parent_id) {
      db.prepare(`INSERT OR REPLACE INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, ?)`)
        .run(Number(parent_id), sid, relationship || 'Orang Tua');
    }
    logAudit(req.user!.id, 'CREATE', 'students', sid, `Menambahkan santri ${full_name}`);
    res.status(201).json({ id: sid, message: 'Data santri berhasil disimpan.' });
  } catch (err: any) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'NIS santri sudah terdaftar.' });
    }
    res.status(500).json({ error: 'Gagal menyimpan data santri.' });
  }
});

app.put('/api/students/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    const {
      nis,
      full_name,
      gender,
      birth_place,
      birth_date,
      address,
      photo_url,
      class_id,
      dormitory,
      enrollment_year,
      status,
      parent_id,
      relationship,
    } = req.body;
    db.prepare(
      `UPDATE students SET nis = ?, full_name = ?, gender = ?, birth_place = ?, birth_date = ?, address = ?, photo_url = ?, class_id = ?, dormitory = ?, enrollment_year = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      nis.trim(),
      full_name.trim(),
      gender,
      birth_place,
      birth_date,
      address,
      photo_url || '',
      Number(class_id),
      dormitory,
      Number(enrollment_year),
      status,
      req.params.id
    );

    db.prepare(`DELETE FROM parent_students WHERE student_id = ?`).run(req.params.id);
    if (parent_id) {
      db.prepare(`INSERT INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, ?)`)
        .run(Number(parent_id), req.params.id, relationship || 'Orang Tua');
    }
    logAudit(req.user!.id, 'UPDATE', 'students', req.params.id, `Memperbarui data santri ${full_name}`);
    res.json({ message: 'Data santri berhasil diperbarui.' });
  } catch (err: any) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'NIS santri sudah digunakan oleh santri lain.' });
    }
    res.status(500).json({ error: 'Gagal memperbarui data santri.' });
  }
});

app.delete('/api/students/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    db.prepare(`DELETE FROM students WHERE id = ?`).run(req.params.id);
    logAudit(req.user!.id, 'DELETE', 'students', req.params.id, 'Menghapus data santri');
    res.json({ message: 'Data santri berhasil dihapus.' });
  } catch {
    res.status(500).json({ error: 'Gagal menghapus data santri.' });
  }
});

// ==================== USERS / ACCOUNTS (ADMIN ONLY) ====================
app.get('/api/users', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  // Ustadz can list ustadz/wali names only as reference; full management is admin only
  let sql = `SELECT id, username, full_name, email, phone, avatar_url, role, permissions_json, created_at, updated_at FROM profiles WHERE 1=1`;
  const params: any[] = [];
  if (req.query.role) {
    sql += ` AND role = ?`;
    params.push(req.query.role);
  }
  sql += ` ORDER BY role ASC, full_name ASC`;
  const rows = db.prepare(sql).all(...params) as any[];
  const formatted = rows.map((r) => {
    let linkedStudents: any[] = [];
    if (r.role === 'user') {
      linkedStudents = db
        .prepare(
          `SELECT s.id, s.nis, s.full_name, c.name as class_name
           FROM parent_students ps
           JOIN students s ON s.id = ps.student_id
           JOIN classes c ON c.id = s.class_id
           WHERE ps.parent_id = ?`
        )
        .all(r.id);
    }
    return {
      ...r,
      permissions: JSON.parse(r.permissions_json || '{}'),
      linkedStudents,
    };
  });
  res.json(formatted);
});

app.post('/api/users', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    const { username, full_name, email, phone, role, password, permissions, studentIds } = req.body;
    if (!username || !full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'Username, nama lengkap, email, role, dan password wajib diisi.' });
    }
    if (!['admin', 'ustadz', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid.' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare(
        `INSERT INTO profiles (username, full_name, email, phone, role, password_hash, permissions_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        username.trim().toLowerCase(),
        full_name.trim(),
        email.trim().toLowerCase(),
        phone || '',
        role,
        hash,
        JSON.stringify(permissions || {})
      );
    const uid = Number(result.lastInsertRowid);
    if (role === 'user' && Array.isArray(studentIds)) {
      const linkStmt = db.prepare(`INSERT OR IGNORE INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, ?)`);
      for (const sid of studentIds) {
        linkStmt.run(uid, Number(sid), 'Orang Tua/Wali');
      }
    }
    logAudit(req.user!.id, 'CREATE', 'profiles', uid, `Membuat akun ${role}: ${username}`);
    res.status(201).json({ id: uid, message: 'Akun pengguna berhasil dibuat.' });
  } catch (err: any) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username atau email sudah digunakan.' });
    }
    res.status(500).json({ error: 'Gagal membuat akun pengguna.' });
  }
});

app.put('/api/users/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    const { username, full_name, email, phone, password, permissions, studentIds } = req.body;
    const existing = db.prepare(`SELECT * FROM profiles WHERE id = ?`).get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const nextHash = password ? bcrypt.hashSync(password, 10) : existing.password_hash;
    db.prepare(
      `UPDATE profiles SET username = ?, full_name = ?, email = ?, phone = ?, password_hash = ?, permissions_json = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      (username || existing.username).trim().toLowerCase(),
      (full_name || existing.full_name).trim(),
      (email || existing.email).trim().toLowerCase(),
      phone !== undefined ? phone : existing.phone,
      nextHash,
      JSON.stringify(permissions || JSON.parse(existing.permissions_json || '{}')),
      req.params.id
    );

    if (existing.role === 'user' && Array.isArray(studentIds)) {
      db.prepare(`DELETE FROM parent_students WHERE parent_id = ?`).run(existing.id);
      const linkStmt = db.prepare(`INSERT OR IGNORE INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, ?)`);
      for (const sid of studentIds) {
        linkStmt.run(existing.id, Number(sid), 'Orang Tua/Wali');
      }
    }
    logAudit(req.user!.id, 'UPDATE', 'profiles', req.params.id, `Memperbarui akun ${existing.username}`);
    res.json({ message: 'Akun pengguna berhasil diperbarui.' });
  } catch (err: any) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username atau email sudah digunakan.' });
    }
    res.status(500).json({ error: 'Gagal memperbarui akun pengguna.' });
  }
});

app.delete('/api/users/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    if (Number(req.params.id) === req.user!.id) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun yang sedang aktif.' });
    }
    db.prepare(`DELETE FROM profiles WHERE id = ?`).run(req.params.id);
    logAudit(req.user!.id, 'DELETE', 'profiles', req.params.id, 'Menghapus akun pengguna');
    res.json({ message: 'Akun pengguna berhasil dihapus.' });
  } catch {
    res.status(500).json({ error: 'Gagal menghapus akun pengguna. Pastikan tidak terkait dengan data aktif.' });
  }
});

// ==================== TAHFIDZ ====================
app.get('/api/tahfidz', requireAuth, (req: AuthRequest, res) => {
  let sql = `
    SELECT t.*, s.full_name as student_name, s.nis as student_nis, c.name as class_name,
           u.full_name as ustadz_name
    FROM tahfidz_records t
    JOIN students s ON s.id = t.student_id
    JOIN classes c ON c.id = s.class_id
    JOIN profiles u ON u.id = t.ustadz_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role === 'user') {
    sql += ` AND t.student_id IN (SELECT student_id FROM parent_students WHERE parent_id = ?)`;
    params.push(req.user!.id);
  }
  if (req.query.studentId) {
    sql += ` AND t.student_id = ?`;
    params.push(Number(req.query.studentId));
  }
  if (req.query.classId) {
    sql += ` AND s.class_id = ?`;
    params.push(Number(req.query.classId));
  }
  if (req.query.date) {
    sql += ` AND t.date = ?`;
    params.push(String(req.query.date));
  }
  sql += ` ORDER BY t.date DESC, t.id DESC`;
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/tahfidz', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  try {
    const { student_id, date, surah, juz, start_ayah, end_ayah, type, score, quality, notes } = req.body;
    if (!student_id || !date || !surah) {
      return res.status(400).json({ error: 'Santri, tanggal, dan surah wajib diisi.' });
    }
    const result = db
      .prepare(
        `INSERT INTO tahfidz_records (student_id, ustadz_id, date, surah, juz, start_ayah, end_ayah, type, score, quality, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(student_id),
        req.user!.id,
        date,
        surah.trim(),
        Number(juz) || 30,
        Number(start_ayah) || 1,
        Number(end_ayah) || 1,
        type || 'Hafalan Baru',
        Number(score) || 85,
        quality || 'Jayyid Jiddan',
        notes || ''
      );
    logAudit(req.user!.id, 'CREATE', 'tahfidz_records', result.lastInsertRowid, `Input setoran ${surah}`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Setoran tahfidz berhasil ditambahkan.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan setoran tahfidz.' });
  }
});

app.put('/api/tahfidz/:id', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  try {
    const { date, surah, juz, start_ayah, end_ayah, type, score, quality, notes } = req.body;
    db.prepare(
      `UPDATE tahfidz_records SET date = ?, surah = ?, juz = ?, start_ayah = ?, end_ayah = ?, type = ?, score = ?, quality = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(date, surah, Number(juz), Number(start_ayah), Number(end_ayah), type, Number(score), quality, notes || '', req.params.id);
    logAudit(req.user!.id, 'UPDATE', 'tahfidz_records', req.params.id, `Memperbarui setoran ${surah}`);
    res.json({ message: 'Data tahfidz berhasil diperbarui.' });
  } catch {
    res.status(500).json({ error: 'Gagal memperbarui data tahfidz.' });
  }
});

app.delete('/api/tahfidz/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  db.prepare(`DELETE FROM tahfidz_records WHERE id = ?`).run(req.params.id);
  logAudit(req.user!.id, 'DELETE', 'tahfidz_records', req.params.id, 'Menghapus catatan tahfidz');
  res.json({ message: 'Catatan tahfidz berhasil dihapus.' });
});

// ==================== ATTENDANCE (PER-CLASS SHEET & HISTORY) ====================
app.get('/api/attendance/class-sheet', requireAuth, requireRole(['admin', 'ustadz']), (req, res) => {
  const classId = Number(req.query.classId);
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const session = String(req.query.session || 'KBM Pagi');
  if (!classId) {
    return res.status(400).json({ error: 'Parameter kelas wajib dipilih.' });
  }
  const rows = db
    .prepare(
      `SELECT s.id as student_id, s.nis, s.full_name, s.gender, s.dormitory,
              a.id as attendance_id, COALESCE(a.status, 'Hadir') as status,
              COALESCE(a.notes, '') as notes,
              CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as is_recorded,
              u.full_name as recorded_by
       FROM students s
       LEFT JOIN attendance_records a ON a.student_id = s.id AND a.date = ? AND a.session = ?
       LEFT JOIN profiles u ON u.id = a.ustadz_id
       WHERE s.class_id = ? AND s.status = 'Aktif'
       ORDER BY s.full_name ASC`
    )
    .all(date, session, classId);
  res.json(rows);
});

app.post('/api/attendance/bulk', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  try {
    const { date, session, entries } = req.body;
    if (!date || !session || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Tanggal, sesi, dan daftar absensi wajib diisi.' });
    }
    const upsert = db.prepare(`
      INSERT INTO attendance_records (student_id, ustadz_id, date, session, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, date, session) DO UPDATE SET
        ustadz_id = excluded.ustadz_id,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = datetime('now')
    `);
    const tx = db.transaction((items: any[]) => {
      for (const item of items) {
        upsert.run(
          Number(item.student_id),
          req.user!.id,
          date,
          session,
          item.status || 'Hadir',
          item.notes || ''
        );
      }
    });
    tx(entries);
    logAudit(req.user!.id, 'UPSERT_BULK', 'attendance_records', `${date}:${session}`, `Menyimpan absensi ${entries.length} santri`);
    res.json({ message: `Absensi untuk ${entries.length} santri pada sesi ${session} berhasil disimpan.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan absensi kelas.' });
  }
});

app.get('/api/attendance', requireAuth, (req: AuthRequest, res) => {
  let sql = `
    SELECT a.*, s.full_name as student_name, s.nis as student_nis, s.dormitory,
           c.id as class_id, c.name as class_name, c.category as class_category,
           u.full_name as ustadz_name
    FROM attendance_records a
    JOIN students s ON s.id = a.student_id
    JOIN classes c ON c.id = s.class_id
    JOIN profiles u ON u.id = a.ustadz_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role === 'user') {
    sql += ` AND a.student_id IN (SELECT student_id FROM parent_students WHERE parent_id = ?)`;
    params.push(req.user!.id);
  }
  if (req.query.studentId) {
    sql += ` AND a.student_id = ?`;
    params.push(Number(req.query.studentId));
  }
  if (req.query.classId) {
    sql += ` AND s.class_id = ?`;
    params.push(Number(req.query.classId));
  }
  if (req.query.date) {
    sql += ` AND a.date = ?`;
    params.push(String(req.query.date));
  }
  if (req.query.status) {
    sql += ` AND a.status = ?`;
    params.push(String(req.query.status));
  }
  sql += ` ORDER BY a.date DESC, c.name ASC, s.full_name ASC LIMIT 300`;
  res.json(db.prepare(sql).all(...params));
});

app.put('/api/attendance/:id', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  const { status, notes } = req.body;
  db.prepare(`UPDATE attendance_records SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`).run(
    status,
    notes || '',
    req.params.id
  );
  logAudit(req.user!.id, 'UPDATE', 'attendance_records', req.params.id, `Mengubah status absensi menjadi ${status}`);
  res.json({ message: 'Data absensi berhasil diperbarui.' });
});

app.delete('/api/attendance/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  db.prepare(`DELETE FROM attendance_records WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Data absensi berhasil dihapus.' });
});

// ==================== VIOLATIONS & CATEGORIES ====================
app.get('/api/violation-categories', requireAuth, (_req, res) => {
  res.json(db.prepare(`SELECT * FROM violation_categories ORDER BY name ASC`).all());
});

app.post('/api/violation-categories', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
    const resDb = db.prepare(`INSERT INTO violation_categories (name, description) VALUES (?, ?)`).run(name.trim(), description || '');
    res.status(201).json({ id: resDb.lastInsertRowid, message: 'Kategori pelanggaran berhasil ditambahkan.' });
  } catch {
    res.status(400).json({ error: 'Kategori sudah ada.' });
  }
});

app.delete('/api/violation-categories/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    db.prepare(`DELETE FROM violation_categories WHERE id = ?`).run(req.params.id);
    res.json({ message: 'Kategori berhasil dihapus.' });
  } catch {
    res.status(400).json({ error: 'Kategori sedang digunakan pada catatan pelanggaran.' });
  }
});

app.get('/api/violations', requireAuth, (req: AuthRequest, res) => {
  let sql = `
    SELECT v.*, s.full_name as student_name, s.nis as student_nis, c.name as class_name,
           vc.name as category_name, u.full_name as ustadz_name
    FROM violation_records v
    JOIN students s ON s.id = v.student_id
    JOIN classes c ON c.id = s.class_id
    JOIN violation_categories vc ON vc.id = v.violation_category_id
    JOIN profiles u ON u.id = v.ustadz_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role === 'user') {
    sql += ` AND v.student_id IN (SELECT student_id FROM parent_students WHERE parent_id = ?) AND v.parent_visible = 1`;
    params.push(req.user!.id);
  }
  if (req.query.studentId) {
    sql += ` AND v.student_id = ?`;
    params.push(Number(req.query.studentId));
  }
  if (req.query.categoryId) {
    sql += ` AND v.violation_category_id = ?`;
    params.push(Number(req.query.categoryId));
  }
  sql += ` ORDER BY v.date DESC, v.id DESC`;
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/violations', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  try {
    const { student_id, violation_category_id, date, time, title, description, severity, coaching_action, notes, parent_visible } = req.body;
    if (!student_id || !violation_category_id || !date || !title || !description || !coaching_action) {
      return res.status(400).json({ error: 'Lengkapi semua field pelanggaran yang wajib diisi.' });
    }
    const result = db
      .prepare(
        `INSERT INTO violation_records (student_id, ustadz_id, violation_category_id, date, time, title, description, severity, coaching_action, notes, parent_visible)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(student_id),
        req.user!.id,
        Number(violation_category_id),
        date,
        time || '',
        title.trim(),
        description.trim(),
        severity || 'Ringan',
        coaching_action.trim(),
        notes || '',
        parent_visible === false || parent_visible === 0 ? 0 : 1
      );
    logAudit(req.user!.id, 'CREATE', 'violation_records', result.lastInsertRowid, `Mencatat pelanggaran: ${title}`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Catatan pelanggaran dan pembinaan berhasil disimpan.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan catatan pelanggaran.' });
  }
});

app.put('/api/violations/:id', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  const { violation_category_id, date, time, title, description, severity, coaching_action, notes, parent_visible } = req.body;
  db.prepare(
    `UPDATE violation_records SET violation_category_id = ?, date = ?, time = ?, title = ?, description = ?, severity = ?, coaching_action = ?, notes = ?, parent_visible = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    Number(violation_category_id),
    date,
    time || '',
    title,
    description,
    severity,
    coaching_action,
    notes || '',
    parent_visible ? 1 : 0,
    req.params.id
  );
  res.json({ message: 'Catatan pelanggaran berhasil diperbarui.' });
});

app.delete('/api/violations/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  db.prepare(`DELETE FROM violation_records WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Catatan pelanggaran berhasil dihapus.' });
});

// ==================== COACHING RECORDS (PEMBINAAN) ====================
app.get('/api/coaching', requireAuth, (req: AuthRequest, res) => {
  let sql = `
    SELECT cr.*, s.full_name as student_name, c.name as class_name, u.full_name as ustadz_name
    FROM coaching_records cr
    JOIN students s ON s.id = cr.student_id
    JOIN classes c ON c.id = s.class_id
    JOIN profiles u ON u.id = cr.ustadz_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role === 'user') {
    sql += ` AND cr.student_id IN (SELECT student_id FROM parent_students WHERE parent_id = ?) AND cr.parent_visible = 1`;
    params.push(req.user!.id);
  }
  if (req.query.studentId) {
    sql += ` AND cr.student_id = ?`;
    params.push(Number(req.query.studentId));
  }
  sql += ` ORDER BY cr.date DESC, cr.id DESC`;
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/coaching', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  const { student_id, date, coaching_type, notes, follow_up, parent_visible } = req.body;
  if (!student_id || !date || !coaching_type || !notes) {
    return res.status(400).json({ error: 'Santri, tanggal, jenis pembinaan, dan catatan wajib diisi.' });
  }
  const result = db
    .prepare(
      `INSERT INTO coaching_records (student_id, ustadz_id, date, coaching_type, notes, follow_up, parent_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(Number(student_id), req.user!.id, date, coaching_type, notes, follow_up || '-', parent_visible === false || parent_visible === 0 ? 0 : 1);
  logAudit(req.user!.id, 'CREATE', 'coaching_records', result.lastInsertRowid, `Input catatan pembinaan`);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Catatan pembinaan berhasil disimpan.' });
});

app.put('/api/coaching/:id', requireAuth, requireRole(['admin', 'ustadz']), (req, res) => {
  const { date, coaching_type, notes, follow_up, parent_visible } = req.body;
  db.prepare(
    `UPDATE coaching_records SET date = ?, coaching_type = ?, notes = ?, follow_up = ?, parent_visible = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(date, coaching_type, notes, follow_up, parent_visible ? 1 : 0, req.params.id);
  res.json({ message: 'Catatan pembinaan berhasil diperbarui.' });
});

app.delete('/api/coaching/:id', requireAuth, requireRole(['admin']), (req, res) => {
  db.prepare(`DELETE FROM coaching_records WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Catatan pembinaan berhasil dihapus.' });
});

// ==================== ACTIVITY PHOTOS ====================
app.get('/api/photos', requireAuth, (req: AuthRequest, res) => {
  let sql = `
    SELECT p.*, c.name as class_name, u.full_name as uploader_name
    FROM activity_photos p
    LEFT JOIN classes c ON c.id = p.class_id
    JOIN profiles u ON u.id = p.uploaded_by
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role === 'user') {
    sql += ` AND p.visibility IN ('Publik', 'Wali Santri')`;
  }
  if (req.query.category && req.query.category !== 'Semua') {
    sql += ` AND p.category = ?`;
    params.push(String(req.query.category));
  }
  sql += ` ORDER BY p.activity_date DESC, p.id DESC`;
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/photos', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  const { title, description, image_url, category, class_id, activity_date, visibility } = req.body;
  if (!title || !image_url || !category || !activity_date) {
    return res.status(400).json({ error: 'Judul, foto, kategori, dan tanggal kegiatan wajib diisi.' });
  }
  const result = db
    .prepare(
      `INSERT INTO activity_photos (title, description, image_url, category, class_id, activity_date, uploaded_by, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(title.trim(), description || '', image_url, category, class_id ? Number(class_id) : null, activity_date, req.user!.id, visibility || 'Wali Santri');
  logAudit(req.user!.id, 'CREATE', 'activity_photos', result.lastInsertRowid, `Mengunggah dokumentasi: ${title}`);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Dokumentasi foto berhasil diunggah.' });
});

app.put('/api/photos/:id', requireAuth, requireRole(['admin', 'ustadz']), (req, res) => {
  const { title, description, category, class_id, activity_date, visibility } = req.body;
  db.prepare(
    `UPDATE activity_photos SET title = ?, description = ?, category = ?, class_id = ?, activity_date = ?, visibility = ? WHERE id = ?`
  ).run(title, description, category, class_id ? Number(class_id) : null, activity_date, visibility, req.params.id);
  res.json({ message: 'Dokumentasi berhasil diperbarui.' });
});

app.delete('/api/photos/:id', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  db.prepare(`DELETE FROM activity_photos WHERE id = ?`).run(req.params.id);
  logAudit(req.user!.id, 'DELETE', 'activity_photos', req.params.id, 'Menghapus dokumentasi foto');
  res.json({ message: 'Dokumentasi foto berhasil dihapus.' });
});

// ==================== ANNOUNCEMENTS ====================
function checkUstadzPermission(userId: number, permKey: 'canManageAnnouncements' | 'canManageExtracurriculars'): boolean {
  const p = getProfileById(userId);
  if (!p) return false;
  if (p.role === 'admin') return true;
  if (p.role === 'ustadz') return Boolean(p.permissions?.[permKey]);
  return false;
}

app.get('/api/announcements', requireAuth, (req: AuthRequest, res) => {
  let sql = `
    SELECT a.*, u.full_name as author_name
    FROM announcements a
    JOIN profiles u ON u.id = a.created_by
    WHERE 1=1
  `;
  if (req.user!.role === 'user') {
    sql += ` AND a.status = 'Diterbitkan' AND a.target_audience IN ('Semua', 'Wali Santri')`;
  } else if (req.user!.role === 'ustadz') {
    sql += ` AND (a.status = 'Diterbitkan' OR a.created_by = ${req.user!.id}) AND a.target_audience IN ('Semua', 'Ustadz', 'Wali Santri')`;
  }
  sql += ` ORDER BY a.published_at DESC, a.id DESC`;
  res.json(db.prepare(sql).all());
});

app.post('/api/announcements', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  if (!checkUstadzPermission(req.user!.id, 'canManageAnnouncements')) {
    return res.status(403).json({ error: 'Anda tidak memiliki izin mengelola pengumuman.' });
  }
  const { title, content, category, attachment_url, target_audience, published_at, status } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
  }
  const result = db
    .prepare(
      `INSERT INTO announcements (title, content, category, attachment_url, target_audience, published_at, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      content.trim(),
      category || 'Informasi pondok',
      attachment_url || '',
      target_audience || 'Semua',
      published_at || new Date().toISOString().slice(0, 10),
      status || 'Diterbitkan',
      req.user!.id
    );
  logAudit(req.user!.id, 'CREATE', 'announcements', result.lastInsertRowid, `Menerbitkan pengumuman: ${title}`);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Pengumuman berhasil diterbitkan.' });
});

app.put('/api/announcements/:id', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  if (!checkUstadzPermission(req.user!.id, 'canManageAnnouncements')) {
    return res.status(403).json({ error: 'Anda tidak memiliki izin mengelola pengumuman.' });
  }
  const { title, content, category, attachment_url, target_audience, published_at, status } = req.body;
  db.prepare(
    `UPDATE announcements SET title = ?, content = ?, category = ?, attachment_url = ?, target_audience = ?, published_at = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(title, content, category, attachment_url || '', target_audience, published_at, status, req.params.id);
  res.json({ message: 'Pengumuman berhasil diperbarui.' });
});

app.delete('/api/announcements/:id', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  db.prepare(`DELETE FROM announcements WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Pengumuman berhasil dihapus.' });
});

// ==================== EXTRACURRICULARS ====================
app.get('/api/extracurriculars', requireAuth, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT e.*, u.full_name as supervisor_name,
              COUNT(CASE WHEN em.status = 'Aktif' THEN 1 END) as member_count
       FROM extracurriculars e
       LEFT JOIN profiles u ON u.id = e.supervisor_id
       LEFT JOIN extracurricular_members em ON em.extracurricular_id = e.id
       GROUP BY e.id
       ORDER BY e.name ASC`
    )
    .all();
  res.json(rows);
});

app.post('/api/extracurriculars', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  if (!checkUstadzPermission(req.user!.id, 'canManageExtracurriculars')) {
    return res.status(403).json({ error: 'Anda tidak memiliki izin mengelola ekstrakurikuler.' });
  }
  const { name, description, schedule, location, supervisor_id, status } = req.body;
  if (!name || !schedule || !location) {
    return res.status(400).json({ error: 'Nama, jadwal, dan lokasi ekstrakurikuler wajib diisi.' });
  }
  try {
    const result = db
      .prepare(
        `INSERT INTO extracurriculars (name, description, schedule, location, supervisor_id, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(name.trim(), description || '', schedule, location, supervisor_id || req.user!.id, status || 'Aktif');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Ekstrakurikuler berhasil ditambahkan.' });
  } catch {
    res.status(400).json({ error: 'Nama ekstrakurikuler sudah terdaftar.' });
  }
});

app.put('/api/extracurriculars/:id', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  if (!checkUstadzPermission(req.user!.id, 'canManageExtracurriculars')) {
    return res.status(403).json({ error: 'Anda tidak memiliki izin mengelola ekstrakurikuler.' });
  }
  const { name, description, schedule, location, supervisor_id, status } = req.body;
  db.prepare(
    `UPDATE extracurriculars SET name = ?, description = ?, schedule = ?, location = ?, supervisor_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(name, description, schedule, location, supervisor_id || null, status, req.params.id);
  res.json({ message: 'Data ekstrakurikuler berhasil diperbarui.' });
});

app.delete('/api/extracurriculars/:id', requireAuth, requireRole(['admin']), (req, res) => {
  db.prepare(`DELETE FROM extracurriculars WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Ekstrakurikuler berhasil dihapus.' });
});

app.get('/api/extracurricular-members', requireAuth, (req: AuthRequest, res) => {
  let sql = `
    SELECT em.*, e.name as extracurricular_name, e.schedule, e.location,
           u.full_name as supervisor_name,
           s.full_name as student_name, s.nis as student_nis, c.name as class_name
    FROM extracurricular_members em
    JOIN extracurriculars e ON e.id = em.extracurricular_id
    LEFT JOIN profiles u ON u.id = e.supervisor_id
    JOIN students s ON s.id = em.student_id
    JOIN classes c ON c.id = s.class_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role === 'user') {
    sql += ` AND em.student_id IN (SELECT student_id FROM parent_students WHERE parent_id = ?)`;
    params.push(req.user!.id);
  }
  if (req.query.extracurricularId) {
    sql += ` AND em.extracurricular_id = ?`;
    params.push(Number(req.query.extracurricularId));
  }
  if (req.query.studentId) {
    sql += ` AND em.student_id = ?`;
    params.push(Number(req.query.studentId));
  }
  sql += ` ORDER BY e.name ASC, s.full_name ASC`;
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/extracurricular-members', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  if (!checkUstadzPermission(req.user!.id, 'canManageExtracurriculars')) {
    return res.status(403).json({ error: 'Anda tidak memiliki izin mengelola peserta ekstrakurikuler.' });
  }
  const { extracurricular_id, student_id, notes } = req.body;
  try {
    const result = db
      .prepare(
        `INSERT INTO extracurricular_members (extracurricular_id, student_id, joined_at, status, notes)
         VALUES (?, ?, ?, 'Aktif', ?)`
      )
      .run(Number(extracurricular_id), Number(student_id), new Date().toISOString().slice(0, 10), notes || '');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Santri berhasil didaftarkan ke ekstrakurikuler.' });
  } catch {
    res.status(400).json({ error: 'Santri sudah terdaftar pada ekstrakurikuler ini.' });
  }
});

app.delete('/api/extracurricular-members/:id', requireAuth, requireRole(['admin', 'ustadz']), (req: AuthRequest, res) => {
  if (!checkUstadzPermission(req.user!.id, 'canManageExtracurriculars')) {
    return res.status(403).json({ error: 'Anda tidak memiliki izin.' });
  }
  db.prepare(`DELETE FROM extracurricular_members WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Peserta berhasil dihapus dari ekstrakurikuler.' });
});

// ==================== ADMIN SETTINGS, AUDIT & REPORTS ====================
app.get('/api/settings', requireAuth, requireRole(['admin']), (_req, res) => {
  const rows = db.prepare(`SELECT key, value FROM system_settings`).all() as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

app.put('/api/settings', requireAuth, requireRole(['admin']), (req: AuthRequest, res) => {
  const upsert = db.prepare(`INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`);
  const entries = Object.entries(req.body || {});
  for (const [k, v] of entries) {
    upsert.run(k, String(v));
  }
  logAudit(req.user!.id, 'UPDATE', 'system_settings', 'all', 'Memperbarui pengaturan sistem');
  res.json({ message: 'Pengaturan sistem berhasil disimpan.' });
});

app.get('/api/audit-logs', requireAuth, requireRole(['admin']), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, p.full_name as actor_name, p.role as actor_role
       FROM audit_logs l LEFT JOIN profiles p ON p.id = l.actor_id
       ORDER BY l.id DESC LIMIT 50`
    )
    .all();
  res.json(rows);
});

// ==================== SERVER STARTUP ====================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Monitoring Santri An-Nawawi server running on http://localhost:${PORT}`);
  });
}

startServer();
