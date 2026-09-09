import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  GraduationCap, 
  CreditCard, 
  Plus, 
  Flame, 
  AlertCircle, 
  Wallet, 
  Sun, 
  Moon, 
  X, 
  Headphones, 
  BookOpen, 
  Trash2, 
  Layers, 
  Settings, 
  ShieldAlert, 
  TrendingUp, 
  ListTodo, 
  CalendarDays, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronLeft, 
  Menu, 
  Zap, 
  Clock, 
  CalendarCheck2,
  Bookmark,
  ExternalLink,
  CheckCircle2,
  BookMarked,
  Brain,
  BarChart3,
  Edit3,
  Image,
  Volume2
} from 'lucide-react';

const LIFEOS_CAREER_SEED_VERSION = 'qyf_uchile_2027_v10';

// ================= LIFEOS CLOUD / SUPABASE =================
// No se necesita instalar otra librería: LifeOS usa la API HTTP oficial de Supabase.
// Configura estas variables en .env.local: VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
const SUPABASE_URL = String((import.meta as any).env?.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = String((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || '');
const LIFEOS_CLOUD_SESSION_KEY = 'lifeos_cloud_session_v1';
const LIFEOS_CLOUD_META_KEY = 'lifeos_cloud_meta_v1';

type LifeOSCloudSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user?: { id?: string; email?: string };
};

type LifeOSCloudRow = {
  user_id: string;
  data: Record<string, string>;
  updated_at: string;
};

const cloudConfigured = () => Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

const getStoredCloudSession = (): LifeOSCloudSession | null => {
  try {
    const raw = localStorage.getItem(LIFEOS_CLOUD_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveStoredCloudSession = (session: LifeOSCloudSession | null) => {
  try {
    if (session) localStorage.setItem(LIFEOS_CLOUD_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(LIFEOS_CLOUD_SESSION_KEY);
  } catch {}
};

const getCloudMeta = (): { updatedAt: string; signature: string } => {
  try {
    const raw = localStorage.getItem(LIFEOS_CLOUD_META_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { updatedAt: '', signature: '' };
};

const saveCloudMeta = (meta: { updatedAt: string; signature: string }) => {
  try { localStorage.setItem(LIFEOS_CLOUD_META_KEY, JSON.stringify(meta)); } catch {}
};

const getLifeOSLocalSnapshot = (): Record<string, string> => {
  const snapshot: Record<string, string> = {};
  if (typeof window === 'undefined') return snapshot;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('lifeos_')) continue;
    // Estos valores pertenecen a la sesión de autenticación y no forman parte de los datos de LifeOS.
    if (key === LIFEOS_CLOUD_SESSION_KEY || key === LIFEOS_CLOUD_META_KEY) continue;
    if (key === 'lifeos_sent_notifications') continue;
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
};

const getSnapshotSignature = (snapshot: Record<string, string>) => {
  const normalized = Object.keys(snapshot).sort().map(key => [key, snapshot[key]]);
  let hash = 2166136261;
  const text = JSON.stringify(normalized);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const cloudRequest = async (path: string, options: RequestInit = {}, accessToken?: string) => {
  if (!cloudConfigured()) throw new Error('Falta configurar Supabase en .env.local.');
  const headers = new Headers(options.headers || {});
  headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body?.msg || body?.message || body?.error_description || body?.error || `Error ${response.status}`;
    throw new Error(String(message));
  }
  return body;
};

const cloudRefreshSession = async (session: LifeOSCloudSession): Promise<LifeOSCloudSession> => {
  const body = await cloudRequest('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  const next: LifeOSCloudSession = {
    access_token: body.access_token,
    refresh_token: body.refresh_token || session.refresh_token,
    expires_at: body.expires_at,
    user: body.user || session.user
  };
  saveStoredCloudSession(next);
  return next;
};

const ensureCloudSession = async (): Promise<LifeOSCloudSession | null> => {
  let session = getStoredCloudSession();
  if (!session?.access_token) return null;
  const expiresAt = Number(session.expires_at || 0);
  if (expiresAt && expiresAt * 1000 < Date.now() + 60_000 && session.refresh_token) {
    session = await cloudRefreshSession(session);
  }
  return session;
};

const cloudSignIn = async (email: string, password: string): Promise<LifeOSCloudSession> => {
  const body = await cloudRequest('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const session: LifeOSCloudSession = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at, user: body.user };
  saveStoredCloudSession(session);
  return session;
};

const cloudSignUp = async (email: string, password: string): Promise<LifeOSCloudSession | null> => {
  const body = await cloudRequest('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (!body?.access_token) return null;
  const session: LifeOSCloudSession = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at, user: body.user };
  saveStoredCloudSession(session);
  return session;
};

const cloudSignOut = async () => {
  const session = getStoredCloudSession();
  if (session?.access_token && cloudConfigured()) {
    try { await cloudRequest('/auth/v1/logout', { method: 'POST' }, session.access_token); } catch {}
  }
  saveStoredCloudSession(null);
  try { localStorage.removeItem(LIFEOS_CLOUD_META_KEY); } catch {}
};

const cloudGetRow = async (session: LifeOSCloudSession): Promise<LifeOSCloudRow | null> => {
  const rows = await cloudRequest('/rest/v1/lifeos_cloud?select=user_id,data,updated_at&limit=1', { method: 'GET' }, session.access_token);
  return Array.isArray(rows) && rows.length ? rows[0] as LifeOSCloudRow : null;
};

const cloudPushSnapshot = async (session: LifeOSCloudSession, snapshot: Record<string, string>): Promise<LifeOSCloudRow> => {
  const rows = await cloudRequest('/rest/v1/lifeos_cloud?on_conflict=user_id', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ user_id: session.user?.id, data: snapshot, updated_at: new Date().toISOString() })
  }, session.access_token);
  if (!Array.isArray(rows) || !rows[0]) throw new Error('Supabase no devolvió la copia sincronizada.');
  return rows[0] as LifeOSCloudRow;
};

const cloudApplySnapshot = (snapshot: Record<string, string>) => {
  const existingKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith('lifeos_') && key !== LIFEOS_CLOUD_SESSION_KEY && key !== LIFEOS_CLOUD_META_KEY && key !== 'lifeos_sent_notifications') existingKeys.push(key);
  }
  existingKeys.forEach(key => localStorage.removeItem(key));
  Object.entries(snapshot).forEach(([key, value]) => localStorage.setItem(key, value));
};


const QYF_UCHILE_CURRICULUM: CurriculumSubject[] = [
  // Semestre I
  { id: 1001, name: 'Química General I', code: 'QF-01', semester: 1, status: 'pendiente', credits: 8 },
  { id: 1002, name: 'Técnicas de Laboratorio Químico', code: 'QF-02', semester: 1, status: 'pendiente', credits: 4 },
  { id: 1003, name: 'Introducción al Álgebra y Cálculo', code: 'QF-03', semester: 1, status: 'pendiente', credits: 8 },
  { id: 1004, name: 'Orientación Farmacéutica', code: 'QF-04', semester: 1, status: 'pendiente', credits: 3 },
  { id: 1005, name: 'Curso de Formación General I', code: 'CFG-I', semester: 1, status: 'pendiente', credits: 4 },
  { id: 1006, name: 'Inglés I', code: 'QF-06', semester: 1, status: 'pendiente', credits: 3 },
  // Semestre II
  { id: 2001, name: 'Química General II', code: 'QF-07', semester: 2, status: 'pendiente', credits: 5 },
  { id: 2002, name: 'Laboratorio de Química General', code: 'QF-08', semester: 2, status: 'pendiente', credits: 3 },
  { id: 2003, name: 'Física General', code: 'QF-09', semester: 2, status: 'pendiente', credits: 5 },
  { id: 2004, name: 'Cálculo Diferencial e Integral', code: 'QF-10', semester: 2, status: 'pendiente', credits: 6 },
  { id: 2005, name: 'Química Transformadora', code: 'QF-11', semester: 2, status: 'pendiente', credits: 3 },
  { id: 2006, name: 'Biología Celular', code: 'QF-12', semester: 2, status: 'pendiente', credits: 5 },
  { id: 2007, name: 'Inglés II', code: 'QF-13', semester: 2, status: 'pendiente', credits: 3 },
  // Semestre III
  { id: 3001, name: 'Química Orgánica I', code: 'QF-14', semester: 3, status: 'pendiente', credits: 5 },
  { id: 3002, name: 'Química Analítica I', code: 'QF-15', semester: 3, status: 'pendiente', credits: 5 },
  { id: 3003, name: 'Laboratorio I de Química Orgánica', code: 'QF-16', semester: 3, status: 'pendiente', credits: 4 },
  { id: 3004, name: 'Estadística y Análisis de Datos', code: 'QF-17', semester: 3, status: 'pendiente', credits: 4 },
  { id: 3005, name: 'Fundamentos de Ciencias Farmacéuticas', code: 'QF-18', semester: 3, status: 'pendiente', credits: 2 },
  { id: 3006, name: 'Fisiología Celular', code: 'QF-19', semester: 3, status: 'pendiente', credits: 5 },
  { id: 3007, name: 'Curso de Formación General III', code: 'CFG-III', semester: 3, status: 'pendiente', credits: 2 },
  { id: 3008, name: 'Inglés III', code: 'QF-21', semester: 3, status: 'pendiente', credits: 3 },
  // Semestre IV
  { id: 4001, name: 'Química Orgánica II', code: 'QF-22', semester: 4, status: 'pendiente', credits: 5 },
  { id: 4002, name: 'Laboratorio de Análisis Químico', code: 'QF-23', semester: 4, status: 'pendiente', credits: 4 },
  { id: 4003, name: 'Química Analítica II', code: 'QF-24', semester: 4, status: 'pendiente', credits: 5 },
  { id: 4004, name: 'Fisicoquímica I', code: 'QF-25', semester: 4, status: 'pendiente', credits: 6 },
  { id: 4005, name: 'Fisiología de Sistemas', code: 'QF-26', semester: 4, status: 'pendiente', credits: 4 },
  { id: 4006, name: 'Práctica Intermedia', code: 'QF-27', semester: 4, status: 'pendiente', credits: 3 },
  { id: 4007, name: 'Inglés IV', code: 'QF-28', semester: 4, status: 'pendiente', credits: 3 },
  // Semestre V
  { id: 5001, name: 'Laboratorio de Análisis Instrumental', code: 'QF-29', semester: 5, status: 'pendiente', credits: 4 },
  { id: 5002, name: 'Botánica y Farmacognosia', code: 'QF-30', semester: 5, status: 'pendiente', credits: 7 },
  { id: 5003, name: 'Química de Heterocíclicos y Análisis Espectroscópico', code: 'QF-31', semester: 5, status: 'pendiente', credits: 5 },
  { id: 5004, name: 'Bioquímica', code: 'QF-32', semester: 5, status: 'pendiente', credits: 5 },
  { id: 5005, name: 'Farmacología General', code: 'QF-33', semester: 5, status: 'pendiente', credits: 6 },
  { id: 5006, name: 'Gestión de Calidad', code: 'QF-34', semester: 5, status: 'pendiente', credits: 3 },
  // Semestre VI
  { id: 6001, name: 'Microbiología', code: 'QF-35', semester: 6, status: 'pendiente', credits: 5 },
  { id: 6002, name: 'Farmacoquímica I', code: 'QF-36', semester: 6, status: 'pendiente', credits: 5 },
  { id: 6003, name: 'Farmacología de Sistemas I', code: 'QF-37', semester: 6, status: 'pendiente', credits: 5 },
  { id: 6004, name: 'Fisiopatología Molecular', code: 'QF-38', semester: 6, status: 'pendiente', credits: 5 },
  { id: 6005, name: 'Legislación Farmacéutica', code: 'QF-39', semester: 6, status: 'pendiente', credits: 4 },
  { id: 6006, name: 'Fisicoquímica Farmacéutica', code: 'QF-40', semester: 6, status: 'pendiente', credits: 6 },
  // Semestre VII
  { id: 7001, name: 'Fisiopatología y Semiología', code: 'QF-41', semester: 7, status: 'pendiente', credits: 5 },
  { id: 7002, name: 'Farmacoquímica II', code: 'QF-42', semester: 7, status: 'pendiente', credits: 5 },
  { id: 7003, name: 'Farmacología de Sistemas II', code: 'QF-43', semester: 7, status: 'pendiente', credits: 6 },
  { id: 7004, name: 'Salud Pública', code: 'QF-44', semester: 7, status: 'pendiente', credits: 3 },
  { id: 7005, name: 'Tecnología Farmacéutica I', code: 'QF-45', semester: 7, status: 'pendiente', credits: 6 },
  { id: 7006, name: 'Operaciones Unitarias para Q&F', code: 'QF-46', semester: 7, status: 'pendiente', credits: 5 },
  // Semestre VIII
  { id: 8001, name: 'Análisis de Medicamento, Doping y Drogas de Abuso', code: 'QF-47', semester: 8, status: 'pendiente', credits: 5 },
  { id: 8002, name: 'Nutrición Clínica', code: 'QF-48', semester: 8, status: 'pendiente', credits: 3 },
  { id: 8003, name: 'Bioquímica Clínica', code: 'QF-49', semester: 8, status: 'pendiente', credits: 4 },
  { id: 8004, name: 'Biofarmacia y Farmacocinética', code: 'QF-50', semester: 8, status: 'pendiente', credits: 6 },
  { id: 8005, name: 'Tecnología Farmacéutica II', code: 'QF-51', semester: 8, status: 'pendiente', credits: 6 },
  { id: 8006, name: 'Administración y Gestión Farmacéutica', code: 'QF-52', semester: 8, status: 'pendiente', credits: 3 },
  { id: 8007, name: 'Estadística Farmacéutica', code: 'QF-53', semester: 8, status: 'pendiente', credits: 3 },
  // Semestre IX
  { id: 9001, name: 'Farmacología Clínica', code: 'QF-54', semester: 9, status: 'pendiente', credits: 6 },
  { id: 9002, name: 'Bromatología', code: 'QF-55', semester: 9, status: 'pendiente', credits: 4 },
  { id: 9003, name: 'Toxicología', code: 'QF-56', semester: 9, status: 'pendiente', credits: 5 },
  { id: 9004, name: 'Farmacia Asistencial', code: 'QF-57', semester: 9, status: 'pendiente', credits: 4 },
  { id: 9005, name: 'Tecnología Cosmética', code: 'QF-58', semester: 9, status: 'pendiente', credits: 4 },
  { id: 9006, name: 'Electivo Especializado IX', code: 'ELECT-IX', semester: 9, status: 'pendiente', credits: 7 },
  // Semestre X
  { id: 10001, name: 'Farmacia Clínica', code: 'QF-60', semester: 10, status: 'pendiente', credits: 5 },
  { id: 10002, name: 'Práctica Profesional en Farmacia Comunitaria', code: 'QF-61', semester: 10, status: 'pendiente', credits: 7 },
  { id: 10003, name: 'Biotecnología Farmacéutica', code: 'QF-62', semester: 10, status: 'pendiente', credits: 4 },
  { id: 10004, name: 'Economía en Salud y Marketing Farmacéutico', code: 'QF-63', semester: 10, status: 'pendiente', credits: 3 },
  { id: 10005, name: 'Innovación y Proyectos', code: 'QF-64', semester: 10, status: 'pendiente', credits: 3 },
  { id: 10006, name: 'Electivos Especializados X', code: 'ELECT-X', semester: 10, status: 'pendiente', credits: 8 },
  // Semestre XI
  { id: 11001, name: 'Actividad Final de Titulación', code: 'QF-67', semester: 11, status: 'pendiente', credits: 30 },
];


const curriculumWithMetadata = QYF_UCHILE_CURRICULUM.map(c => ({
  ...c,
  prerequisites: [],
  line: c.semester <= 4 ? 'Básica' : c.semester >= 5 ? 'Especializada' : 'General'
}));

const makeQyFSubject = (c: CurriculumSubject): Subject => ({
  id: c.id,
  name: c.name,
  code: c.code,
  teacher: 'Por configurar',
  color: '#e11d48',
  classroom: 'Por configurar',
  hasExemption: true,
  exemptionGrade: 5.0,
  examWeight: 30,
  isExamFailingRule: true,
  minGradeForOneOpportunity: 3.5,
  minGradeForTwoOpportunities: 3.9,
  semesterInCurriculum: c.semester,
  credits: c.credits,
  notes: '',
  prerequisites: c.prerequisites || [],
  examGrade: null,
  examGrade2: null,
  scheduleBlocks: [],
  evaluations: []
});

interface Evaluation {
  id: number;
  name: string;
  grade: number | null;
  weight: number;
  type: 'control' | 'certamen' | 'trabajo' | 'examen';
}

interface ScheduleBlock {
  id: number;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
  startTime: string;
  endTime: string;
  subjectName: string;
  room: string;
  color: string;
  semester: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  teacher: string;
  color: string;
  classroom: string;
  hasExemption: boolean;
  exemptionGrade: number;
  examWeight: number;
  isExamFailingRule: boolean;
  minGradeForOneOpportunity: number;
  minGradeForTwoOpportunities: number;
  semesterInCurriculum: number;
  credits: number;
  notes: string;
  prerequisites: string[];
  examGrade?: number | null;
  examGrade2?: number | null;
  scheduleBlocks: ScheduleBlock[];
  evaluations: Evaluation[];
}

interface ArchivedSemester {
  id: number;
  name: string;
  date: string;
  subjects: Subject[];
  finalAverage: string;
}

interface Habit {
  id: number;
  name: string;
  category: string;
  icon: string;
  streak: number;
  completed: boolean;
  frequency?: 'daily' | 'weekly';
  weeklyTarget?: number;
  isBad?: boolean;
  hasEndDate?: boolean;
  endDate?: string;
}

interface ShoppingItem {
  id: number;
  title: string;
  category: 'Ropa' | 'Tecnología' | 'Salud' | 'Lifestyle' | 'Fitness' | 'Skincare' | 'Ocio' | 'Otros';
  emoji?: string;
  completed: boolean;
}

interface AcademicTask {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  startTime?: string;
  endTime?: string;
  isExtracurricular?: boolean;
  type: 'Certamen' | 'Control' | 'Examen' | 'Laboratorio' | 'Proyecto' | 'Tarea';
  weight: number;
  notes?: string;
  completed: boolean;
  addToCalendar?: boolean;
  evaluationId?: number;
  reminder?: 'none' | '1h' | '1d' | '1w' | 'daily' | 'weekly';
}

interface PersonalTodo {
  id: number;
  title: string;
  category: 'Personal' | 'Universidad' | 'Compras' | 'Salud' | 'Trámites' | 'Otro';
  dueDate: string;
  priority: 'Alta' | 'Media' | 'Baja';
  completed: boolean;
  addToCalendar?: boolean;
  dueTime?: string;
  reminder?: 'none' | '1h' | '1d' | '1w' | 'daily' | 'weekly';
}

interface SavingGoal {
  id: number;
  title: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  hasDeadline: boolean;
  deadline?: string;
}

interface BankAccount {
  id: string;
  name: string;
  type: 'debito' | 'efectivo' | 'ahorro' | 'inversion' | 'credito';
  balance: number;
  color: string;
}

interface Transaction {
  id: number;
  accountId: string;
  type: 'ingreso' | 'gasto';
  amount: number;
  description: string;
  category?: string;
  date: string;
  balanceAfter: number;
}

interface CurriculumSubject {
  id: number;
  name: string;
  code: string;
  semester: number;
  status: 'pendiente' | 'cursando' | 'aprobado' | 'reprobado';
  credits: number;
  finalGrade?: number | null;
  prerequisites?: string[];
  line?: string;
}


interface AcademicBreak {
  id: number;
  title: string;
  type: 'receso' | 'paro';
  startDate: string;
  endDate: string;
}

interface WebBookmark {
  id: number;
  title: string;
  url: string;
  category: 'Universidad' | 'Estudio' | 'Herramientas' | 'Ocio';
  icon: string;
  imageUrl?: string;
}

const CHILE_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Año Nuevo',
  '2026-04-03': 'Viernes Santo',
  '2026-04-04': 'Sábado Santo',
  '2026-05-01': 'Día del Trabajador',
  '2026-05-21': 'Glorias Navales',
  '2026-06-21': 'Pueblos Indígenas',
  '2026-06-29': 'San Pedro y San Pablo',
  '2026-07-16': 'Virgen del Carmen',
  '2026-08-15': 'Asunción de la Virgen',
  '2026-09-18': 'Fiestas Patrias',
  '2026-09-19': 'Glorias del Ejército',
  '2026-09-20': 'Feriado Fiestas Patrias',
  '2026-10-12': 'Encuentro de Dos Mundos',
  '2026-10-31': 'Iglesias Evangélicas',
  '2026-11-01': 'Todos los Santos',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad'
};

const HABIT_ICONS = ['🏋️', '🏃', '📚', '💧', '🧘', '📝', '🌙', '🥗', '🎯', '💪'];
const GOAL_EMOJIS = ['🎯', '👟', '👕', '📱', '💻', '🚗', '✈️', '🎮', '🎧', '🏋️'];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

type MoneyPoint = { label: string; value: number; detail?: string };
const formatCLPValue = (v: number) => '$' + Math.round(v || 0).toLocaleString('es-CL');

function MoneyLineChart({ data, theme, title }: { data: MoneyPoint[]; theme: any; title: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760, height = 280;
  const pad = { left: 74, right: 24, top: 28, bottom: 42 };
  const innerW = width - pad.left - pad.right, innerH = height - pad.top - pad.bottom;
  const values = data.length ? data.map(p => p.value) : [0];
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || Math.max(Math.abs(max), 1);
  const yMin = min - range * 0.12, yMax = max + range * 0.12;
  const x = (i: number) => pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const gridValues = [0, .25, .5, .75, 1].map(t => yMin + (yMax - yMin) * t);

  return <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '20px', overflow: 'hidden' }}>
    <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '8px' }}>Pasa el mouse por los puntos para ver el dato exacto. También puedes hacer clic.</div>
    {data.length === 0 ? <div style={{ height: height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, fontSize: '12px' }}>Aún no hay movimientos registrados.</div> :
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
          {gridValues.map((gv, i) => <g key={i}>
            <line x1={pad.left} x2={width-pad.right} y1={y(gv)} y2={y(gv)} stroke={theme.cardBorder} strokeDasharray="4 5" />
            <text x={pad.left-10} y={y(gv)+4} textAnchor="end" fontSize="10" fill={theme.textMuted}>{formatCLPValue(gv)}</text>
          </g>)}
          <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height-pad.bottom} stroke={theme.cardBorder} />
          <line x1={pad.left} x2={width-pad.right} y1={height-pad.bottom} y2={height-pad.bottom} stroke={theme.cardBorder} />
          <polyline points={data.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke={theme.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((p,i)=><g key={i} onMouseEnter={()=>setActiveIndex(i)} onMouseLeave={()=>setActiveIndex(null)} onClick={()=>setActiveIndex(i)} style={{cursor:'pointer'}}>
            <circle cx={x(i)} cy={y(p.value)} r={activeIndex===i?6:4} fill={theme.primary} stroke={theme.card} strokeWidth="2" />
            <text x={x(i)} y={height-16} textAnchor="middle" fontSize="9" fill={theme.textMuted}>{p.label}</text>
          </g>)}
        </svg>
        {activeIndex !== null && data[activeIndex] && <div style={{position:'absolute', left:`${Math.min(Math.max((x(activeIndex)/width)*100,8),84)}%`, top:'8px', transform:'translateX(-50%)', backgroundColor:theme.card, border:`1px solid ${theme.cardBorder}`, borderRadius:'10px', padding:'8px 10px', boxShadow:'0 8px 24px rgba(0,0,0,.25)', pointerEvents:'none', whiteSpace:'nowrap', zIndex:2}}>
          <div style={{fontSize:'10px', color:theme.textMuted}}>{data[activeIndex].detail || data[activeIndex].label}</div>
          <strong style={{fontSize:'14px'}}>{formatCLPValue(data[activeIndex].value)}</strong>
        </div>}
      </div>}
  </div>;
}


const compressDashboardImage = (file: File, maxOutputBytes = 1400000): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) return reject(new Error('El archivo no es una imagen.'));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
  reader.onload = () => {
    const img = new window.Image();
    img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    img.onload = () => {
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Tu navegador no permite procesar la imagen.'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      const attempt = () => {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.length <= maxOutputBytes * 1.37 || quality <= 0.45) return resolve(data);
        quality -= 0.07;
        attempt();
      };
      attempt();
    };
    img.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});

const LIFEOS_V9_CSS = `
  :root {
    --lifeos-radius: 16px;
    --lifeos-shadow: 0 10px 28px rgba(0,0,0,.08);
  }
  html, body, #root { min-height: 100%; }
  body { margin: 0; background: #090909; }
  button, input, select, textarea { font: inherit; }
  button { transition: background .16s ease, border-color .16s ease, opacity .16s ease; }
  button:hover { opacity: .92; }
  input, select, textarea { min-width: 0; }
  .lifeos-app-shell { width: 100%; }
  @media (max-width: 639px) {
    body { overflow-x: hidden; }
    .lifeos-desktop-only { display: none !important; }
    .lifeos-mobile-only { display: flex !important; }
  }
  @media (min-width: 640px) {
    .lifeos-mobile-only { display: none !important; }
  }
  @media (min-width: 640px) and (max-width: 1100px) {
    .lifeos-main { padding-left: 22px !important; padding-right: 22px !important; }
  }

  .lifeos-dashboard { max-width: 1180px; margin: 0 auto; }
  .lifeos-dashboard-header { display:flex; justify-content:space-between; align-items:center; gap:24px; padding:22px 24px; margin-bottom:14px; background:linear-gradient(135deg, #151515, #202020); color:#f5f5f5; border:1px solid #2d2d2d; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.12); }
  .lifeos-overline { display:block; font-size:9px; font-weight:900; letter-spacing:.12em; color:#858585; text-transform:uppercase; }
  .lifeos-dashboard-title-row { display:flex; align-items:center; gap:14px; margin-top:7px; }
  .lifeos-date-big { font-size:46px; line-height:.9; font-weight:900; letter-spacing:-.06em; }
  .lifeos-date-week { font-size:10px; color:#aaa; text-transform:capitalize; }
  .lifeos-dashboard-header h1 { margin:2px 0 2px; font-size:18px; letter-spacing:-.025em; }
  .lifeos-dashboard-header p { margin:0; font-size:11px; color:#a4a4a4; }
  .lifeos-header-actions { display:flex; gap:7px; flex-shrink:0; }
  .lifeos-header-actions button { display:flex; align-items:center; gap:5px; border:1px solid #3a3a3a; background:#292929; color:#fff; border-radius:9px; padding:9px 11px; font-size:11px; font-weight:800; cursor:pointer; }
  .lifeos-dashboard-grid { display:grid; gap:10px; margin-bottom:10px; }
  .lifeos-dashboard-grid-top { grid-template-columns:1fr 1.75fr 1fr; }
  .lifeos-dashboard-grid-middle { grid-template-columns:2fr 1fr; }
  .lifeos-dashboard-grid-bottom { grid-template-columns:1fr 1fr 1fr; }
  .lifeos-dash-card, .lifeos-dashboard-footer-card { background:var(--lifeos-card-bg, #141416); border:1px solid var(--lifeos-card-border, #27272a); border-radius:12px; padding:15px; min-width:0; }
  .lifeos-dash-tall { min-height:220px; display:flex; flex-direction:column; }
  .lifeos-card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; color:var(--lifeos-text, #f4f4f5); }
  .lifeos-card-head h3 { margin:4px 0 0; font-size:13px; font-weight:900; letter-spacing:-.015em; }
  .lifeos-card-head > svg { color:var(--lifeos-muted, #8e8e93); flex-shrink:0; }
  .lifeos-task-list { display:flex; flex-direction:column; gap:3px; margin-top:12px; flex:1; }
  .lifeos-mini-row { display:flex; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid var(--lifeos-card-border, #27272a); min-width:0; }
  .lifeos-mini-row:last-child { border-bottom:0; }
  .lifeos-mini-row > div { min-width:0; }
  .lifeos-mini-row strong, .lifeos-habit-row span:nth-child(2), .lifeos-upcoming-row strong, .lifeos-goal-row strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; font-weight:800; color:var(--lifeos-text, #f4f4f5); }
  .lifeos-mini-row small, .lifeos-habit-row small, .lifeos-upcoming-row small, .lifeos-goal-row small { display:block; margin-top:2px; color:var(--lifeos-muted, #8e8e93); font-size:9px; }
  .lifeos-check-dot, .lifeos-time-dot { width:7px; height:7px; border:1px solid #777; border-radius:50%; flex-shrink:0; }
  .lifeos-time-dot { border-radius:2px; }
  .lifeos-text-button { margin-top:10px; padding:0; border:0; background:none; color:var(--lifeos-muted, #8e8e93); font-size:9px; font-weight:900; cursor:pointer; text-align:left; }
  .lifeos-money-big { margin-top:18px; font-size:34px; font-weight:900; letter-spacing:-.05em; color:var(--lifeos-text, #f4f4f5); }
  .lifeos-grade-big { margin-top:16px; font-size:36px; font-weight:900; letter-spacing:-.05em; }
  .lifeos-muted-line { margin-top:3px; color:var(--lifeos-muted, #8e8e93); font-size:9px; }
  .lifeos-balance-rule { height:1px; background:var(--lifeos-card-border, #27272a); margin:20px 0 10px; }
  .lifeos-mini-stat, .lifeos-sct-line { display:flex; justify-content:space-between; align-items:center; gap:8px; color:var(--lifeos-muted, #8e8e93); font-size:9px; }
  .lifeos-mini-stat strong, .lifeos-sct-line strong { color:var(--lifeos-text, #f4f4f5); font-size:11px; }
  .lifeos-ring { width:35px; height:35px; border:2px solid #555; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; }
  .lifeos-habit-row { display:grid; grid-template-columns:16px minmax(0,1fr) auto; align-items:center; gap:6px; width:100%; padding:7px 0; border:0; border-bottom:1px solid var(--lifeos-card-border, #27272a); background:none; color:var(--lifeos-text, #f4f4f5); text-align:left; cursor:pointer; }
  .lifeos-habit-box { width:13px; height:13px; border:1px solid #666; border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:8px; }
  .lifeos-habit-box.done { background:#f4f4f5; color:#111; border-color:#f4f4f5; }
  .lifeos-upcoming-row { display:flex; justify-content:space-between; gap:12px; align-items:center; padding:9px 0; border-bottom:1px solid var(--lifeos-card-border, #27272a); }
  .lifeos-upcoming-row > div { min-width:0; }
  .lifeos-upcoming-row > span { color:var(--lifeos-muted, #8e8e93); font-size:9px; white-space:nowrap; }
  .lifeos-goal-row { padding:6px 0 9px; border-bottom:1px solid var(--lifeos-card-border, #27272a); }
  .lifeos-progress { height:5px; margin-top:7px; background:rgba(128,128,128,.18); border-radius:99px; overflow:hidden; }
  .lifeos-progress span { display:block; height:100%; background:var(--lifeos-text, #f4f4f5); border-radius:99px; }
  .lifeos-progress-large { height:8px; margin:16px 0 8px; }
  .lifeos-goal-pct { text-align:right; margin-top:3px !important; }
  .lifeos-empty { color:var(--lifeos-muted, #8e8e93); font-size:10px; line-height:1.5; padding:15px 0; }
  .lifeos-dashboard-footer-card { display:flex; justify-content:space-between; align-items:center; gap:18px; margin-top:2px; background:transparent; }
  .lifeos-dashboard-footer-card > div { min-width:0; }
  .lifeos-dashboard-footer-card strong { display:block; margin-top:4px; font-size:12px; }
  .lifeos-dashboard-footer-card span:last-child { display:block; margin-top:3px; color:var(--lifeos-muted, #8e8e93); font-size:9px; }
  .lifeos-dashboard-footer-card button { display:flex; align-items:center; gap:5px; flex-shrink:0; border:1px solid var(--lifeos-card-border, #27272a); background:var(--lifeos-card, #141416); color:var(--lifeos-text, #f4f4f5); border-radius:8px; padding:8px 10px; font-size:9px; font-weight:900; cursor:pointer; }
  .lifeos-dashboard .lifeos-span-2 { min-width:0; }
  :root { --lifeos-card-bg: #141416; --lifeos-card-border:#27272a; --lifeos-text:#f4f4f5; --lifeos-muted:#8e8e93; --lifeos-card:#141416; }

  @media (max-width: 639px) {
    .lifeos-main { padding: 12px !important; }
    .lifeos-card { border-radius: 14px !important; }
    .lifeos-calendar-grid { overflow-x: auto; padding-bottom: 4px; }
    .lifeos-calendar-grid-inner { min-width: 640px; }

    .lifeos-dashboard { width:100%; }
    .lifeos-dashboard-header { padding:16px; border-radius:12px; align-items:flex-start; flex-direction:column; }
    .lifeos-dashboard-title-row { gap:11px; }
    .lifeos-date-big { font-size:38px; }
    .lifeos-dashboard-header h1 { font-size:16px; }
    .lifeos-header-actions { width:100%; }
    .lifeos-header-actions button { flex:1; justify-content:center; }
    .lifeos-dashboard-grid-top, .lifeos-dashboard-grid-middle, .lifeos-dashboard-grid-bottom { grid-template-columns:1fr; }
    .lifeos-dash-card, .lifeos-dashboard-footer-card { border-radius:11px; padding:13px; }
    .lifeos-dash-tall { min-height:0; }
    .lifeos-money-big { font-size:30px; }
    .lifeos-upcoming-row { align-items:flex-start; }
    .lifeos-upcoming-row > span { white-space:normal; text-align:right; }
    .lifeos-dashboard-footer-card { align-items:flex-start; flex-direction:column; }
    .lifeos-dashboard-footer-card button { width:100%; justify-content:center; }
  }
`;


function DashboardMiniLine({ data, theme }: { data: MoneyPoint[]; theme: any }) {
  const values = data.length ? data.map(p=>Number(p.value)||0) : [0];
  const min = Math.min(...values), max = Math.max(...values), range = max-min || Math.max(1,Math.abs(max)*0.08);
  const points = values.map((v,i)=>{const x=data.length<=1?50:(i/(data.length-1))*100; const y=92-((v-(min-range*.15))/(range*1.3))*78; return `${x},${Math.max(8,Math.min(92,y))}`;}).join(' ');
  return <svg viewBox='0 0 100 100' preserveAspectRatio='none' width='100%' height='100%'><line x1='0' y1='92' x2='100' y2='92' stroke={theme.cardBorder}/><polyline points={points} fill='none' stroke={theme.text} strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'/></svg>;
}

export default function App() {
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('lifeos_dark');
      return s !== null ? JSON.parse(s) : true;
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState<'inicio' | 'estudios' | 'habitos' | 'finanzas' | 'todos' | 'calendario' | 'enlaces' | 'ajustes'>('inicio');
  const [studySubTab, setStudySubTab] = useState<'semestre' | 'materias' | 'malla' | 'horario' | 'calendario' | 'historial'>('materias');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [todoFilter, setTodoFilter] = useState<'Todas' | 'Pendientes' | 'Completadas'>('Todas');
  const [habitSubTab, setHabitSubTab] = useState<'dia' | 'semana' | 'mes'>('dia');

  const [dashboardAccountFilter, setDashboardAccountFilter] = useState<string>(() => localStorage.getItem('lifeos_dash_acc_filter') || 'all');
  const [dashboardBackground, setDashboardBackground] = useState<string>(() => localStorage.getItem('lifeos_dashboard_bg') || '');
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => { try { return localStorage.getItem('lifeos_sounds_enabled') !== 'false'; } catch { return true; } });
  const audioContextRef = useRef<AudioContext | null>(null);
  const playUISound = (kind: 'bubble' | 'tick' = 'bubble') => {
    if (!soundsEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'tick' ? 'sine' : 'sine';
      osc.frequency.setValueAtTime(kind === 'tick' ? 1050 : 520, now);
      osc.frequency.exponentialRampToValueAtTime(kind === 'tick' ? 1450 : 780, now + (kind === 'tick' ? 0.045 : 0.09));
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === 'tick' ? 0.065 : 0.042, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'tick' ? 0.065 : 0.12));
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + (kind === 'tick' ? 0.07 : 0.13));
    } catch {}
  };
  useEffect(() => {
    if (!soundsEnabled) return;
    const handleButtonSound = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.noSound === 'true') return;
      const isHabit = Boolean(button.closest('.lifeos-habit-row, .lifeos-habit-check'));
      playUISound(isHabit ? 'tick' : 'bubble');
    };
    document.addEventListener('click', handleButtonSound);
    return () => document.removeEventListener('click', handleButtonSound);
  }, [soundsEnabled]);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'semanal' | 'mensual'>('semanal');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [studentName, setStudentName] = useState<string>(() => localStorage.getItem('lifeos_student_name') || 'Francisco');
  const [currentSemesterName, setCurrentSemesterName] = useState<string>(() => localStorage.getItem('lifeos_sem_name') || 'Semestre 1 - 2027');
  const [careerName, setCareerName] = useState<string>(() => localStorage.getItem('lifeos_career_name') || 'Química y Farmacia — Universidad de Chile');
  const [careerYears, setCareerYears] = useState<number>(() => Number(localStorage.getItem('lifeos_career_years')) || 5.5);
  const [currentSemesterNumber, setCurrentSemesterNumber] = useState<number>(() => Number(localStorage.getItem('lifeos_current_sem_num')) || 1);
  const [spotifyEmbedUrl] = useState<string>(() => localStorage.getItem('lifeos_spotify') || 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator&theme=0');

  const [semStartDate, setSemStartDate] = useState<string>(() => localStorage.getItem('lifeos_sem_start') || '2027-03-01');
  const [semEndDate, setSemEndDate] = useState<string>(() => localStorage.getItem('lifeos_sem_end') || '2027-07-15');
  const defaultSemesterDates = Array.from({ length: 11 }, (_, i) => {
    const semester = i + 1;
    const year = 2027 + Math.floor(i / 2);
    return semester % 2 === 1
      ? { start: `${year}-03-01`, end: `${year}-07-15` }
      : { start: `${year}-08-01`, end: `${year}-12-20` };
  });
  const [semesterDateConfig, setSemesterDateConfig] = useState<Record<number, { start: string; end: string }>>(() => {
    try {
      const saved = localStorage.getItem('lifeos_semester_dates');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...Object.fromEntries(defaultSemesterDates.map((d, i) => [i + 1, d])), ...parsed };
      }
    } catch {}
    return Object.fromEntries(defaultSemesterDates.map((d, i) => [i + 1, d]));
  });
  const activeSemesterDates = semesterDateConfig[currentSemesterNumber] || { start: semStartDate, end: semEndDate };


  const [academicBreaks, setAcademicBreaks] = useState<AcademicBreak[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_academic_breaks');
      if (s) return JSON.parse(s);
    } catch {}
    return [
      { id: 1, title: 'Semana de Receso Fiestas Patrias', type: 'receso', startDate: '2026-09-14', endDate: '2026-09-20' }
    ];
  });

  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('');
  const [newBookmarkCategory, setNewBookmarkCategory] = useState<WebBookmark['category']>('Universidad');
  const [newBookmarkIcon, setNewBookmarkIcon] = useState('🔗');
  const [newBookmarkImage, setNewBookmarkImage] = useState('');
  const [newBookmarkImageFile, setNewBookmarkImageFile] = useState('');

  const [bookmarks, setBookmarks] = useState<WebBookmark[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_bookmarks');
      if (s) return JSON.parse(s);
    } catch {}
    return [
      { id: 1, title: 'Campus Virtual / U-Cursos', url: 'https://u-cursos.cl', category: 'Universidad', icon: '🎓' }
    ];
  });

  // Modales
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showAcademicTaskModal, setShowAcademicTaskModal] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('lifeos_notifications_enabled') === 'true'; } catch { return false; }
  });
  const [taskReminder, setTaskReminder] = useState<'none' | '1h' | '1d' | '1w' | 'daily' | 'weekly'>('none');
  const [todoReminder, setTodoReminder] = useState<'none' | '1h' | '1d' | '1w' | 'daily' | 'weekly'>('none');


  // Formulario Receso/Paro
  const [breakTitle, setBreakTitle] = useState('');
  const [breakType, setBreakType] = useState<'receso' | 'paro'>('receso');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');

  // Formulario Ramo
  const [subName, setSubName] = useState('');
  const [subTeacher, setSubTeacher] = useState('');
  const [subRoom, setSubRoom] = useState('');
  const [subColor, setSubColor] = useState('#e11d48');
  const [subSemester, setSubSemester] = useState<number>(2);
  const [subCredits, setSubCredits] = useState<string>('5');
  const [subNotes, setSubNotes] = useState('');
  const [numControles, setNumControles] = useState<string>('0');
  const [weightControles, setWeightControles] = useState<string>('0');
  const [numCertamenes, setNumCertamenes] = useState<string>('2');
  const [weightCertamenes, setWeightCertamenes] = useState<string>('35');
  const [numTrabajos, setNumTrabajos] = useState<string>('1');
  const [weightTrabajos, setWeightTrabajos] = useState<string>('30');
  const [hasExemption, setHasExemption] = useState(true);
  const [exemptionGrade, setExemptionGrade] = useState<string>('5.0');
  const [examWeight, setExamWeight] = useState<string>('30');
  const [isExamFailingRule, setIsExamFailingRule] = useState(true);
  const [minGradeForOneOpportunity, setMinGradeForOneOpportunity] = useState<string>('3.5');
  const [minGradeForTwoOpportunities, setMinGradeForTwoOpportunities] = useState<string>('3.9');

  const [subBlocks, setSubBlocks] = useState<Array<{ day: ScheduleBlock['day']; startTime: string; endTime: string }>>([
    { day: 'Lunes', startTime: '08:30', endTime: '10:00' }
  ]);

  // Formulario Evaluación
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskEvaluationId, setTaskEvaluationId] = useState<string>('');
  const [taskType, setTaskType] = useState<'Certamen' | 'Control' | 'Examen' | 'Laboratorio' | 'Proyecto' | 'Tarea'>('Certamen');
  const [taskDate, setTaskDate] = useState('');
  const [isExtracurricular, setIsExtracurricular] = useState(false);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number>(0);
  const [taskStartTime, setTaskStartTime] = useState('08:30');
  const [taskEndTime, setTaskEndTime] = useState('10:00');
  const [taskWeight, setTaskWeight] = useState<string>('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskSyncCalendar, setTaskSyncCalendar] = useState(true);

  // Formulario Cuenta
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'debito' | 'efectivo' | 'ahorro' | 'inversion' | 'credito'>('debito');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccColor, setNewAccColor] = useState('#e11d48');

  // Formulario Hábito
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🏋️');
  const [newHabitCat, setNewHabitCat] = useState('Salud');
  const [newHabitFrequency, setNewHabitFrequency] = useState<'daily'|'weekly'>('daily');
  const [newHabitWeeklyTarget, setNewHabitWeeklyTarget] = useState('3');
  const [newHabitIsBad, setNewHabitIsBad] = useState(false);
  const [newHabitHasEndDate, setNewHabitHasEndDate] = useState(false);
  const [newHabitEndDate, setNewHabitEndDate] = useState('');

  // Formulario To-Do
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState<'Personal' | 'Universidad' | 'Compras' | 'Salud' | 'Trámites' | 'Otro'>('Personal');
  const [newTodoDate, setNewTodoDate] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('09:00');
  const [newTodoPriority, setNewTodoPriority] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [todoSyncCalendar, setTodoSyncCalendar] = useState(true);

  // Lista de compras sin montos
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem('lifeos_shopping_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [newShoppingTitle, setNewShoppingTitle] = useState('');
  const [newShoppingCategory, setNewShoppingCategory] = useState<ShoppingItem['category']>('Ropa');
  const [newShoppingEmoji, setNewShoppingEmoji] = useState('🛍️');
  const [shoppingCategoryFilter, setShoppingCategoryFilter] = useState<'Todos' | ShoppingItem['category']>('Todos');

  // Formulario Meta de Ahorro
  const [goalTitle, setGoalTitle] = useState('');
  const [goalEmoji, setGoalEmoji] = useState('🎯');
  const [goalTarget, setGoalTarget] = useState<string>('');
  const [goalHasDeadline, setGoalHasDeadline] = useState(false);
  const [goalDeadline, setGoalDeadline] = useState('');

  // Formulario Movimiento
  const [transType, setTransType] = useState<'ingreso' | 'gasto'>('gasto');
  const [transAmount, setTransAmount] = useState<string>('');
  const [transDesc, setTransDesc] = useState('');
  const [transDate, setTransDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [transCategory, setTransCategory] = useState('General');

  // Cuentas
  const [accountsList, setAccountsList] = useState<BankAccount[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_accounts_list');
      if (s) return JSON.parse(s);
    } catch {}
    return [
      { id: 'acc_debito', name: 'Cuenta Débito', type: 'debito', balance: 284000, color: '#e11d48' },
      { id: 'acc_efectivo', name: 'Efectivo', type: 'efectivo', balance: 35000, color: '#10b981' },
      { id: 'acc_ahorro', name: 'Cuenta Ahorro', type: 'ahorro', balance: 64000, color: '#ffffff' }
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_transactions');
      if (s) return JSON.parse(s);
    } catch {}
    return [];
  });

  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_saving_goals');
      if (s) return JSON.parse(s);
    } catch {}
    return [
      { id: 1, title: 'Equipamiento Deportivo', emoji: '👟', targetAmount: 120000, currentAmount: 85000, hasDeadline: true, deadline: '2026-10-15' }
    ];
  });

  // Ramos protegidos contra corrupción de tipos
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const seedVersion = localStorage.getItem('lifeos_career_seed_version');
      const s = localStorage.getItem('lifeos_subjects');
      if (seedVersion === LIFEOS_CAREER_SEED_VERSION && s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            id: Number(item.id) || Date.now(),
            name: String(item.name || 'Sin nombre'),
            code: String(item.code || 'ASG'),
            teacher: String(item.teacher || 'Docente'),
            color: String(item.color || '#e11d48'),
            classroom: String(item.classroom || 'Aula'),
            hasExemption: Boolean(item.hasExemption),
            exemptionGrade: Number(item.exemptionGrade) || 5.0,
            examWeight: Number(item.examWeight) || 30,
            isExamFailingRule: Boolean(item.isExamFailingRule !== false),
            minGradeForOneOpportunity: Number(item.minGradeForOneOpportunity) || 3.5,
            minGradeForTwoOpportunities: Number(item.minGradeForTwoOpportunities) || 3.9,
            semesterInCurriculum: Number(item.semesterInCurriculum) || 2,
            credits: Number(item.credits) || 5,
                      notes: String(item.notes || ''),
            prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites : [],
            examGrade: item.examGrade !== null && item.examGrade !== undefined ? Number(item.examGrade) : null,
            examGrade2: item.examGrade2 !== null && item.examGrade2 !== undefined ? Number(item.examGrade2) : null,
            scheduleBlocks: Array.isArray(item.scheduleBlocks) ? item.scheduleBlocks : [],
            evaluations: Array.isArray(item.evaluations) ? item.evaluations.map((ev: any) => ({
              id: Number(ev.id) || Math.random(),
              name: String(ev.name || 'Evaluación'),
              grade: ev.grade !== null && ev.grade !== undefined && ev.grade !== '' ? Number(ev.grade) : null,
              weight: Number(ev.weight) || 0,
              type: ev.type || 'certamen'
            })) : []
          }));
        }
      }
    } catch {}
    return curriculumWithMetadata.filter(c => c.semester === 1).map(makeQyFSubject);
  });

  const [curriculum, setCurriculum] = useState<CurriculumSubject[]>(() => {
    try {
      const seedVersion = localStorage.getItem('lifeos_career_seed_version');
      const s = localStorage.getItem('lifeos_curriculum');
      if (seedVersion === LIFEOS_CAREER_SEED_VERSION && s) return JSON.parse(s);
    } catch {}
    return curriculumWithMetadata;
  });

  const [archivedSemesters, setArchivedSemesters] = useState<ArchivedSemester[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_archived_semesters');
      if (s) return JSON.parse(s);
    } catch {}
    return [];
  });

  // HÁBITOS BLINDADOS (Elimina la pantalla en negro al inicializar)
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_habits');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((h: any) => ({
            id: Number(h.id) || Date.now(),
            name: String(h.name || 'Hábito'),
            category: String(h.category || 'Salud'),
            icon: String(h.icon || '🏋️'),
            streak: Number(h.streak) || 0,
            completed: Boolean(h.completed),
            frequency: h.frequency === 'weekly' ? 'weekly' : 'daily',
            weeklyTarget: Math.min(7, Math.max(1, Number(h.weeklyTarget) || 3)),
            isBad: Boolean(h.isBad),
            hasEndDate: Boolean(h.hasEndDate),
            endDate: typeof h.endDate === 'string' ? h.endDate : ''
          }));
        }
      }
    } catch {}
    return [
      { id: 1, name: 'Entrenamiento Gimnasio', category: 'Salud', icon: '🏋️', streak: 6, completed: true },
      { id: 2, name: 'Beber 2.5L de agua', category: 'Salud', icon: '💧', streak: 12, completed: true }
    ];
  });


  const [habitLog, setHabitLog] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('lifeos_habit_log');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });



  const [whatIfSubjectId, setWhatIfSubjectId] = useState<number | null>(null);
  const [whatIfGrades, setWhatIfGrades] = useState<Record<number, string>>({});
  const [whatIfTargetGrade, setWhatIfTargetGrade] = useState<number>(4.0);

  const [academicTasks, setAcademicTasks] = useState<AcademicTask[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_academic_tasks');
      if (s) return JSON.parse(s);
    } catch {}
    return [];
  });

  const [personalTodos, setPersonalTodos] = useState<PersonalTodo[]>(() => {
    try {
      const s = localStorage.getItem('lifeos_personal_todos');
      if (s) return JSON.parse(s);
    } catch {}
    return [];
  });

  // Sincronización en la nube
  const [cloudSession, setCloudSession] = useState<LifeOSCloudSession | null>(() => getStoredCloudSession());
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'offline' | 'syncing' | 'synced' | 'error'>('offline');
  const [cloudMessage, setCloudMessage] = useState('');
  const [cloudLastSync, setCloudLastSync] = useState('');
  const cloudSyncBusyRef = useRef(false);
  const cloudInitialSyncRef = useRef(false);

  // Guardado persistente
  useEffect(() => {
    try {
      localStorage.setItem('lifeos_dark', JSON.stringify(darkMode));
      localStorage.setItem('lifeos_student_name', studentName);
      localStorage.setItem('lifeos_sem_name', currentSemesterName);
      localStorage.setItem('lifeos_career_name', careerName);
      localStorage.setItem('lifeos_career_years', String(careerYears));
      localStorage.setItem('lifeos_current_sem_num', String(currentSemesterNumber));
      localStorage.setItem('lifeos_dash_acc_filter', dashboardAccountFilter);
      localStorage.setItem('lifeos_dashboard_bg', dashboardBackground);
      localStorage.setItem('lifeos_sounds_enabled', String(soundsEnabled));
      localStorage.setItem('lifeos_sem_start', semStartDate);
      localStorage.setItem('lifeos_sem_end', semEndDate);
      localStorage.setItem('lifeos_semester_dates', JSON.stringify(semesterDateConfig));
      localStorage.setItem('lifeos_academic_breaks', JSON.stringify(academicBreaks));
      localStorage.setItem('lifeos_bookmarks', JSON.stringify(bookmarks));
      localStorage.setItem('lifeos_curriculum', JSON.stringify(curriculum));
      localStorage.setItem('lifeos_spotify', spotifyEmbedUrl);
      localStorage.setItem('lifeos_accounts_list', JSON.stringify(accountsList));
      localStorage.setItem('lifeos_transactions', JSON.stringify(transactions));
      localStorage.setItem('lifeos_saving_goals', JSON.stringify(savingGoals));
      localStorage.setItem('lifeos_subjects', JSON.stringify(subjects));
      localStorage.setItem('lifeos_archived_semesters', JSON.stringify(archivedSemesters));
      localStorage.setItem('lifeos_habits', JSON.stringify(habits));
      localStorage.setItem('lifeos_academic_tasks', JSON.stringify(academicTasks));
      localStorage.setItem('lifeos_personal_todos', JSON.stringify(personalTodos));
      localStorage.setItem('lifeos_shopping_items', JSON.stringify(shoppingItems));
      localStorage.setItem('lifeos_habit_log', JSON.stringify(habitLog));
      localStorage.setItem('lifeos_notifications_enabled', String(notificationsEnabled));
      localStorage.setItem('lifeos_career_seed_version', LIFEOS_CAREER_SEED_VERSION);
    } catch (e) {
      console.error(e);
    }
  }, [darkMode, studentName, currentSemesterName, careerName, careerYears, currentSemesterNumber, dashboardAccountFilter, dashboardBackground, soundsEnabled, semStartDate, semEndDate, semesterDateConfig, academicBreaks, bookmarks, curriculum, spotifyEmbedUrl, accountsList, transactions, savingGoals, subjects, archivedSemesters, habits, habitLog, academicTasks, personalTodos, shoppingItems, notificationsEnabled]);

  const runCloudSync = async (mode: 'auto' | 'push' | 'pull' = 'auto') => {
    if (!cloudConfigured()) {
      setCloudStatus('error');
      setCloudMessage('Configura Supabase en .env.local para activar la nube.');
      return;
    }
    if (cloudSyncBusyRef.current) return;
    cloudSyncBusyRef.current = true;
    setCloudStatus('syncing');
    try {
      let session = await ensureCloudSession();
      if (!session) {
        setCloudStatus('offline');
        setCloudMessage('Inicia sesión para sincronizar este dispositivo.');
        return;
      }
      if (session !== cloudSession) setCloudSession(session);

      const localSnapshot = getLifeOSLocalSnapshot();
      const localSignature = getSnapshotSignature(localSnapshot);
      const meta = getCloudMeta();
      const remote = await cloudGetRow(session);

      if (mode === 'pull') {
        if (!remote) {
          setCloudMessage('Todavía no existe una copia en la nube.');
        } else {
          cloudApplySnapshot(remote.data || {});
          const signature = getSnapshotSignature(remote.data || {});
          saveCloudMeta({ updatedAt: remote.updated_at, signature });
          setCloudLastSync(remote.updated_at);
          setCloudMessage('Datos descargados desde la nube.');
          window.location.reload();
          return;
        }
      } else if (mode === 'push') {
        const pushed = await cloudPushSnapshot(session, localSnapshot);
        const signature = getSnapshotSignature(localSnapshot);
        saveCloudMeta({ updatedAt: pushed.updated_at, signature });
        setCloudLastSync(pushed.updated_at);
        setCloudMessage('Este dispositivo subió sus datos a LifeOS Cloud.');
      } else if (remote && (!meta.updatedAt || new Date(remote.updated_at).getTime() > new Date(meta.updatedAt).getTime()) && remote.updated_at !== meta.updatedAt) {
        // Primera conexión de un dispositivo: si ya existe una copia remota, esa copia es la fuente de verdad.
        cloudApplySnapshot(remote.data || {});
        const signature = getSnapshotSignature(remote.data || {});
        saveCloudMeta({ updatedAt: remote.updated_at, signature });
        setCloudLastSync(remote.updated_at);
        setCloudMessage('Encontré una versión más nueva en la nube. Actualizando este dispositivo…');
        window.location.reload();
        return;
      } else if (!remote) {
        const pushed = await cloudPushSnapshot(session, localSnapshot);
        saveCloudMeta({ updatedAt: pushed.updated_at, signature: localSignature });
        setCloudLastSync(pushed.updated_at);
        setCloudMessage('Primera copia creada en la nube.');
      } else if (localSignature !== meta.signature) {
        const pushed = await cloudPushSnapshot(session, localSnapshot);
        saveCloudMeta({ updatedAt: pushed.updated_at, signature: localSignature });
        setCloudLastSync(pushed.updated_at);
        setCloudMessage('Cambios guardados en la nube.');
      } else {
        setCloudLastSync(remote.updated_at);
        setCloudMessage('Todo sincronizado.');
      }
      setCloudStatus('synced');
    } catch (error: any) {
      const message = String(error?.message || error || 'Error de sincronización');
      if (/jwt|token|refresh|unauthorized|401/i.test(message)) {
        saveStoredCloudSession(null);
        setCloudSession(null);
      }
      setCloudStatus('error');
      setCloudMessage(message);
    } finally {
      cloudSyncBusyRef.current = false;
    }
  };

  const handleCloudLogin = async (signUp = false) => {
    if (!cloudEmail.trim() || cloudPassword.length < 6) {
      setCloudMessage('Usa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }
    setCloudBusy(true);
    setCloudStatus('syncing');
    try {
      const session = signUp ? await cloudSignUp(cloudEmail.trim(), cloudPassword) : await cloudSignIn(cloudEmail.trim(), cloudPassword);
      if (!session) {
        setCloudStatus('offline');
        setCloudMessage('Cuenta creada. Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
        return;
      }
      setCloudSession(session);
      setCloudPassword('');
      setCloudMessage(signUp ? 'Cuenta creada. Preparando tu sincronización…' : 'Sesión iniciada.');
      await runCloudSync('auto');
    } catch (error: any) {
      setCloudStatus('error');
      setCloudMessage(String(error?.message || error || 'No se pudo iniciar sesión.'));
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCloudLogout = async () => {
    setCloudBusy(true);
    await cloudSignOut();
    setCloudSession(null);
    setCloudStatus('offline');
    setCloudLastSync('');
    setCloudMessage('Sesión cerrada. Tus datos locales siguen en este dispositivo.');
    setCloudBusy(false);
  };

  useEffect(() => {
    if (!cloudSession || !cloudConfigured()) return;
    if (!cloudInitialSyncRef.current) {
      cloudInitialSyncRef.current = true;
      void runCloudSync('auto');
    }
    const timer = window.setInterval(() => void runCloudSync('auto'), 7000);
    return () => window.clearInterval(timer);
  }, [Boolean(cloudSession), cloudConfigured()]);

  const formatCLP = (v: number) => '$' + Math.round(v || 0).toLocaleString('es-CL');
  const habitsDone = habits.filter(h => h.completed).length;
  const pendingAcademicTasks = academicTasks.filter(t => !t.completed).length;
  const pendingTodos = personalTodos.filter(t => !t.completed).length;

  const reminderLabels: Record<string, string> = { none: 'Sin aviso', '1h': '1 hora antes', '1d': '1 día antes', '1w': '1 semana antes', daily: 'Periódicamente: cada día', weekly: 'Periódicamente: cada semana' };

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Este navegador no soporta notificaciones.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      new Notification('LifeOS', { body: 'Notificaciones activadas.' });
    } else {
      setNotificationsEnabled(false);
      alert('Las notificaciones no fueron autorizadas en el navegador.');
    }
  };

  const disableNotifications = () => {
    setNotificationsEnabled(false);
  };

  useEffect(() => {
    if (!notificationsEnabled || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    const run = () => {
      const now = new Date();
      const sent = (() => { try { return JSON.parse(localStorage.getItem('lifeos_sent_notifications') || '{}'); } catch { return {}; } })() as Record<string, number>;
      const notify = (key: string, title: string, body: string) => {
        if (sent[key]) return;
        new Notification(title, { body });
        sent[key] = Date.now();
      };
      const getTaskDate = (date: string, time?: string) => {
        if (!date || date === 'Pronto') return null;
        const t = time || '09:00';
        const d = new Date(`${date}T${t}:00`);
        return Number.isNaN(d.getTime()) ? null : d;
      };
      academicTasks.filter(t => !t.completed && t.reminder && t.reminder !== 'none').forEach(t => {
        const due = getTaskDate(t.dueDate, t.startTime);
        if (!due) return;
        const diff = due.getTime() - now.getTime();
        const presets: Record<string, number> = { '1h': 60*60*1000, '1d': 24*60*60*1000, '1w': 7*24*60*60*1000 };
        if (t.reminder && presets[t.reminder] && diff <= presets[t.reminder] && diff > presets[t.reminder] - 120000) {
          notify(`acad_${t.id}_${t.reminder}`, `LifeOS · ${t.title}`, `Tienes ${t.type.toLowerCase()} en ${t.subject} ${reminderLabels[t.reminder].toLowerCase()}.`);
        }
        if (t.reminder === 'daily' && now.getHours() === 9 && now.getMinutes() < 2 && diff > 0 && diff < 7*24*60*60*1000) {
          notify(`acad_${t.id}_daily_${now.toISOString().slice(0,10)}`, `LifeOS · ${t.title}`, `Recordatorio diario. Vence ${t.dueDate}.`);
        }
        if (t.reminder === 'weekly' && now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() < 2 && diff > 0 && diff < 30*24*60*60*1000) {
          notify(`acad_${t.id}_weekly_${now.toISOString().slice(0,10)}`, `LifeOS · ${t.title}`, `Recordatorio semanal. Vence ${t.dueDate}.`);
        }
      });
      personalTodos.filter(t => !t.completed && t.reminder && t.reminder !== 'none').forEach(t => {
        const due = getTaskDate(t.dueDate, t.dueTime);
        if (!due) return;
        const diff = due.getTime() - now.getTime();
        const presets: Record<string, number> = { '1h': 60*60*1000, '1d': 24*60*60*1000, '1w': 7*24*60*60*1000 };
        if (t.reminder && presets[t.reminder] && diff <= presets[t.reminder] && diff > presets[t.reminder] - 120000) {
          notify(`todo_${t.id}_${t.reminder}`, `LifeOS · ${t.title}`, `Tarea pendiente ${reminderLabels[t.reminder].toLowerCase()}.`);
        }
        if (t.reminder === 'daily' && now.getHours() === 9 && now.getMinutes() < 2 && diff > 0 && diff < 7*24*60*60*1000) {
          notify(`todo_${t.id}_daily_${now.toISOString().slice(0,10)}`, `LifeOS · ${t.title}`, `Recordatorio diario. Vence ${t.dueDate}.`);
        }
        if (t.reminder === 'weekly' && now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() < 2 && diff > 0 && diff < 30*24*60*60*1000) {
          notify(`todo_${t.id}_weekly_${now.toISOString().slice(0,10)}`, `LifeOS · ${t.title}`, `Recordatorio semanal. Vence ${t.dueDate}.`);
        }
      });
      try { localStorage.setItem('lifeos_sent_notifications', JSON.stringify(sent)); } catch {}
    };
    run();
    const timer = setInterval(run, 60000);
    return () => clearInterval(timer);
  }, [notificationsEnabled, academicTasks, personalTodos]);

  // --- MOTOR ACADÉMICO CHILE (CÁLCULOS + METAS REALES) ---
  const calculateSubjectMetrics = (sub: Subject) => {
    const evals = Array.isArray(sub?.evaluations) ? sub.evaluations : [];
    const totalWeight = evals.reduce((acc, e) => acc + (Number(e.weight) || 0), 0) || 100;
    const graded = evals.filter(e => e.grade !== null && e.grade !== undefined);
    const gradedWeight = graded.reduce((acc, e) => acc + (Number(e.weight) || 0), 0);
    const pendingWeight = Math.max(0, totalWeight - gradedWeight);

    const currentWeightedSum = graded.reduce((acc, e) => acc + ((Number(e.grade) || 0) * ((Number(e.weight) || 0) / 100)), 0);
    const currentAverage = gradedWeight > 0 ? (currentWeightedSum / (gradedWeight / 100)) : 0;

    const exemptionGradeNum = Number(sub?.exemptionGrade) || 5.0;
    const isExempted = Boolean(sub?.hasExemption) && gradedWeight >= 100 && currentAverage >= exemptionGradeNum;

    const calcNeededGrade = (target: number) => {
      if (pendingWeight <= 0) return 0;
      return Number(((target - currentWeightedSum) / (pendingWeight / 100)).toFixed(1));
    };

    const neededForExemption = calcNeededGrade(exemptionGradeNum);
    const neededForTwoOpportunities = calcNeededGrade(Number(sub?.minGradeForTwoOpportunities) || 3.9);
    const neededForOneOpportunity = calcNeededGrade(Number(sub?.minGradeForOneOpportunity) || 3.5);

    const examWeightNum = Number(sub?.examWeight) || 30;
    const presWeightDec = (100 - examWeightNum) / 100;
    const examWeightDec = examWeightNum / 100;
    const calculateExamFinal = (examGrade: number) =>
      Number(((currentAverage * presWeightDec) + (examGrade * examWeightDec)).toFixed(1));
    const neededInExam = (4.0 - (currentAverage * presWeightDec)) / (examWeightDec || 1);

    let finalGradeCalculated: number | null = null;
    let isPassed = false;
    let failReason = '';
    let requiresExam = false;
    let examAttempt: 1 | 2 | null = null;
    let firstExamFailed = false;
    let secondOpportunityAvailable = false;
    let secondExamFinal: number | null = null;

    if (gradedWeight >= 100) {
      if (isExempted) {
        finalGradeCalculated = currentAverage;
        isPassed = true;
      } else if (currentAverage < (Number(sub?.minGradeForOneOpportunity) || 3.5)) {
        finalGradeCalculated = currentAverage;
        isPassed = false;
        failReason = 'Reprobado por presentación (sin derecho a examen).';
      } else {
        requiresExam = true;

        if (sub.examGrade !== null && sub.examGrade !== undefined) {
          const eg1 = Number(sub.examGrade);
          const firstFinal = sub.isExamFailingRule && eg1 < 4.0 ? eg1 : calculateExamFinal(eg1);
          firstExamFailed = sub.isExamFailingRule ? eg1 < 4.0 : firstFinal < 4.0;

          if (!firstExamFailed) {
            finalGradeCalculated = firstFinal;
            isPassed = firstFinal >= 4.0;
            examAttempt = 1;
          } else if (currentAverage >= (Number(sub?.minGradeForTwoOpportunities) || 3.9)) {
            secondOpportunityAvailable = true;

            if (sub.examGrade2 !== null && sub.examGrade2 !== undefined) {
              const eg2 = Number(sub.examGrade2);
              secondExamFinal = sub.isExamFailingRule && eg2 < 4.0 ? eg2 : calculateExamFinal(eg2);
              finalGradeCalculated = secondExamFinal;
              isPassed = secondExamFinal >= 4.0;
              examAttempt = 2;
              if (!isPassed) {
                failReason = sub.isExamFailingRule && eg2 < 4.0
                  ? `Reprobado por Examen Reprobatorio en 2ª oportunidad (${eg2.toFixed(1)} < 4.0).`
                  : 'Reprobado luego de 2 oportunidades de examen.';
              }
            } else {
              finalGradeCalculated = firstFinal;
              isPassed = false;
              failReason = '1ª oportunidad reprobada. Tienes una 2ª oportunidad disponible.';
            }
          } else {
            finalGradeCalculated = firstFinal;
            isPassed = false;
            failReason = 'Reprobado en la 1ª oportunidad de examen.';
          }
        }
      }
    } else if (!sub?.hasExemption) {
      requiresExam = true;
    }

    return {
      gradedWeight,
      pendingWeight,
      currentAverage: Number(currentAverage.toFixed(1)) || 0,
      neededForExemption,
      neededForTwoOpportunities,
      neededForOneOpportunity,
      neededInExam: Number(neededInExam.toFixed(1)) || 0,
      isExempted,
      requiresExam,
      opportunitiesCount: currentAverage < (Number(sub?.minGradeForOneOpportunity) || 3.5) ? 0 : (currentAverage < (Number(sub?.minGradeForTwoOpportunities) || 3.9) ? 1 : 2),
      firstExamFailed,
      secondOpportunityAvailable,
      examAttempt,
      secondExamFinal,
      finalGradeCalculated: finalGradeCalculated !== null ? Number(finalGradeCalculated.toFixed(1)) : null,
      isPassed,
      failReason
    };
  };

  const getRequiredGrade = (sub: Subject, target = 4.0) => {
    const stats = calculateSubjectMetrics(sub);
    const remaining = 100 - stats.gradedWeight;
    if (remaining <= 0) return stats.currentAverage >= target ? 1 : 8;
    const required = (target * 100 - stats.currentAverage * stats.gradedWeight) / remaining;
    return Number(required.toFixed(1));
  };

  const startOfWeek = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0,0,0,0);
    return x;
  };





  const whatIfData = (() => {
    const sub = subjects.find(s => s.id === whatIfSubjectId);
    if (!sub) return null;
    const evals = sub.evaluations || [];
    const passingGrade = Math.max(1, Math.min(7, Number(whatIfTargetGrade) || 4.0));
    const effectiveGrade = (ev: Evaluation) => {
      const hypothetical = whatIfGrades[ev.id];
      if (hypothetical !== undefined && hypothetical !== '') return Math.max(1, Math.min(7, Number(hypothetical) || 1));
      return ev.grade !== null && ev.grade !== undefined ? Number(ev.grade) : null;
    };
    const projectedWeighted = evals.reduce((sum, ev) => {
      const g = effectiveGrade(ev);
      return g === null ? sum : sum + g * (Number(ev.weight) || 0) / 100;
    }, 0);
    const enteredWeight = evals.reduce((sum, ev) => effectiveGrade(ev) === null ? sum : sum + (Number(ev.weight) || 0), 0);
    const missingWeight = evals.reduce((sum, ev) => effectiveGrade(ev) === null ? sum + (Number(ev.weight) || 0) : sum, 0);
    const projectedAverage = Number(projectedWeighted.toFixed(2));
    const requiredFor = (ev: Evaluation, target = passingGrade) => {
      const g = effectiveGrade(ev);
      if (g !== null) return null;
      const known = evals.reduce((sum, other) => {
        if (other.id === ev.id) return sum;
        const otherGrade = effectiveGrade(other);
        return otherGrade === null ? sum : sum + otherGrade * (Number(other.weight) || 0) / 100;
      }, 0);
      const weight = Number(ev.weight) || 0;
      if (!weight) return null;
      return Number(Math.max(1, Math.min(7, (target - known) * 100 / weight)).toFixed(1));
    };
    return { sub, evals, passingGrade, projectedAverage, enteredWeight, missingWeight, effectiveGrade, requiredFor };
  })();

  const approvedSct = curriculum.filter(c => c.status === 'aprobado').reduce((a,c) => a + (c.credits||0), 0);
  const totalSct = curriculum.reduce((a,c) => a + (c.credits||0), 0) || 330;
  const sctProgress = Math.min(100, Math.round((approvedSct / totalSct) * 100));
  const semesterHistory = Array.from({length: 11}, (_,i) => i+1).map(sem => {
    const rows = curriculum.filter(c => c.semester === sem);
    return { sem, rows, approved: rows.filter(c => c.status === 'aprobado').length, sct: rows.filter(c => c.status === 'aprobado').reduce((a,c)=>a+(c.credits||0),0), total: rows.reduce((a,c)=>a+(c.credits||0),0) };
  });


  const getGeneralAverage = (subjList: Subject[]) => {
    if (!subjList || subjList.length === 0) return '-.-';
    const avgs = subjList.map(s => {
      try {
        const stats = calculateSubjectMetrics(s);
        return stats.finalGradeCalculated !== null ? stats.finalGradeCalculated : stats.currentAverage;
      } catch {
        return 0;
      }
    }).filter(a => a > 0);
    if (avgs.length === 0) return '-.-';
    return (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2);
  };

  const getCurriculumSubjectStatus = (currSub: CurriculumSubject) => {
    const activeMatch = subjects.find(s => s.name.trim().toLowerCase() === currSub.name.trim().toLowerCase());
    if (activeMatch) {
      const stats = calculateSubjectMetrics(activeMatch);
      if (stats.gradedWeight === 100) {
        if (stats.isExempted) return { status: 'aprobado' as const, grade: stats.currentAverage };
        if (stats.finalGradeCalculated !== null) {
          return { status: stats.finalGradeCalculated >= 4.0 ? ('aprobado' as const) : ('reprobado' as const), grade: stats.finalGradeCalculated };
        }
        if (stats.opportunitiesCount === 0) return { status: 'reprobado' as const, grade: stats.currentAverage };
      }
      return { status: 'cursando' as const, grade: stats.currentAverage };
    }
    return { status: currSub.status, grade: currSub.finalGrade || null };
  };

  const theme = {
    bg: darkMode ? '#090909' : '#f4f4f5',
    sidebar: darkMode ? '#0d0d0f' : '#ffffff',
    card: darkMode ? '#141416' : '#ffffff',
    cardBorder: darkMode ? '#27272a' : '#e4e4e7',
    text: darkMode ? '#f4f4f5' : '#111113',
    textMuted: darkMode ? '#8e8e93' : '#707078',
    primary: darkMode ? '#f4f4f5' : '#18181b',
    activeTab: darkMode ? '#242426' : '#ededee',
    activeTabText: darkMode ? '#ffffff' : '#111113'
  };

  const getDateAcademicStatus = (dateStr: string): { type: 'clases' | 'receso_vacaciones' | 'feriado' | 'paro'; label?: string } => {
    if (CHILE_HOLIDAYS_2026[dateStr]) {
      return { type: 'feriado', label: CHILE_HOLIDAYS_2026[dateStr] };
    }
    const matchingStrike = academicBreaks.find(b => b.type === 'paro' && dateStr >= b.startDate && dateStr <= b.endDate);
    if (matchingStrike) {
      return { type: 'paro', label: matchingStrike.title };
    }
    const matchingBreak = academicBreaks.find(b => b.type === 'receso' && dateStr >= b.startDate && dateStr <= b.endDate);
    if (matchingBreak) {
      return { type: 'receso_vacaciones', label: matchingBreak.title };
    }
    if (activeSemesterDates.start && activeSemesterDates.end && dateStr >= activeSemesterDates.start && dateStr <= activeSemesterDates.end) {
      return { type: 'clases', label: 'Clases Regulares' };
    }
    return { type: 'receso_vacaciones', label: 'Vacaciones' };
  };

  const addMoneyToGoal = (goalId: number) => {
    const goal = savingGoals.find(g => g.id === goalId);
    if (!goal) return;
    const raw = prompt(`¿Cuánto dinero quieres agregar a “${goal.title}”?`, '10000');
    if (raw === null) return;
    const amount = parseInt(raw.replace(/\D/g, ''), 10) || 0;
    if (amount <= 0) return alert('Ingresa un monto mayor a 0.');
    setSavingGoals(savingGoals.map(g => g.id === goalId ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) } : g));
  };

  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const dateFromLocalString = (date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const shiftLocalDate = (date: Date, days: number) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  };

  const toggleHabitOnDate = (habitId: number, date: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit?.hasEndDate && habit.endDate && date > habit.endDate) return;
    const key = String(habitId);
    const currentlyDone = (habitLog[key] || []).includes(date) || (date === formatLocalDate(new Date()) && Boolean(habit?.completed));
    setHabitLog(prev => {
      const dates = new Set(prev[key] || []);
      if (dates.has(date)) dates.delete(date); else dates.add(date);
      return { ...prev, [key]: Array.from(dates).sort() };
    });
    if (date === formatLocalDate(new Date())) setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completed: !currentlyDone } : h));
  };

  const toggleHabitToday = (habitId: number) => toggleHabitOnDate(habitId, formatLocalDate(new Date()));

  const isHabitDoneOn = (habitId: number, date: string) => {
    const log = habitLog[String(habitId)] || [];
    const localToday = formatLocalDate(new Date());
    return log.includes(date) || (date === localToday && Boolean(habits.find(h => h.id === habitId)?.completed));
  };

  const habitStreak = (habitId: number) => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = formatLocalDate(d);
      if (!isHabitDoneOn(habitId, ds)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  const habitCountBetween = (habitId: number, start: Date, end: Date) => {
    let count = 0;
    const cursor = new Date(start);
    const endDate = new Date(end);
    cursor.setHours(12, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);
    while (cursor <= endDate) {
      if (isHabitDoneOn(habitId, formatLocalDate(cursor))) count++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  };

  const habitReferenceDate = new Date();
  const currentWeekStart = new Date(habitReferenceDate);
  const currentWeekDay = currentWeekStart.getDay();
  currentWeekStart.setDate(currentWeekStart.getDate() + (currentWeekDay === 0 ? -6 : 1 - currentWeekDay));
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = shiftLocalDate(currentWeekStart, 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(habitReferenceDate.getFullYear(), habitReferenceDate.getMonth(), 1);
  const monthEnd = new Date(habitReferenceDate.getFullYear(), habitReferenceDate.getMonth() + 1, 0);
  const monthCalendarStart = shiftLocalDate(monthStart, -(monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1));
  const monthCalendarEnd = shiftLocalDate(monthEnd, 7 - (monthEnd.getDay() === 0 ? 7 : monthEnd.getDay()));
  const monthCalendarDays = Array.from({ length: Math.max(35, Math.ceil((monthCalendarEnd.getTime() - monthCalendarStart.getTime()) / 86400000) + 1) }, (_, i) => shiftLocalDate(monthCalendarStart, i));

  const totalHabitCompletionsThisWeek = habits.reduce((sum, h) => sum + habitCountBetween(h.id, currentWeekStart, currentWeekEnd), 0);
  const weekPossible = habits.length * 7;
  const weekRate = weekPossible ? Math.round((totalHabitCompletionsThisWeek / weekPossible) * 100) : 0;
  const totalHabitCompletionsThisMonth = habits.reduce((sum, h) => sum + habitCountBetween(h.id, monthStart, monthEnd), 0);
  const monthPossible = habits.length * monthEnd.getDate();
  const monthRate = monthPossible ? Math.round((totalHabitCompletionsThisMonth / monthPossible) * 100) : 0;
  // Registro de la 1ª o 2ª oportunidad.
  const handleUpdateExamGrade = (subjectId: number, attempt: 1 | 2 = 1) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    const current = attempt === 2 ? subject.examGrade2 : subject.examGrade;
    const gradeStr = prompt(
      `Ingresa la nota del Examen ${attempt === 2 ? '2ª oportunidad' : '1ª oportunidad'} (1.0 a 7.0) o déjalo en blanco para borrar:`,
      current !== null && current !== undefined ? String(current) : ''
    );
    if (gradeStr === null) return;
    const parsed = gradeStr.trim() === '' ? null : parseFloat(gradeStr.replace(',', '.'));
    if (parsed !== null && (isNaN(parsed) || parsed < 1.0 || parsed > 7.0)) return alert('La nota debe ser entre 1.0 y 7.0');

    setSubjects(subjects.map(s => s.id === subjectId
      ? (attempt === 2 ? { ...s, examGrade2: parsed } : { ...s, examGrade: parsed })
      : s
    ));
    if (parsed !== null) setAcademicTasks(academicTasks.map(t => t.subject === subject.name && t.type === 'Examen' ? { ...t, completed: true } : t));
  };

  const handleUpdateGrade = (subjectId: number, evalId: number) => {
    const gradeStr = prompt('Ingresa la nota (1.0 a 7.0) o déjalo en blanco para borrar:', '');
    if (gradeStr === null) return;
    const parsed = gradeStr.trim() === '' ? null : parseFloat(gradeStr.replace(',', '.'));
    if (parsed !== null && (isNaN(parsed) || parsed < 1.0 || parsed > 7.0)) return alert('La nota debe ser entre 1.0 y 7.0');
    setSubjects(subjects.map(s => s.id === subjectId ? { ...s, evaluations: s.evaluations.map(ev => ev.id === evalId ? { ...ev, grade: parsed } : ev) } : s));
    if (parsed !== null) setAcademicTasks(academicTasks.map(t => t.evaluationId === evalId ? { ...t, completed: true } : t));
  };

  const isBlockActiveNow = (blockDay: string, startTime: string, endTime: string) => {
    if (!startTime || !endTime) return false;
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = dayNames[currentTime.getDay()];
    if (currentDayName !== blockDay) return false;

    const currentTotalMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return currentTotalMin >= (startH * 60 + startM) && currentTotalMin < (endH * 60 + endM);
  };

  const handleCreateAdvancedSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;
    const nCont = parseInt(numControles, 10) || 0;
    const wCont = parseInt(weightControles, 10) || 0;
    const nCert = parseInt(numCertamenes, 10) || 0;
    const wCert = parseInt(weightCertamenes, 10) || 0;
    const nTrab = parseInt(numTrabajos, 10) || 0;
    const wTrab = parseInt(weightTrabajos, 10) || 0;
    const totalWeightCalculated = (nCont * wCont) + (nCert * wCert) + (nTrab * wTrab);
    if (totalWeightCalculated !== 100) {
      const proceed = window.confirm(`La suma de ponderaciones da ${totalWeightCalculated}%. ¿Deseas guardarlo de todas formas?`);
      if (!proceed) return;
    }
    const existing = editingSubjectId !== null ? subjects.find(s => s.id === editingSubjectId) : null;
    const generatedEvals: Evaluation[] = [];
    let idCounter = Date.now();
    for (let i = 1; i <= nCont; i++) generatedEvals.push({ id: existing?.evaluations.find(e => e.name === `Control ${i}`)?.id || idCounter++, name: `Control ${i}`, grade: existing?.evaluations.find(e => e.name === `Control ${i}`)?.grade ?? null, weight: wCont, type: 'control' });
    for (let i = 1; i <= nCert; i++) generatedEvals.push({ id: existing?.evaluations.find(e => e.name === `Certamen ${i}`)?.id || idCounter++, name: `Certamen ${i}`, grade: existing?.evaluations.find(e => e.name === `Certamen ${i}`)?.grade ?? null, weight: wCert, type: 'certamen' });
    for (let i = 1; i <= nTrab; i++) generatedEvals.push({ id: existing?.evaluations.find(e => e.name === `Trabajo / Lab ${i}`)?.id || idCounter++, name: `Trabajo / Lab ${i}`, grade: existing?.evaluations.find(e => e.name === `Trabajo / Lab ${i}`)?.grade ?? null, weight: wTrab, type: 'trabajo' });
    const formattedScheduleBlocks: ScheduleBlock[] = subBlocks.map((b, idx) => ({ id: existing?.scheduleBlocks[idx]?.id || Date.now() + idx, day: b.day, startTime: b.startTime, endTime: b.endTime, subjectName: subName.trim(), room: subRoom.trim() || 'Aula', color: subColor, semester: subSemester }));
    const subCodeCalculated = existing?.code || subName.slice(0, 3).toUpperCase();
    const newSub: Subject = {
      id: existing?.id || Date.now(), name: subName.trim(), code: subCodeCalculated, teacher: subTeacher.trim() || 'Docente', color: subColor, classroom: subRoom.trim() || 'Aula',
      hasExemption, exemptionGrade: parseFloat(exemptionGrade) || 5.0, examWeight: parseInt(examWeight, 10) || 30, isExamFailingRule,
      minGradeForOneOpportunity: parseFloat(minGradeForOneOpportunity) || 3.5, minGradeForTwoOpportunities: parseFloat(minGradeForTwoOpportunities) || 3.9,
      semesterInCurriculum: subSemester, credits: parseInt(subCredits, 10) || 5, notes: subNotes,
      prerequisites: [],
      examGrade: existing?.examGrade ?? null, examGrade2: existing?.examGrade2 ?? null, scheduleBlocks: formattedScheduleBlocks, evaluations: generatedEvals
    };
    setSubjects(editingSubjectId !== null ? subjects.map(s => s.id === editingSubjectId ? newSub : s) : [...subjects, newSub]);
    const idx = curriculum.findIndex(c => c.name.trim().toLowerCase() === subName.trim().toLowerCase());
    if (idx >= 0) { const u = [...curriculum]; u[idx] = { ...u[idx], semester: subSemester, credits: parseInt(subCredits,10)||5, status: 'cursando' }; setCurriculum(u); }
    else setCurriculum([...curriculum, { id: Date.now()+1, name: subName.trim(), code: subCodeCalculated, semester: subSemester, status: 'cursando', credits: parseInt(subCredits,10)||5, prerequisites: [] }]);
    setShowSubjectModal(false); setEditingSubjectId(null); setSubName(''); setSubTeacher(''); setSubRoom(''); setSubNotes('');
  };

  const openSubjectEditor = (sub: Subject) => {
    setEditingSubjectId(sub.id); setSubName(sub.name); setSubTeacher(sub.teacher); setSubRoom(sub.classroom); setSubColor(sub.color); setSubSemester(sub.semesterInCurriculum); setSubCredits(String(sub.credits)); setSubNotes(sub.notes || '');
    const evs = sub.evaluations || [];
    setNumCertamenes(String(evs.filter(e=>e.type==='certamen').length)); setWeightCertamenes(String(evs.find(e=>e.type==='certamen')?.weight || 0));
    setNumControles(String(evs.filter(e=>e.type==='control').length)); setWeightControles(String(evs.find(e=>e.type==='control')?.weight || 0));
    setNumTrabajos(String(evs.filter(e=>e.type==='trabajo').length)); setWeightTrabajos(String(evs.find(e=>e.type==='trabajo')?.weight || 0));
    setHasExemption(sub.hasExemption); setExemptionGrade(String(sub.exemptionGrade)); setExamWeight(String(sub.examWeight)); setIsExamFailingRule(sub.isExamFailingRule); setMinGradeForOneOpportunity(String(sub.minGradeForOneOpportunity)); setMinGradeForTwoOpportunities(String(sub.minGradeForTwoOpportunities));
    setSubBlocks((sub.scheduleBlocks.length ? sub.scheduleBlocks : [{day:'Lunes',startTime:'08:30',endTime:'10:00'}]).map(b=>({day:b.day,startTime:b.startTime,endTime:b.endTime})));
    setShowSubjectModal(true);
  };


  // Rollover académico: carga automáticamente los ramos del nuevo semestre.
  // Los ramos reprobados sólo reaparecen en un semestre de la misma paridad
  // (1→3→5... y 2→4→6...), tal como funciona tu planificación personal.
  const buildSemesterSubjects = (semesterNumber: number, history: ArchivedSemester[], current: Subject[] = []) => {
    const byName = new Map<string, Subject>();
    [...history.flatMap(h => h.subjects || []), ...current].forEach(sub => {
      const metrics = calculateSubjectMetrics(sub);
      const grade = metrics.finalGradeCalculated ?? metrics.currentAverage;
      if (grade !== null && grade !== undefined && Number(grade) > 0 && Number(grade) < 4.0) byName.set(sub.name.trim().toLowerCase(), sub);
    });

    const regular = curriculum
      .filter(c => c.semester === semesterNumber && c.status !== 'aprobado')
      .map(makeQyFSubject);

    const repeats = [...byName.values()]
      .filter(sub => sub.semesterInCurriculum < semesterNumber && sub.semesterInCurriculum % 2 === semesterNumber % 2)
      .map(sub => ({ ...sub, evaluations: (sub.evaluations || []).map(e => ({ ...e, grade: null })), examGrade: null, examGrade2: null }));

    const merged = [...regular, ...repeats];
    const unique = new Map<string, Subject>();
    merged.forEach(sub => unique.set(sub.name.trim().toLowerCase(), sub));
    return [...unique.values()];
  };

  const switchToSemester = (semesterNumber: number) => {
    if (semesterNumber < 1 || semesterNumber > totalSemesters) return;
    const year = 2027 + Math.floor((semesterNumber - 1) / 2);
    setCurrentSemesterNumber(semesterNumber);
    setCurrentSemesterName(`Semestre ${semesterNumber} - ${year}`);
    setSubjects(buildSemesterSubjects(semesterNumber, archivedSemesters));
    setAcademicTasks([]);
  };


  const handleArchiveSemester = () => {
    if (subjects.length === 0) return alert('No hay materias activas para archivar.');
    if (!window.confirm(`¿Deseas cerrar "${currentSemesterName}"? Se guardará en el Historial.`)) return;

    const newArchived: ArchivedSemester = {
      id: Date.now(),
      name: currentSemesterName,
      date: new Date().toLocaleDateString('es-CL'),
      subjects: [...subjects],
      finalAverage: getGeneralAverage(subjects)
    };
    const nextHistory = [newArchived, ...archivedSemesters];
    setArchivedSemesters(nextHistory);

    const nextSemester = Math.min(totalSemesters, currentSemesterNumber + 1);
    if (nextSemester === currentSemesterNumber) return;
    const year = 2027 + Math.floor((nextSemester - 1) / 2);
    setCurrentSemesterNumber(nextSemester);
    setCurrentSemesterName(`Semestre ${nextSemester} - ${year}`);
    setSubjects(buildSemesterSubjects(nextSemester, nextHistory, subjects));
    setAcademicTasks([]);
    setStudySubTab('materias');
  };

  const totalBalance = accountsList.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
  const selectedAccount = accountsList.find(a => a.id === selectedAccountId);
  const selectedAccountTransactions = selectedAccountId ? transactions.filter(t => t.accountId === selectedAccountId) : [];
  const buildAccountChartData = (accountId: string): MoneyPoint[] => {
    const account = accountsList.find(a => a.id === accountId);
    if (!account) return [];
    const sorted = transactions.filter(t => t.accountId === accountId).sort((a,b) => a.date.localeCompare(b.date) || a.id-b.id);
    if (!sorted.length) return [{ label: 'Hoy', value: Number(account.balance) || 0, detail: 'Sin movimientos registrados' }];
    const net = sorted.reduce((sum,t) => sum + (t.type === 'ingreso' ? Number(t.amount) : -Number(t.amount)), 0);
    let running = (Number(account.balance) || 0) - net;
    return [
      { label: sorted[0].date.slice(5), value: running, detail: `${sorted[0].date} • Saldo inicial estimado` },
      ...sorted.map(t => {
        running += t.type === 'ingreso' ? Number(t.amount) : -Number(t.amount);
        return { label: t.date.slice(5), value: running, detail: `${t.date} • ${t.description}` };
      })
    ];
  };
  const accountChartData: MoneyPoint[] = selectedAccountId ? buildAccountChartData(selectedAccountId) : [];

  const generalMoneyChartData: MoneyPoint[] = (() => {
    const sorted = [...transactions].sort((a,b) => a.date.localeCompare(b.date) || a.id-b.id);
    if (!sorted.length) return [];
    let running = totalBalance - sorted.reduce((sum,t) => sum + (t.type === 'ingreso' ? Number(t.amount) : -Number(t.amount)), 0);
    const result: MoneyPoint[] = [{ label: sorted[0].date.slice(5), value: running, detail: `${sorted[0].date} • Saldo inicial estimado` }];
    sorted.forEach(t => {
      running += t.type === 'ingreso' ? Number(t.amount) : -Number(t.amount);
      result.push({ label: t.date.slice(5), value: running, detail: `${t.date} • ${t.description}` });
    });
    return result;
  })();
  const dashboardMoneyChartData: MoneyPoint[] = dashboardAccountFilter === 'all'
    ? generalMoneyChartData
    : buildAccountChartData(dashboardAccountFilter);

  const totalSemesters = careerYears * 2;
  const currentSemesterMallaSubjects = curriculum.filter(c => c.semester === currentSemesterNumber);
  const currentSemesterApprovedCount = currentSemesterMallaSubjects.filter(c => getCurriculumSubjectStatus(c).status === 'aprobado').length;
  const currentSemesterProgress = currentSemesterMallaSubjects.length > 0 ? Math.round((currentSemesterApprovedCount / currentSemesterMallaSubjects.length) * 100) : 0;

  const rawScheduleFromSubjects: ScheduleBlock[] = subjects
    .filter(s => s.semesterInCurriculum === currentSemesterNumber)
    .flatMap(s => s.scheduleBlocks || []);

  const activeSemesterSchedule = rawScheduleFromSubjects.map(block => {
    const matchingExam = academicTasks.find(t => {
      if (t.subject.trim().toLowerCase() !== block.subjectName.trim().toLowerCase()) return false;
      if (t.type !== 'Certamen' && t.type !== 'Examen') return false;
      if (!t.dueDate) return false;
      
      const taskDayIndex = new Date(t.dueDate + 'T12:00:00').getDay();
      const dayNamesMap: Record<number, ScheduleBlock['day']> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
      if (dayNamesMap[taskDayIndex] !== block.day) return false;

      if (t.startTime && t.endTime) {
        return (t.startTime < block.endTime && t.endTime > block.startTime);
      }
      return true;
    });

    const isCurrentActive = isBlockActiveNow(block.day, block.startTime, block.endTime);

    if (matchingExam) {
      return {
        ...block,
        isReplacedByExam: true,
        examTitle: matchingExam.title,
        examType: matchingExam.type,
        isActiveNow: isCurrentActive
      };
    }
    return { ...block, isReplacedByExam: false, examTitle: null, examType: null, isActiveNow: isCurrentActive };
  });

  const displayedDashboardBalance = dashboardAccountFilter === 'all'
    ? accountsList.reduce((acc, a) => acc + (Number(a.balance) || 0), 0)
    : (accountsList.find(a => a.id === dashboardAccountFilter)?.balance || 0);

  const displayedDashboardAccountName = dashboardAccountFilter === 'all'
    ? 'Suma Total de Cuentas'
    : (accountsList.find(a => a.id === dashboardAccountFilter)?.name || 'Cuenta Seleccionada');

  const priorityOrder = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
  const sortedTodos = [...personalTodos]
    .filter(item => {
      if (todoFilter === 'Pendientes') return !item.completed;
      if (todoFilter === 'Completadas') return item.completed;
      return true;
    })
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || (a.dueDate || '').localeCompare(b.dueDate || ''));

  const todayDateObj = new Date();
  const todayStr = todayDateObj.toISOString().split('T')[0];
  const currentTime12h = currentTime.toLocaleTimeString('es-CL', { hour: 'numeric', minute: '2-digit', hour12: true });

  const currentWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDateObj);
    const dayOfWeek = todayDateObj.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(todayDateObj.getDate() + distanceToMonday + i);
    return d;
  });

  const currentYear = todayDateObj.getFullYear();
  const currentMonth = todayDateObj.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

  const monthCalendarDates = Array.from({ length: daysInCurrentMonth }, (_, i) => new Date(currentYear, currentMonth, i + 1));
  const classEvents = monthCalendarDates.flatMap(d => {
    const dateStr = d.toISOString().split('T')[0];
    if (getDateAcademicStatus(dateStr).type !== 'clases') return [];
    const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()];
    return subjects.flatMap(s => (s.scheduleBlocks || []).filter(b => b.day === dayName).map(b => ({
      id: `class_${s.id}_${dateStr}_${b.id}`,
      title: s.name,
      subtitle: `Clase · ${b.startTime}–${b.endTime}${b.room ? ` · ${b.room}` : ''}`,
      date: dateStr,
      type: 'class' as const,
      completed: false
    })));
  });
  const calendarEvents = [
    ...classEvents,
    ...academicTasks.filter(t => t.addToCalendar !== false && t.dueDate && t.dueDate !== 'Pronto').map(t => ({
      id: `acad_${t.id}`,
      title: t.title,
      subtitle: `${t.subject} (${t.type}) • ${t.weight}%${t.startTime ? ` · ${t.startTime}` : ''}`,
      date: t.dueDate,
      type: 'acad' as const,
      completed: t.completed
    })),
    ...personalTodos.filter(p => p.addToCalendar !== false && p.dueDate).map(p => ({
      id: `todo_${p.id}`,
      title: p.title,
      subtitle: `${p.category} • Prioridad ${p.priority}${p.dueTime ? ` · ${p.dueTime}` : ''}`,
      date: p.dueDate,
      type: 'todo' as const,
      completed: p.completed
    }))
  ];

  const getCalendarEventDots = (dateStr: string) => {
    const dots: { color: string; label: string }[] = [];
    if (calendarEvents.some(e => e.date === dateStr && e.type === 'acad')) dots.push({ color: '#ef4444', label: 'Entrega universitaria' });
    if (calendarEvents.some(e => e.date === dateStr && e.type === 'todo')) dots.push({ color: '#67e8f9', label: 'To-Do' });
    if (calendarEvents.some(e => e.date === dateStr && e.type === 'class')) dots.push({ color: '#a78bfa', label: 'Clase' });
    return dots.slice(0, 3);
  };

  const selectedDateEvents = calendarEvents.filter(ev => ev.date === selectedCalendarDate);
  const selectedDateStatus = getDateAcademicStatus(selectedCalendarDate);
  const selectedTaskSubjectObj = subjects.find(s => s.name === (taskSubject || subjects[0]?.name));

  return (
    <>
      <style>{LIFEOS_V9_CSS}</style>
      <div style={{ '--lifeos-card-bg': theme.card, '--lifeos-card-border': theme.cardBorder, '--lifeos-text': theme.text, '--lifeos-muted': theme.textMuted, '--lifeos-card': theme.card, display: 'flex', minHeight: '100vh', backgroundColor: theme.bg, color: theme.text, fontFamily: 'system-ui, -apple-system, sans-serif' } as React.CSSProperties}>
      
      {/* SIDEBAR COLAPSABLE */}
      <aside style={{
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        bottom: 0,
        width: isMobile ? '252px' : (sidebarOpen ? '218px' : '68px'),
        backgroundColor: theme.sidebar,
        borderRight: `1px solid ${theme.cardBorder}`,
        zIndex: 250,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isMobile ? '14px 10px' : '14px 8px',
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 20px 8px', borderBottom: `1px solid ${theme.cardBorder}`, marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#090a0f', border: '1.5px solid #ffffff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={20} color="#ffffff" fill="#ffffff" />
            </div>
            {(sidebarOpen || isMobile) && (
              <div style={{ fontWeight: '900', fontSize: '18px', letterSpacing: '-0.03em' }}>
                Life<span style={{ color: theme.primary }}>OS</span>
              </div>
            )}
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'inicio', label: 'Inicio', icon: <Home size={19} /> },
              { id: 'estudios', label: 'Estudios & Malla', icon: <GraduationCap size={19} />, badge: pendingAcademicTasks },
              { id: 'habitos', label: 'Hábitos', icon: <Flame size={19} /> },
              { id: 'finanzas', label: 'Economía y Compras', icon: <CreditCard size={19} /> },
              { id: 'todos', label: 'To-Do List', icon: <ListTodo size={19} />, badge: pendingTodos },
              { id: 'calendario', label: 'Calendario Maestro', icon: <CalendarDays size={19} /> },
              { id: 'enlaces', label: 'Vault / Enlaces', icon: <Bookmark size={19} /> },
              { id: 'ajustes', label: 'Configuración', icon: <Settings size={19} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedAccountId(null);
                  setActiveTab(tab.id as any);
                  if (isMobile) setSidebarOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === tab.id ? theme.activeTab : 'transparent',
                  color: activeTab === tab.id ? theme.activeTabText : theme.textMuted,
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                  position: 'relative'
                }}>
                <span style={{ flexShrink: 0 }}>{tab.icon}</span>
                {(sidebarOpen || isMobile) && <span>{tab.label}</span>}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span style={{
                    marginLeft: (sidebarOpen || isMobile) ? 'auto' : 0,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    backgroundColor: theme.primary,
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 6px', borderTop: `1px solid ${theme.cardBorder}` }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
            {studentName.slice(0, 2).toUpperCase()}
          </div>
          {(sidebarOpen || isMobile) && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentName}</div>
              <div style={{ fontSize: '10px', color: theme.textMuted }}>{careerName}</div>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 240, backdropFilter: 'blur(3px)' }}
        />
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="lifeos-main" style={{ flex: 1, padding: isMobile ? '12px' : '22px 30px', overflowY: 'auto', maxWidth: '100vw' }}>
        {isMobile && (
          <div className="lifeos-mobile-only lifeos-mobile-header" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${theme.cardBorder}` }}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:11,backgroundColor:theme.primary,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>⚗</div>
              <div><div style={{fontSize:15,fontWeight:900}}>Life<span style={{color:theme.primary}}>OS</span></div><div style={{fontSize:10,color:theme.textMuted}}>{currentSemesterName}</div></div>
            </div>
            <button onClick={()=>setSidebarOpen(true)} aria-label="Abrir navegación" style={{width:40,height:40,padding:0,border:`1px solid ${theme.cardBorder}`,backgroundColor:theme.card,color:theme.text,display:'flex',alignItems:'center',justifyContent:'center'}}><Menu size={19}/></button>
          </div>
        )}
        
        {/* Barra Superior con Menú */}
        <div className="lifeos-desktop-only" style={{ display: isMobile ? 'none' : 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Abrir Menú"
              style={{
                background: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                color: theme.text,
                padding: '8px 12px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '700'
              }}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              <span>Menú</span>
            </button>
          </div>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${theme.cardBorder}`, backgroundColor: theme.card, color: theme.text, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            {darkMode ? <Sun size={15} color="#facc15" /> : <Moon size={15} color="#a855f7" />}
            <span>{darkMode ? 'Claro' : 'Oscuro'}</span>
          </button>
        </div>

        {/* ================= VISTA: INICIO ================= */}
        {activeTab === 'inicio' && (
          <div className="lifeos-dashboard">
            {(() => {
              const todayTodos = personalTodos.filter(t => !t.completed && t.dueDate === todayStr).slice(0, 5);
              const todayAcademic = academicTasks.filter(t => !t.completed && t.dueDate === todayStr).slice(0, 5);
              const upcoming = [...academicTasks.filter(t => !t.completed && t.dueDate && t.dueDate >= todayStr)]
                .sort((a,b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
                .slice(0, 4);
              const latestGraded = subjects.flatMap(s => (s.evaluations || []).filter(e => e.grade !== null && e.grade !== undefined).map(e => ({ ...e, subjectName: s.name })))
                .slice(-1)[0];
              const todayClasses = calendarEvents.filter(e => e.date === todayStr && e.type === 'class').slice(0, 5);
              const todayEvents = [...todayAcademic.map(t => ({ title: t.title, subtitle: `${t.subject} · ${t.type}`, time: t.startTime || '' })), ...todayTodos.map(t => ({ title: t.title, subtitle: `${t.category} · To-Do`, time: t.dueTime || '' })), ...todayClasses.map(c => ({ title: c.title, subtitle: c.subtitle, time: '' }))].slice(0, 6);
              const goalInProgress = savingGoals.filter(g => g.currentAmount < g.targetAmount).slice(0, 3);
              const dashboardHabitRate = habits.length ? Math.round((habitsDone / habits.length) * 100) : 0;
              return <>
                {/* Cabecera estilo dashboard */}
                <section className="lifeos-dashboard-header" style={dashboardBackground ? {backgroundImage:`linear-gradient(rgba(0,0,0,.58),rgba(0,0,0,.68)), url(${dashboardBackground})`,backgroundSize:'cover',backgroundPosition:'center'} : undefined}>
                  <div>
                    <div className="lifeos-overline">LIFEOS · {currentSemesterName}</div>
                    <div className="lifeos-dashboard-title-row">
                      <div>
                        <div className="lifeos-date-week" style={{fontSize:'11px',fontWeight:900,letterSpacing:'.08em'}}>{todayDateObj.toLocaleDateString('es-CL', { weekday: 'long', day:'numeric' })}</div>
                        <h1>Buenas {currentTime.getHours() < 12 ? 'días' : currentTime.getHours() < 19 ? 'tardes' : 'noches'}, {studentName}</h1>
                        <p>{pendingAcademicTasks + pendingTodos === 0 ? 'Todo despejado por ahora.' : `${pendingAcademicTasks + pendingTodos} cosas pendientes que merecen tu atención.`}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
                    <div className="lifeos-header-actions">
                      <button onClick={() => setShowTodoModal(true)}><Plus size={15}/> To-Do</button>
                      <button onClick={() => { if (subjects.length > 0 && !taskSubject) setTaskSubject(subjects[0].name); setShowAcademicTaskModal(true); }}><Plus size={15}/> Evaluación</button>
                    </div>
                    <div style={{fontSize:isMobile?20:24,fontWeight:900,letterSpacing:'-.04em',color:'#f5f5f5',fontVariantNumeric:'tabular-nums'}}>{currentTime12h}</div>
                  </div>
                </section>

                {/* Primera fila: Tareas · Saldo · Hábitos */}
                <section className="lifeos-dashboard-grid lifeos-dashboard-grid-top">
                  <div className="lifeos-dash-card lifeos-dash-tall">
                    <div className="lifeos-card-head"><div style={{display:'flex',alignItems:'center',gap:7}}><span className="lifeos-overline">TAREAS</span><button onClick={()=>setShowTodoModal(true)} title='Agregar tarea' style={{width:20,height:20,padding:0,border:'1px solid var(--lifeos-card-border)',borderRadius:6,background:'transparent',color:'var(--lifeos-text)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Plus size={11}/></button><h3>{pendingTodos + pendingAcademicTasks} pendientes</h3></div><ListTodo size={18}/></div>
                    <div className="lifeos-task-list">
                      {todayEvents.length === 0 ? <div className="lifeos-empty">No tienes nada urgente para hoy.</div> : todayEvents.map((item, i) => (
                        <div className="lifeos-mini-row" key={i}><span className="lifeos-check-dot"></span><div><strong>{item.title}</strong><small>{item.subtitle}{item.time ? ` · ${item.time}` : ''}</small></div></div>
                      ))}
                    </div>
                    <button className="lifeos-text-button" onClick={() => setActiveTab('todos')}>Ver todo →</button>
                  </div>

                  <div className="lifeos-dash-card lifeos-balance-card">
                    <div className="lifeos-card-head"><div style={{display:'flex',alignItems:'center',gap:8}}><span className="lifeos-overline">SALDO</span><select value={dashboardAccountFilter} onChange={e=>setDashboardAccountFilter(e.target.value)} style={{maxWidth:135,padding:'3px 6px',fontSize:9,border:'1px solid var(--lifeos-card-border)',borderRadius:7,background:'var(--lifeos-card-bg)',color:'var(--lifeos-text)'}}><option value='all'>Todas las cuentas</option>{accountsList.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div><Wallet size={18}/></div>
                    <div className="lifeos-money-big">{formatCLP(displayedDashboardBalance)}</div>
                    <div className="lifeos-muted-line">{displayedDashboardAccountName}</div>
                    <div style={{height:72,margin:'8px 0 4px',overflow:'hidden'}}><DashboardMiniLine data={dashboardMoneyChartData} theme={theme}/></div>
                    <div className="lifeos-balance-rule"></div>
                    <div className="lifeos-mini-stat"><span>Ingresos / gastos registrados</span><strong>{dashboardAccountFilter==='all'?transactions.length:transactions.filter(t=>t.accountId===dashboardAccountFilter).length}</strong></div>
                    <button className="lifeos-text-button" onClick={() => setActiveTab('finanzas')}>Abrir Economía →</button>
                  </div>

                  <div className="lifeos-dash-card lifeos-dash-tall">
                    <div className="lifeos-card-head"><div><span className="lifeos-overline">HÁBITOS</span><h3>{habitsDone} de {habits.length}</h3></div><div className="lifeos-ring" style={{background:`conic-gradient(${darkMode?'#f4f4f5':'#111113'} ${dashboardHabitRate * 3.6}deg, transparent 0)`,position:'relative'}}><span style={{width:29,height:29,borderRadius:'50%',background:theme.card,display:'flex',alignItems:'center',justifyContent:'center'}}>{dashboardHabitRate}%</span></div></div>
                    <div className="lifeos-task-list">
                      {habits.slice(0, 5).map(h => <button key={h.id} className="lifeos-habit-row lifeos-habit-check" onClick={() => toggleHabitToday(h.id)}><span className={`lifeos-habit-box ${h.completed ? 'done' : ''}`}>{h.completed ? '✓' : ''}</span><span>{h.icon} {h.name}</span><small>{habitStreak(h.id)} días</small></button>)}
                      {habits.length === 0 && <div className="lifeos-empty">Agrega tu primer hábito.</div>}
                    </div>
                    <button className="lifeos-text-button" onClick={() => setActiveTab('habitos')}>Ver hábitos →</button>
                  </div>
                </section>

                {/* Segunda fila: evaluaciones + agenda */}
                <section className="lifeos-dashboard-grid lifeos-dashboard-grid-middle">
                  <div className="lifeos-dash-card lifeos-span-2">
                    <div className="lifeos-card-head"><div><span className="lifeos-overline">PRÓXIMAS EVALUACIONES</span><h3>Lo que viene</h3></div><CalendarDays size={18}/></div>
                    {upcoming.length === 0 ? <div className="lifeos-empty">No hay evaluaciones próximas registradas.</div> : upcoming.map(t => <div className="lifeos-upcoming-row" key={t.id}><div><strong>{t.title}</strong><small>{t.subject} · {t.type}</small></div><span>{t.dueDate}{t.startTime ? ` · ${t.startTime}` : ''}</span></div>)}
                    <button className="lifeos-text-button" onClick={() => { setActiveTab('estudios'); setStudySubTab('calendario'); }}>Ver entregas →</button>
                  </div>
                  <div className="lifeos-dash-card">
                    <div className="lifeos-card-head"><div><span className="lifeos-overline">AGENDA DE HOY</span><h3>{todayEvents.length ? `${todayEvents.length} eventos` : 'Día despejado'}</h3></div><CalendarCheck2 size={18}/></div>
                    {todayEvents.slice(0,4).map((item,i)=><div className="lifeos-mini-row" key={i}><span className="lifeos-time-dot"></span><div><strong>{item.title}</strong><small>{item.subtitle}{item.time?` · ${item.time}`:''}</small></div></div>)}
                    {todayEvents.length === 0 && <div className="lifeos-empty">Sin eventos en tu agenda de hoy.</div>}
                    <button className="lifeos-text-button" onClick={() => setActiveTab('calendario')}>Calendario Maestro →</button>
                  </div>
                </section>
                <section className="lifeos-dashboard-grid lifeos-dashboard-grid-middle">
                  <div className="lifeos-dash-card lifeos-span-2">
                    <div className="lifeos-card-head"><div><span className="lifeos-overline">CALENDARIO DEL MES</span><h3>{todayDateObj.toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</h3></div><CalendarDays size={18}/></div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginTop:10,fontSize:8,color:'var(--lifeos-muted)',textAlign:'center'}}>{['L','M','X','J','V','S','D'].map(d=><div key={d}>{d}</div>)}{Array.from({length:startingDayOfWeek}).map((_,i)=><div key={'e'+i}/>) }{monthCalendarDates.map(d=>{const ds=formatLocalDate(d);const has=calendarEvents.some(e=>e.date===ds);const isToday=ds===todayStr;const status=getDateAcademicStatus(ds);const dots=getCalendarEventDots(ds);const statusColor=status.type==='clases'?'#86efac':status.type==='receso_vacaciones'?'#52525b':status.type==='paro'?'#f59e0b':'#ef4444';return <button key={ds} title={status.label||''} onClick={()=>{setSelectedCalendarDate(ds);setActiveTab('calendario');}} style={{height:34,padding:'3px 2px',borderRadius:6,border:isToday?'1px solid var(--lifeos-text)':'1px solid transparent',background:has?(darkMode?'#262629':'#eeeeef'):'transparent',color:'var(--lifeos-text)',fontSize:9,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2}}><span>{d.getDate()}</span><span style={{width:'72%',height:2,borderRadius:99,background:statusColor,opacity:.9}}></span><span style={{height:3,display:'flex',gap:2,alignItems:'center'}}>{dots.map((dot,i)=><i key={i} title={dot.label} style={{width:3,height:3,borderRadius:'50%',background:dot.color,display:'block'}} />)}</span></button>})}</div>
                    <button className="lifeos-text-button" onClick={() => setActiveTab('calendario')}>Abrir calendario →</button>
                  </div>
                  <div className="lifeos-dash-card">
                    <div className="lifeos-card-head"><div><span className="lifeos-overline">OBJETIVOS</span><h3>Ahorro en progreso</h3></div><Target size={18}/></div>
                    {goalInProgress.length === 0 ? <div className="lifeos-empty">No tienes objetivos activos.</div> : goalInProgress.map(g => { const pct = Math.min(100, Math.round(g.currentAmount / Math.max(1,g.targetAmount) * 100)); return <div className="lifeos-goal-row" key={g.id}><div><strong>{g.emoji} {g.title}</strong><small>{formatCLP(g.currentAmount)} / {formatCLP(g.targetAmount)}</small></div><div className="lifeos-progress"><span style={{width:`${pct}%`}}></span></div><small className="lifeos-goal-pct">{pct}%</small></div>; })}
                    <button className="lifeos-text-button" onClick={() => setActiveTab('finanzas')}>Ver objetivos →</button>
                  </div>
                </section>

                {/* Tercera fila: última nota · estudios · agenda */}
                <section className="lifeos-dashboard-grid lifeos-dashboard-grid-bottom" style={{gridTemplateColumns:'1fr 1fr'}}>
                  <div className="lifeos-dash-card">
                    <div className="lifeos-card-head"><div><span className="lifeos-overline">ÚLTIMA NOTA</span><h3>{latestGraded ? latestGraded.subjectName : 'Sin notas todavía'}</h3></div><BookOpen size={18}/></div>
                    {latestGraded ? <><div className="lifeos-grade-big">{Number(latestGraded.grade).toFixed(1)}</div><div className="lifeos-muted-line">{latestGraded.name}</div></> : <div className="lifeos-empty">Registra una nota desde Ramos & Notas.</div>}
                    <button className="lifeos-text-button" onClick={() => { setActiveTab('estudios'); setStudySubTab('materias'); }}>Ramos & Notas →</button>
                  </div>
                  <div className="lifeos-dash-card">
                    <div className="lifeos-card-head"><div><span className="lifeos-overline">ESTUDIOS</span><h3>{currentSemesterProgress}% del semestre</h3></div><GraduationCap size={18}/></div>
                    <div className="lifeos-progress lifeos-progress-large"><span style={{width:`${currentSemesterProgress}%`}}></span></div>
                    <div className="lifeos-muted-line">{currentSemesterApprovedCount} de {currentSemesterMallaSubjects.length || subjects.length} ramos aprobados</div>
                    <div className="lifeos-sct-line"><strong>{approvedSct}</strong> / {totalSct} SCT acumulados</div>
                    <button className="lifeos-text-button" onClick={() => { setActiveTab('estudios'); setStudySubTab('malla'); }}>Ver malla →</button>
                  </div>
                </section>

              </>;
            })()}
          </div>
        )}

        {/* ================= VISTA: ESTUDIOS (RESTAURADO) ================= */}
        {activeTab === 'estudios' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', margin: 0 }}>Módulo Académico 🎓</h1>
              <p style={{ color: theme.textMuted, fontSize: '13px', margin: '4px 0 14px 0' }}>{careerName} • {currentSemesterName}</p>

              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button onClick={() => setStudySubTab('semestre')} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: studySubTab === 'semestre' ? theme.primary : theme.card, color: studySubTab === 'semestre' ? '#fff' : theme.textMuted, fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  Semestre & Fechas
                </button>
                <button onClick={() => setStudySubTab('materias')} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: studySubTab === 'materias' ? theme.primary : theme.card, color: studySubTab === 'materias' ? '#fff' : theme.textMuted, fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  Ramos & Notas
                </button>
                <button onClick={() => setStudySubTab('malla')} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: studySubTab === 'malla' ? theme.primary : theme.card, color: studySubTab === 'malla' ? '#fff' : theme.textMuted, fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  Malla Curricular ({curriculum.length})
                </button>
                <button onClick={() => setStudySubTab('horario')} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: studySubTab === 'horario' ? theme.primary : theme.card, color: studySubTab === 'horario' ? '#fff' : theme.textMuted, fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  Horario
                </button>
                <button onClick={() => setStudySubTab('calendario')} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: studySubTab === 'calendario' ? theme.primary : theme.card, color: studySubTab === 'calendario' ? '#fff' : theme.textMuted, fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  Entregas ({academicTasks.length})
                </button>
                <button onClick={() => setStudySubTab('historial')} style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: studySubTab === 'historial' ? theme.primary : theme.card, color: studySubTab === 'historial' ? '#fff' : theme.textMuted, fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  Historial ({archivedSemesters.length})
                </button>
              </div>
            </div>

            {/* 1. SUB-TAB: SEMESTRE */}
            {studySubTab === 'semestre' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>Evaluaciones de esta Semana</h3>
                    <span style={{ fontSize: '11px', color: theme.textMuted }}>
                      {academicTasks.filter(t => currentWeekDays.map(d => d.toISOString().split('T')[0]).includes(t.dueDate)).length} evaluaciones
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {academicTasks.filter(t => currentWeekDays.map(d => d.toISOString().split('T')[0]).includes(t.dueDate)).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px 0', color: theme.textMuted, fontSize: '13px' }}>
                        ¡Semana libre de evaluaciones!
                      </div>
                    ) : (
                      academicTasks
                        .filter(t => currentWeekDays.map(d => d.toISOString().split('T')[0]).includes(t.dueDate))
                        .map(t => (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', borderLeft: `4px solid ${theme.primary}` }}>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '13px' }}>{t.title}</div>
                              <span style={{ fontSize: '11px', color: theme.textMuted }}>{t.subject} ({t.type}) • Ponderación: {t.weight}%</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.primary }}>📅 {t.dueDate}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: '900', margin: 0 }}>Período Académico</h2>
                      <span style={{ fontSize: '12px', color: theme.textMuted }}>{activeSemesterDates.start} al {activeSemesterDates.end}</span>
                    </div>

                    <button 
                      onClick={() => setShowBreakModal(true)}
                      style={{ padding: '8px 14px', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Plus size={15} /> + Receso o Paro
                    </button>
                  </div>


                  <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: `1px solid ${theme.cardBorder}` }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '10px' }}>📆 Fechas de todos los semestres</div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                      {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(sem => {
                        const dates = semesterDateConfig[sem] || { start: '', end: '' };
                        const updateDate = (field: 'start' | 'end', value: string) => setSemesterDateConfig(prev => ({ ...prev, [sem]: { ...(prev[sem] || { start: '', end: '' }), [field]: value } }));
                        return <div key={sem} style={{ padding: '10px', borderRadius: '12px', backgroundColor: darkMode ? '#0e1017' : '#f8faf9', border: sem === currentSemesterNumber ? `1px solid ${theme.primary}55` : `1px solid ${theme.cardBorder}` }}>
                          <div style={{ fontSize: '11px', fontWeight: '900', marginBottom: '7px', color: sem === currentSemesterNumber ? theme.primary : theme.text }}>Semestre {sem}{sem === currentSemesterNumber ? ' · actual' : ''}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                            <label style={{ fontSize: '9px', color: theme.textMuted, fontWeight: '800' }}>INICIO<input type="date" value={dates.start} onChange={e => updateDate('start', e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px', borderRadius: '8px', border: `1px solid ${theme.cardBorder}`, background: darkMode ? '#11131b' : '#fff', color: theme.text }} /></label>
                            <label style={{ fontSize: '9px', color: theme.textMuted, fontWeight: '800' }}>TÉRMINO<input type="date" value={dates.end} onChange={e => updateDate('end', e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '7px', borderRadius: '8px', border: `1px solid ${theme.cardBorder}`, background: darkMode ? '#11131b' : '#fff', color: theme.text }} /></label>
                          </div>
                        </div>;
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMuted }}>Semanas de Receso y Paros Registrados ({academicBreaks.length})</div>
                    {academicBreaks.map(b => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', borderLeft: `4px solid ${b.type === 'paro' ? '#ef4444' : '#10b981'}` }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                            {b.type === 'paro' ? '🚩 Paro: ' : '🌴 Receso: '}{b.title}
                          </div>
                          <span style={{ fontSize: '11px', color: theme.textMuted }}>{b.startDate} al {b.endDate}</span>
                        </div>
                        <button onClick={() => setAcademicBreaks(academicBreaks.filter(item => item.id !== b.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SUB-TAB: RAMOS & NOTAS */}
            {studySubTab === 'materias' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '14px' }}>
                  <button onClick={handleArchiveSemester} style={{ padding: '8px 14px', backgroundColor: '#e11d4815', color: theme.primary, border: `1px solid ${theme.primary}33`, borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    Cerrar Semestre
                  </button>
                  <button onClick={() => {
                    setSubSemester(currentSemesterNumber);
                    setSubBlocks([{ day: 'Lunes', startTime: '08:30', endTime: '10:00' }]);
                    setShowSubjectModal(true);
                  }} style={{ padding: '8px 16px', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    + Configurar Ramo
                  </button>
                </div>

                {subjects.length === 0 ? (
                  <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '18px', padding: '32px', textAlign: 'center' }}>
                    <p style={{ color: theme.textMuted, fontSize: '14px' }}>No tienes asignaturas registradas para este semestre.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
                    {subjects.map(sub => {
                      const stats = calculateSubjectMetrics(sub);
                      return (
                        <div key={sub.id} style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '18px', padding: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: sub.color || theme.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                                {sub.code}
                              </div>
                              <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>{sub.name}</h3>
                                <span style={{ fontSize: '11px', color: theme.textMuted }}>{sub.teacher} • Sala {sub.classroom}</span>
                              </div>
                            </div>
                            <div style={{display:'flex',gap:'4px'}}>
                              <button onClick={() => openSubjectEditor(sub)} title="Configurar ramo" style={{ background:'none',border:'none',color:theme.primary,cursor:'pointer' }}><Edit3 size={16}/></button>
                              <button onClick={() => setSubjects(subjects.filter(s => s.id !== sub.id))} title="Quitar del semestre" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {sub.notes ? <div style={{fontSize:'10px',color:theme.textMuted,marginBottom:'10px',lineHeight:1.5}}>📝 {sub.notes}</div> : null}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
                            <div>
                              <div style={{ fontSize: '10px', color: theme.textMuted }}>Nota Presentación</div>
                              <div style={{ fontSize: '20px', fontWeight: '900', color: stats.currentAverage >= 4.0 ? '#ffffff' : theme.primary }}>
                                {stats.currentAverage ? stats.currentAverage.toFixed(1) : '-.-'}
                              </div>
                              <span style={{ fontSize: '10px', color: theme.textMuted }}>Evaluado: {stats.gradedWeight}%</span>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: theme.textMuted }}>Condición</div>
                              {stats.isExempted ? (
                                <div style={{ fontSize: '12px', fontWeight: '900', color: '#10b981', marginTop: '4px' }}>
                                  🎉 Aprobado (Eximido)
                                </div>
                              ) : stats.finalGradeCalculated !== null ? (
                                <div style={{ fontSize: '12px', fontWeight: '900', color: stats.isPassed ? '#10b981' : theme.primary, marginTop: '4px' }}>
                                  {stats.isPassed ? `✅ Aprobado (${stats.finalGradeCalculated})` : `❌ ${stats.failReason}`}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', fontWeight: '700', color: sub.hasExemption ? '#ffffff' : theme.primary, marginTop: '2px' }}>
                                  {sub.hasExemption ? `Eximición (≥ ${Number(sub.exemptionGrade || 5.0).toFixed(1)})` : 'Examen Obligatorio'}
                                </div>
                              )}
                              {sub.isExamFailingRule && <span style={{ fontSize: '9px', color: theme.primary, fontWeight: 'bold' }}>⚠️ Examen Reprobatorio</span>}
                            </div>
                          </div>

                          {/* Cuadro Dinámico de Metas de Calificación Realista */}
                          {stats.pendingWeight > 0 && (
                            <div style={{ backgroundColor: darkMode ? '#181b28' : '#f1f5f9', padding: '10px 12px', borderRadius: '10px', fontSize: '11px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {sub.hasExemption && (
                                <div>
                                  • Para <strong>Eximirte ({Number(sub.exemptionGrade || 5.0).toFixed(1)})</strong>: necesitas nota <strong>{stats.neededForExemption > 7.0 ? '> 7.0 (Inalcanzable)' : stats.neededForExemption <= 1.0 ? '1.0 (Asegurado)' : stats.neededForExemption}</strong> en lo restante.
                                </div>
                              )}
                              <div>
                                • Para <strong>Asegurar 2 Oportunidades ({Number(sub.minGradeForTwoOpportunities || 3.9).toFixed(1)})</strong>: necesitas nota <strong>{stats.neededForTwoOpportunities <= 1.0 ? '1.0 (Asegurado)' : stats.neededForTwoOpportunities > 7.0 ? '> 7.0' : stats.neededForTwoOpportunities}</strong>.
                              </div>
                              <div>
                                • Para <strong>Derecho a Examen ({Number(sub.minGradeForOneOpportunity || 3.5).toFixed(1)})</strong>: necesitas nota <strong>{stats.neededForOneOpportunity <= 1.0 ? '1.0 (Asegurado)' : stats.neededForOneOpportunity > 7.0 ? '> 7.0 (Riesgo NCR)' : stats.neededForOneOpportunity}</strong>.
                              </div>
                            </div>
                          )}

                          {/* Evaluaciones regulares */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(sub.evaluations || []).map(ev => (
                              <div key={ev.id} onClick={() => handleUpdateGrade(sub.id, ev.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${theme.cardBorder}` }} title="Haz clic para registrar o cambiar la nota">
                                <span style={{ fontSize: '12px', fontWeight: '600' }}>{ev.name} ({ev.weight}%)</span>
                                <strong style={{ fontSize: '13px', color: ev.grade !== null ? (ev.grade >= 4.0 ? '#ffffff' : theme.primary) : theme.primary }}>
                                  {ev.grade !== null ? Number(ev.grade).toFixed(1) : '+ Poner Nota'}
                                </strong>
                              </div>
                            ))}

                            {/* Examen y 2ª oportunidad */}
                            {stats.requiresExam && (
                              <>
                                <div onClick={() => handleUpdateExamGrade(sub.id, 1)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',backgroundColor:sub.examGrade !== null && sub.examGrade !== undefined ? (stats.firstExamFailed ? '#e11d4822' : '#10b98122') : (darkMode ? '#1c151b' : '#ffe4e6'),borderRadius:'8px',cursor:'pointer',border:`1.5px dashed ${theme.primary}`}}>
                                  <div>
                                    <span style={{fontSize:'12px',fontWeight:'bold',color:theme.primary}}>🎯 Examen 1ª oportunidad ({sub.examWeight}%)</span>
                                    {stats.neededInExam > 0 && sub.examGrade === null && <div style={{fontSize:'10px',color:theme.textMuted}}>Necesitas: {stats.neededInExam <= 1 ? '1.0' : stats.neededInExam}</div>}
                                  </div>
                                  <strong style={{fontSize:'13px',color:sub.examGrade !== null && sub.examGrade !== undefined ? (stats.firstExamFailed ? theme.primary : '#10b981') : theme.primary}}>
                                    {sub.examGrade !== null && sub.examGrade !== undefined ? Number(sub.examGrade).toFixed(1) : '+ Rendir Examen'}
                                  </strong>
                                </div>

                                {stats.secondOpportunityAvailable && (
                                  <div onClick={() => handleUpdateExamGrade(sub.id, 2)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',marginTop:'6px',backgroundColor:sub.examGrade2 !== null && sub.examGrade2 !== undefined ? (stats.isPassed ? '#10b98122' : '#e11d4822') : (darkMode ? '#17141c' : '#fff1f2'),borderRadius:'8px',cursor:'pointer',border:'1.5px dashed #f59e0b'}}>
                                    <div>
                                      <span style={{fontSize:'12px',fontWeight:'bold',color:'#f59e0b'}}>🔁 Examen 2ª oportunidad</span>
                                      <div style={{fontSize:'10px',color:theme.textMuted}}>
                                        {sub.examGrade2 !== null && sub.examGrade2 !== undefined ? 'Esta nota reemplaza la 1ª para el cálculo.' : 'Disponible porque la 1ª oportunidad no fue suficiente.'}
                                      </div>
                                    </div>
                                    <strong style={{fontSize:'13px',color:sub.examGrade2 !== null && sub.examGrade2 !== undefined ? (stats.isPassed ? '#10b981' : theme.primary) : '#f59e0b'}}>
                                      {sub.examGrade2 !== null && sub.examGrade2 !== undefined ? Number(sub.examGrade2).toFixed(1) : '+ Rendir 2ª'}
                                    </strong>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
<div style={{backgroundColor:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:'20px',padding:isMobile?'15px':'20px',boxShadow:'0 10px 30px rgba(15,23,42,.05)'}}>
                  <div style={{display:'flex',flexDirection:isMobile?'column':'row',justifyContent:'space-between',alignItems:isMobile?'stretch':'flex-start',gap:12,marginBottom:14}}>
                    <div>
                      <h2 style={{fontSize:'18px',fontWeight:900,margin:'0 0 4px'}}>🧮 Calculadora de notas</h2>
                      <div style={{fontSize:'12px',color:theme.textMuted}}>Prueba varios certámenes y controles a la vez. Puedes simular notas futuras y ver la nota mínima que necesitas en cada evaluación para llegar a la meta que tú definas.</div>
                    </div>
                    <div style={{width:isMobile?'100%':'170px',flexShrink:0}}><label style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>META DE APROBACIÓN</label><input type="number" min="1" max="7" step="0.1" value={whatIfTargetGrade} onChange={e=>setWhatIfTargetGrade(Number(e.target.value)||4)} style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,padding:9,borderRadius:10,border:`1px solid ${theme.cardBorder}`,background:darkMode?'#11131b':'#fff',color:theme.text,fontWeight:900}}/></div>
                  </div>
                  <label style={{fontSize:11,fontWeight:800,color:theme.textMuted}}>RAMO
                    <select value={whatIfSubjectId ?? ''} onChange={e=>{const id=Number(e.target.value);setWhatIfSubjectId(id);setWhatIfGrades({});}} style={{display:'block',width:'100%',marginTop:5,padding:10,borderRadius:10,border:`1px solid ${theme.cardBorder}`,background:darkMode?'#11131b':'#fff',color:theme.text}}>
                      <option value="">Selecciona un ramo</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                  {whatIfData && (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:8,margin:'14px 0'}}>
                        <div style={{padding:11,borderRadius:12,backgroundColor:darkMode?'#11131b':'#f8faf9',border:`1px solid ${theme.cardBorder}`}}><div style={{fontSize:10,color:theme.textMuted,fontWeight:800}}>PROMEDIO SIMULADO</div><strong style={{fontSize:22,color:whatIfData.projectedAverage>=whatIfTargetGrade? '#10b981':theme.primary}}>{whatIfData.projectedAverage.toFixed(1)}</strong></div>
                        <div style={{padding:11,borderRadius:12,backgroundColor:darkMode?'#11131b':'#f8faf9',border:`1px solid ${theme.cardBorder}`}}><div style={{fontSize:10,color:theme.textMuted,fontWeight:800}}>PONDERACIÓN INGRESADA</div><strong style={{fontSize:22}}>{whatIfData.enteredWeight}%</strong></div>
                        <div style={{padding:11,borderRadius:12,backgroundColor:darkMode?'#11131b':'#f8faf9',border:`1px solid ${theme.cardBorder}`}}><div style={{fontSize:10,color:theme.textMuted,fontWeight:800}}>FALTA</div><strong style={{fontSize:22}}>{whatIfData.missingWeight}%</strong></div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {whatIfData.evals.map(ev=>{
                          const actual=ev.grade; const hypothetical=whatIfGrades[ev.id]; const shown=hypothetical!==undefined && hypothetical!=='' ? hypothetical : (actual ?? '');
                          const needed=whatIfData.requiredFor(ev);
                          return <div key={ev.id} style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'minmax(180px,1.4fr) 90px 160px',gap:8,alignItems:'center',padding:'10px 12px',borderRadius:12,border:`1px solid ${theme.cardBorder}`,backgroundColor:darkMode?'#0f1219':'#fff'}}>
                            <div><div style={{fontSize:12,fontWeight:900}}>{ev.name}</div><div style={{fontSize:10,color:theme.textMuted}}>{ev.type} · {ev.weight}% {actual!==null && actual!==undefined ? `· registrada: ${Number(actual).toFixed(1)}` : '· pendiente'}</div></div>
                            <input type="number" min="1" max="7" step="0.1" value={shown} placeholder="Nota" onChange={e=>setWhatIfGrades(prev=>({...prev,[ev.id]:e.target.value}))} style={{width:'100%',boxSizing:'border-box',padding:9,borderRadius:9,border:`1px solid ${theme.cardBorder}`,background:darkMode?'#11131b':'#fff',color:theme.text,fontWeight:800}}/>
                            <div style={{fontSize:11,textAlign:isMobile?'left':'right',color:needed===null?'#10b981':needed<=whatIfTargetGrade?'#10b981':needed<=7?theme.primary:'#e11d48',fontWeight:800}}>{needed===null ? '✓ Ya hay nota' : needed<=1 ? 'Necesitas 1,0' : needed<=7 ? `Necesitas ${needed.toFixed(1)}` : 'Ni con 7,0 alcanza'}</div>
                          </div>;
                        })}
                      </div>
                      <div style={{marginTop:12,padding:11,borderRadius:11,backgroundColor:darkMode?'#11131b':'#f0fdf4',border:`1px solid ${darkMode?'#285b52':'#bbf7d0'}`,fontSize:11,color:theme.textMuted}}>
                        💡 <strong style={{color:theme.text}}>La columna “Necesitas” calcula la nota mínima en esa evaluación suponiendo que las demás pendientes quedan sin nota y las que ya tienen nota se mantienen.</strong> Si quieres probar varios certámenes/controles, simplemente escribe una nota en cada fila: el promedio simulado se actualizará en tiempo real.
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 3. SUB-TAB: MALLA */}
            {studySubTab === 'malla' && (
              <div>
                <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', fontSize: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '3px' }}></div>
                    <span>Aprobado (Verde)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: theme.primary, borderRadius: '3px' }}></div>
                    <span>Reprobado (Rojo)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px' }}>
                  {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(semNum => {
                    const semSubjects = curriculum.filter(c => c.semester === semNum);
                    const isCurrent = semNum === currentSemesterNumber;

                    return (
                      <div key={semNum} style={{ minWidth: isMobile ? '200px' : '220px', backgroundColor: theme.card, border: isCurrent ? `2px solid ${theme.primary}` : `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '12px', fontWeight: '900', textAlign: 'center', borderBottom: `1px solid ${theme.cardBorder}`, paddingBottom: '6px', marginBottom: '8px', color: isCurrent ? theme.primary : theme.text }}>
                          Semestre {semNum} {isCurrent && '📍'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {semSubjects.length === 0 ? (
                            <div style={{ fontSize: '11px', color: theme.textMuted, textAlign: 'center', padding: '12px 0' }}>Sin ramos</div>
                          ) : (
                            semSubjects.map(item => {
                              const sync = getCurriculumSubjectStatus(item);
                              const isApproved = sync.status === 'aprobado';
                              const isFailed = sync.status === 'reprobado';

                              let borderColor = theme.cardBorder;
                              let badgeColor = theme.textMuted;
                              if (isApproved) {
                                borderColor = '#10b981';
                                badgeColor = '#10b981';
                              } else if (isFailed) {
                                borderColor = theme.primary;
                                badgeColor = theme.primary;
                              }

                              return (
                                <div key={item.id} style={{ backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1.5px solid ${borderColor}`, borderRadius: '10px', padding: '10px' }}>
                                  <div style={{ fontWeight: '800', fontSize: '12px' }}>{item.name}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '10px' }}>
                                    <span style={{ color: badgeColor, fontWeight: 'bold' }}>
                                      {sync.grade ? `${sync.status} (${Number(sync.grade).toFixed(1)})` : sync.status}
                                    </span>
                                    <span style={{ color: theme.textMuted }}>{item.credits} SCT</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. SUB-TAB: HORARIO */}
            {studySubTab === 'horario' && (
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Horario Semanal (Semestre {currentSemesterNumber})</h2>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>
                    Configurado automáticamente por tus ramos. Las clases se reemplazan automáticamente si hay Certamen o Examen a esa hora.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                  {DAYS.map(day => {
                    const dayBlocks = activeSemesterSchedule.filter(b => b.day === day);
                    return (
                      <div key={day} style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '14px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.primary, marginBottom: '8px', textAlign: 'center' }}>{day}</div>
                        {dayBlocks.length === 0 ? (
                          <div style={{ fontSize: '11px', color: theme.textMuted, textAlign: 'center', padding: '10px 0' }}>Sin clases</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {dayBlocks.map(b => {
                              const blockBg = b.isActiveNow 
                                ? '#10b98122' 
                                : b.isReplacedByExam 
                                ? '#e11d4822' 
                                : (darkMode ? '#0e1017' : '#f8f9fa');
                              
                              const borderLeftColor = b.isActiveNow 
                                ? '#10b981' 
                                : b.isReplacedByExam 
                                ? theme.primary 
                                : (b.color || theme.primary);

                              return (
                                <div 
                                  key={b.id} 
                                  style={{ 
                                    padding: '8px 10px', 
                                    borderRadius: '8px', 
                                    backgroundColor: blockBg, 
                                    borderLeft: `4px solid ${borderLeftColor}`,
                                    border: b.isActiveNow ? '1.5px solid #10b981' : (b.isReplacedByExam ? `1px dashed ${theme.primary}` : 'none')
                                  }}>
                                  {b.isActiveNow && (
                                    <div style={{ fontSize: '9px', color: '#10b981', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '2px' }}>
                                      🟢 EN CURSO AHORA
                                    </div>
                                  )}

                                  {b.isReplacedByExam ? (
                                    <div>
                                      <div style={{ fontSize: '10px', color: theme.primary, fontWeight: '900' }}>⚠️ EVALUACIÓN (Reemplaza clase)</div>
                                      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{b.examTitle}</div>
                                      <div style={{ fontSize: '10px', color: theme.textMuted }}>{b.startTime} - {b.endTime}</div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{b.subjectName}</div>
                                      <div style={{ fontSize: '10px', color: theme.textMuted }}>{b.startTime} - {b.endTime}</div>
                                      <div style={{ fontSize: '10px', color: theme.textMuted }}>Sala: {b.room}</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. SUB-TAB: ENTREGAS */}
            {studySubTab === 'calendario' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Entregas & Evaluaciones ({academicTasks.length})</h2>
                  <button onClick={() => {
                    if (subjects.length > 0 && !taskSubject) setTaskSubject(subjects[0].name);
                    setShowAcademicTaskModal(true);
                  }} style={{ padding: '8px 14px', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    + Agendar
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {academicTasks.map(t => (
                    <div key={t.id} style={{ padding: '14px', backgroundColor: theme.card, borderRadius: '12px', border: `1px solid ${theme.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{t.title}</div>
                        <span style={{ fontSize: '11px', color: theme.primary }}>{t.subject} ({t.type}) • Pondera {t.weight}%</span>
                        {t.notes && <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>{t.notes}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>📅 {t.dueDate}</span>
                        <div>
                          <button onClick={() => setAcademicTasks(academicTasks.filter(item => item.id !== t.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. SUB-TAB: HISTORIAL */}
            {studySubTab === 'historial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{backgroundColor:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:'18px',padding:'18px'}}>
                  <h2 style={{fontSize:17,fontWeight:900,margin:'0 0 12px'}}>📈 Historial de rendimiento por semestre</h2>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',gap:9}}>{semesterHistory.map(h=><div key={h.sem} style={{padding:11,borderRadius:11,border:`1px solid ${theme.cardBorder}`,background:darkMode?'#11131b':'#f8f9fa'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>Semestre {h.sem}</strong><span style={{fontSize:11,color:theme.textMuted}}>{h.approved}/{h.rows.length} aprobados</span></div><div style={{fontSize:11,color:theme.textMuted,marginTop:4}}>{h.sct} / {h.total} SCT aprobados</div></div>)}</div>
                </div>
                {archivedSemesters.map(arch => (
                  <div key={arch.id} style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>{arch.name}</h3>
                        <span style={{ fontSize: '12px', color: theme.textMuted }}>Promedio Final: <strong style={{ color: theme.primary }}>{arch.finalAverage}</strong></span>
                      </div>
                      <button onClick={() => setArchivedSemesters(archivedSemesters.filter(s => s.id !== arch.id))} style={{ background: '#ef444415', border: '1px solid #ef444433', color: '#ef4444', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= VISTA: FINANZAS ================= */}
        {activeTab === 'finanzas' && (
          <div>
            {selectedAccount ? (
              <div>
                <button onClick={() => setSelectedAccountId(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: '700', marginBottom: '16px', padding: 0 }}>
                  <ChevronLeft size={18} /> Volver a Cuentas
                </button>
                <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '22px', padding: '24px', marginBottom: '20px', borderLeft: `6px solid ${selectedAccount.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: selectedAccount.color }}>{selectedAccount.name.toUpperCase()}</span>
                      <div style={{ fontSize: '38px', fontWeight: '900', margin: '4px 0' }}>{formatCLP(selectedAccount.balance)}</div>
                      <span style={{ fontSize: '12px', color: theme.textMuted }}>Saldo disponible</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setTransType('ingreso'); setShowTransactionModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                        <ArrowUpRight size={16} /> + Abono
                      </button>
                      <button onClick={() => { setTransType('gasto'); setShowTransactionModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#e11d48', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                        <ArrowDownRight size={16} /> - Cargo
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom:'16px' }}>
                  <MoneyLineChart data={accountChartData} theme={theme} title={`Flujo de ${selectedAccount.name}`} />
                </div>

                <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px' }}>Historial de Movimientos</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedAccountTransactions.map(trans => (
                      <div key={trans.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', border: `1px solid ${theme.cardBorder}` }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>{trans.description}</div>
                          <span style={{ fontSize: '11px', color: theme.textMuted }}>{trans.date} • {trans.category || 'General'}</span>
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: trans.type === 'ingreso' ? '#10b981' : '#e11d48' }}>
                          {trans.type === 'ingreso' ? '+' : '-'}{formatCLP(trans.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', margin: 0 }}>Economía y Compras 💳</h1>
                    <p style={{ color: theme.textMuted, fontSize: '13px', margin: '4px 0 0 0' }}>Gestiona cuentas, tarjetas, ahorro y compras previstas</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowNewAccountModal(true)} style={{ padding: '10px 14px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, borderRadius: '12px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                      + Nueva Cuenta
                    </button>
                    <button onClick={() => setShowGoalModal(true)} style={{ padding: '10px 16px', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                      + Objetivo
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {accountsList.map(acc => (
                    <div key={acc.id} onClick={() => setSelectedAccountId(acc.id)} style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '20px', border: `1px solid ${theme.cardBorder}`, cursor: 'pointer', borderLeft: `5px solid ${acc.color}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textMuted, fontSize: '11px', fontWeight: '800' }}>
                          <span>{acc.name.toUpperCase()}</span>
                          <CreditCard size={16} color={acc.color} />
                        </div>
                        <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '6px' }}>{formatCLP(acc.balance)}</div>
                      </div>
                      <span style={{ fontSize: '11px', color: acc.color, fontWeight: '700', marginTop: '8px' }}>Ver movimientos ➔</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom:'24px' }}>
                  <MoneyLineChart data={generalMoneyChartData} theme={theme} title="Flujo total de todas las cuentas" />
                </div>

                {/* Objetivos de Compra */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div><h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>Objetivos de Compra</h2><div style={{fontSize:11,color:theme.textMuted,marginTop:3}}>Ahorra para compras concretas y ve cuánto falta.</div></div><button onClick={() => setShowGoalModal(true)} style={{padding:'8px 11px',borderRadius:10,border:`1px solid ${theme.cardBorder}`,background:theme.card,color:theme.text,fontSize:11,fontWeight:800}}>+ Objetivo</button></div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                    {savingGoals.map(goal => { const progress=Math.min(100,Math.round((goal.currentAmount/Math.max(goal.targetAmount,1))*100)); return (
                      <div key={goal.id} style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '22px' }}>{goal.emoji}</span>
                          <button onClick={() => setSavingGoals(savingGoals.filter(g => g.id !== goal.id))} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer' }}><Trash2 size={15} /></button>
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: '900', margin: '8px 0 3px' }}>{goal.title}</h3>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:theme.textMuted}}><span>{formatCLP(goal.currentAmount)}</span><span>{formatCLP(goal.targetAmount)}</span></div>
                        <div style={{height:8,background:darkMode?'#2b2b2f':'#ececf0',borderRadius:99,overflow:'hidden',margin:'8px 0 10px'}}><div style={{height:'100%',width:`${progress}%`,background:theme.text,borderRadius:99}} /></div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><span style={{fontSize:11,fontWeight:900}}>{progress}%</span><button onClick={()=>addMoneyToGoal(goal.id)} style={{padding:'7px 10px',borderRadius:9,border:`1px solid ${theme.cardBorder}`,background:darkMode?'#1f1f22':'#f4f4f5',color:theme.text,fontSize:11,fontWeight:800}}>+ Agregar dinero</button></div>
                      </div>
                    );})}
                  </div>
                </div>

                {/* Lista de compras sin montos */}
                <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px' }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:10}}><div><h2 style={{fontSize:16,fontWeight:900,margin:0}}>Lista de compras</h2><div style={{fontSize:11,color:theme.textMuted,marginTop:3}}>Ideas y compras futuras, sin precios ni presión de ahorro.</div></div><button onClick={()=>setShowShoppingModal(true)} style={{padding:'8px 11px',borderRadius:10,border:`1px solid ${theme.cardBorder}`,background:theme.text,color:darkMode?'#090909':'#fff',fontSize:11,fontWeight:900}}>+ Añadir</button></div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>{(['Todos','Ropa','Tecnología','Salud','Lifestyle','Fitness','Skincare','Ocio','Otros'] as const).map(cat=><button key={cat} onClick={()=>setShoppingCategoryFilter(cat as any)} style={{padding:'6px 9px',borderRadius:99,border:`1px solid ${theme.cardBorder}`,background:theme.card,color:theme.textMuted,fontSize:10,fontWeight:800}}>{cat}</button>)}</div>
                  {(shoppingCategoryFilter !== 'Todos' ? shoppingItems.filter(x=>x.category===shoppingCategoryFilter) : shoppingItems).length===0 ? <div style={{fontSize:12,color:theme.textMuted,padding:'10px 0'}}>Todavía no has guardado compras pensadas.</div> : <div style={{display:'flex',flexDirection:'column',gap:6}}>{(shoppingCategoryFilter !== 'Todos' ? shoppingItems.filter(x=>x.category===shoppingCategoryFilter) : shoppingItems).map(item=><div key={item.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'9px 10px',borderRadius:10,border:`1px solid ${theme.cardBorder}`,background:darkMode?'#111113':'#fafafa'}}><label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontWeight:800,cursor:'pointer'}}><input type='checkbox' checked={item.completed} onChange={()=>setShoppingItems(shoppingItems.map(x=>x.id===item.id?{...x,completed:!x.completed}:x))}/><span style={{textDecoration:item.completed?'line-through':'none',color:item.completed?theme.textMuted:theme.text}}>{item.emoji || '🛍️'} {item.title}</span></label><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:9,color:theme.textMuted}}>{item.category}</span><button onClick={()=>setShoppingItems(shoppingItems.filter(x=>x.id!==item.id))} style={{border:0,background:'none',color:theme.textMuted,cursor:'pointer'}}><Trash2 size={13}/></button></div></div>)}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= VISTA: HÁBITOS ================= */}
        {activeTab === 'habitos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: 10, flexWrap: 'wrap' }}>
              <div><h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '900', margin: 0 }}>Hábitos</h1><p style={{ color: theme.textMuted, fontSize: '12px', margin: '5px 0 0' }}>Primero registra hoy. Después revisa tu constancia semanal y mensual.</p></div>
              <button onClick={() => setShowHabitModal(true)} style={{ padding: '9px 13px', backgroundColor: theme.text, color: darkMode ? '#090909' : '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>+ Hábito</button>
            </div>

            <div style={{display:'flex',gap:6,background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:12,padding:4,marginBottom:12,overflowX:'auto'}}>
              {[['dia','Hoy'],['semana','Semana'],['mes','Mes']].map(([id,label])=><button key={id} onClick={()=>setHabitSubTab(id as 'dia'|'semana'|'mes')} style={{flex:1,minWidth:90,padding:'9px 12px',borderRadius:9,border:'none',background:habitSubTab===id?theme.text:'transparent',color:habitSubTab===id?(darkMode?'#090909':'#fff'):theme.textMuted,fontSize:11,fontWeight:900,cursor:'pointer'}}>{label}</button>)}
            </div>

            {habitSubTab === 'dia' && (
              <div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:8,marginBottom:12}}>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>HOY</div><div style={{fontSize:24,fontWeight:900,marginTop:4}}>{habitsDone}/{habits.length}</div><div style={{fontSize:10,color:theme.textMuted,marginTop:3}}>hábitos completados</div></div>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>PENDIENTES</div><div style={{fontSize:24,fontWeight:900,marginTop:4}}>{Math.max(0,habits.length-habitsDone)}</div><div style={{fontSize:10,color:theme.textMuted,marginTop:3}}>para cerrar el día</div></div>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14,gridColumn:isMobile?'1 / -1':'auto'}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>CONSTANCIA SEMANAL</div><div style={{fontSize:24,fontWeight:900,marginTop:4}}>{weekRate}%</div><div style={{height:5,background:darkMode?'#2b2b2f':'#e7e7e7',borderRadius:99,marginTop:7}}><div style={{height:'100%',width:`${weekRate}%`,background:theme.text,borderRadius:99}} /></div></div>
                </div>
                <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:16,padding:isMobile?12:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:12}}>
                    <div><div style={{fontSize:14,fontWeight:900}}>Hábitos de hoy</div><div style={{fontSize:10,color:theme.textMuted}}>{todayDateObj.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</div></div>
                    <div style={{fontSize:11,fontWeight:900}}>{habitsDone === habits.length && habits.length > 0 ? 'Día completo ✓' : `${Math.max(0, habits.length-habitsDone)} pendientes`}</div>
                  </div>
                  {habits.length === 0 ? <div style={{padding:'26px 10px',textAlign:'center',color:theme.textMuted,fontSize:12}}>Todavía no tienes hábitos. Crea el primero con “+ Hábito”.</div> : <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {habits.map(h=>{const done=isHabitDoneOn(h.id,todayStr); return <button key={h.id} onClick={()=>toggleHabitToday(h.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'12px 13px',borderRadius:12,border:`1px solid ${done?theme.text:theme.cardBorder}`,background:done?(darkMode?'#1c1d20':'#f2f2f2'):darkMode?'#111113':'#fafafa',color:theme.text,textAlign:'left',cursor:'pointer'}}>
                      <div style={{width:32,height:32,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${done?theme.text:theme.cardBorder}`,background:done?theme.text:'transparent',color:done?(darkMode?'#090909':'#fff'):theme.text,fontSize:16,flexShrink:0}}>{done?'✓':(h.icon||'🎯')}</div>
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:900,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.name}</div><div style={{fontSize:10,color:theme.textMuted}}>{h.category} · racha {habitStreak(h.id)} días</div></div>
                      <div style={{fontSize:10,fontWeight:900,color:done?theme.text:theme.textMuted}}>{done?'Hecho':'Marcar'}</div>
                    </button>;})}
                  </div>}
                </div>
              </div>
            )}

            {habitSubTab === 'semana' && (
              <div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:8,marginBottom:12}}>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>SEMANA</div><div style={{fontSize:24,fontWeight:900,marginTop:4}}>{weekRate}%</div><div style={{fontSize:10,color:theme.textMuted}}>cumplimiento</div></div>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>REGISTROS</div><div style={{fontSize:24,fontWeight:900,marginTop:4}}>{totalHabitCompletionsThisWeek}</div><div style={{fontSize:10,color:theme.textMuted}}>de {weekPossible} posibles</div></div>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14,gridColumn:isMobile?'1 / -1':'auto'}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>MEJOR RACHA</div><div style={{fontSize:24,fontWeight:900,marginTop:4}}>{habits.length?Math.max(...habits.map(h=>habitStreak(h.id))):0}</div><div style={{fontSize:10,color:theme.textMuted}}>días seguidos</div></div>
                </div>
                <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: isMobile ? '12px' : '16px', overflowX: 'auto' }}>
                  <div style={{ minWidth: isMobile ? '620px' : '0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `minmax(180px, 1.4fr) repeat(7, 1fr) 90px`, gap: 6, alignItems: 'center', fontSize: 10, color: theme.textMuted, fontWeight: 800, marginBottom: 8 }}>
                      <div>HÁBITO</div>
                      {currentWeekDays.map((d, i) => <div key={i} style={{ textAlign:'center' }}>{d.toLocaleDateString('es-CL',{weekday:'short'}).replace('.','')}<br/>{d.getDate()}</div>)}
                      <div style={{ textAlign:'right' }}>RACHA</div>
                    </div>
                    {habits.map(h => (
                      <div key={h.id} style={{ display: 'grid', gridTemplateColumns: `minmax(180px, 1.4fr) repeat(7, 1fr) 90px`, gap: 6, alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${theme.cardBorder}` }}>
                        <div><div style={{fontWeight:800,fontSize:12}}>{h.icon || '🎯'} {h.name}</div><div style={{fontSize:10,color:theme.textMuted}}>{h.category}</div></div>
                        {currentWeekDays.map((d,i)=>{const ds=formatLocalDate(d); const done=isHabitDoneOn(h.id,ds); const isToday=ds===todayStr; return <button key={i} onClick={()=>isToday?toggleHabitToday(h.id):undefined} title={isToday?'Marcar/desmarcar hoy':'Historial'} style={{height:28,borderRadius:8,border:`1px solid ${done?theme.text:theme.cardBorder}`,background:done?theme.text:'transparent',color:done?(darkMode?'#090909':'#fff'):theme.textMuted,cursor:isToday?'pointer':'default',fontWeight:900}}>{done?'✓':'·'}</button>})}
                        <div style={{textAlign:'right',fontSize:11,fontWeight:900}}>{habitStreak(h.id)} días</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:12,backgroundColor:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:16,padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div><div style={{fontSize:13,fontWeight:900}}>Resumen semanal</div><div style={{fontSize:10,color:theme.textMuted}}>Lunes a domingo</div></div><div style={{fontSize:16,fontWeight:900}}>{weekRate}%</div></div>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',gap:8}}>{habits.map(h=>{const count=habitCountBetween(h.id,currentWeekStart,currentWeekEnd); const pct=Math.round(count/7*100); return <div key={h.id} style={{padding:11,border:`1px solid ${theme.cardBorder}`,borderRadius:12}}><div style={{fontSize:11,fontWeight:800}}>{h.icon} {h.name}</div><div style={{fontSize:20,fontWeight:900,marginTop:4}}>{count}/7</div><div style={{fontSize:10,color:theme.textMuted}}>días cumplidos</div><div style={{height:5,background:darkMode?'#2b2b2f':'#e5e7eb',borderRadius:9,marginTop:8}}><div style={{height:'100%',width:`${pct}%`,background:theme.text,borderRadius:9}} /></div></div>})}</div>
                </div>
              </div>
            )}

            {habitSubTab === 'mes' && (
              <div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:8,marginBottom:12}}>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>MES</div><div style={{fontSize:24,fontWeight:900,marginTop:4}}>{monthRate}%</div><div style={{fontSize:10,color:theme.textMuted}}>cumplimiento</div></div>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>REGISTROS</div><div style={{fontSize:24,fontWeight:900,marginTop:4}}>{totalHabitCompletionsThisMonth}</div><div style={{fontSize:10,color:theme.textMuted}}>de {monthPossible} posibles</div></div>
                  <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:14,padding:14,gridColumn:isMobile?'1 / -1':'auto'}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted}}>MEJOR HÁBITO DEL MES</div><div style={{fontSize:16,fontWeight:900,marginTop:5}}>{habits.length ? habits.slice().sort((a,b)=>habitCountBetween(b.id,monthStart,monthEnd)-habitCountBetween(a.id,monthStart,monthEnd))[0]?.name : '—'}</div><div style={{fontSize:10,color:theme.textMuted,marginTop:3}}>{habits.length ? `${habitCountBetween(habits.slice().sort((a,b)=>habitCountBetween(b.id,monthStart,monthEnd)-habitCountBetween(a.id,monthStart,monthEnd))[0].id,monthStart,monthEnd)} días cumplidos` : 'Sin hábitos registrados'}</div></div>
                </div>

                <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:16,padding:isMobile?12:16,marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div><div style={{fontSize:13,fontWeight:900,textTransform:'capitalize'}}>{todayDateObj.toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</div><div style={{fontSize:10,color:theme.textMuted}}>Vista mensual del cumplimiento</div></div><div style={{fontSize:11,fontWeight:900}}>{monthRate}%</div></div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:8,fontSize:9,color:theme.textMuted,fontWeight:900,textAlign:'center'}}>{['L','M','X','J','V','S','D'].map(d=><div key={d}>{d}</div>)}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
                    {monthCalendarDays.map((d,i)=>{const ds=formatLocalDate(d); const inMonth=d.getMonth()===todayDateObj.getMonth(); const doneCount=habits.filter(h=>isHabitDoneOn(h.id,ds)).length; const pct=habits.length?Math.round(doneCount/habits.length*100):0; return <div key={i} title={`${d.toLocaleDateString('es-CL')}: ${doneCount}/${habits.length} hábitos`} style={{aspectRatio:'1',minHeight:isMobile?26:34,borderRadius:7,border:`1px solid ${theme.cardBorder}`,background:!inMonth?(darkMode?'#0d0d0f':'#f8f8f8'):pct===100?theme.text:pct>0?(darkMode?'#2b2c30':'#dedede'):'transparent',color:!inMonth?theme.textMuted:(pct===100?(darkMode?'#090909':'#fff'):theme.text),display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900}}>{d.getDate()}</div>})}
                  </div>
                </div>

                <div style={{background:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:16,padding:16}}>
                  <div style={{fontSize:13,fontWeight:900,marginBottom:9}}>Resumen mensual por hábito</div>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',gap:8}}>{habits.map(h=>{const count=habitCountBetween(h.id,monthStart,monthEnd); const pct=Math.round(count/monthEnd.getDate()*100); return <div key={h.id} style={{padding:11,border:`1px solid ${theme.cardBorder}`,borderRadius:12}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><div style={{fontSize:11,fontWeight:800}}>{h.icon} {h.name}</div><div style={{fontSize:11,fontWeight:900}}>{count}/{monthEnd.getDate()}</div></div><div style={{fontSize:10,color:theme.textMuted,marginTop:3}}>{pct}% del mes</div><div style={{height:5,background:darkMode?'#2b2b2f':'#e5e7eb',borderRadius:9,marginTop:8}}><div style={{height:'100%',width:`${pct}%`,background:theme.text,borderRadius:9}} /></div></div>})}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= VISTA: TO-DO ================= */}
        {activeTab === 'todos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', margin: 0 }}>To-Do List 📝</h1>
                <p style={{ color: theme.textMuted, fontSize: '13px', margin: '4px 0 0 0' }}>Organizado por prioridad (Alta, Media, Baja)</p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', backgroundColor: theme.card, padding: '4px', borderRadius: '10px', border: `1px solid ${theme.cardBorder}` }}>
                  {(['Todas', 'Pendientes', 'Completadas'] as const).map(f => (
                    <button key={f} onClick={() => setTodoFilter(f)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: todoFilter === f ? theme.primary : 'transparent', color: todoFilter === f ? '#fff' : theme.textMuted, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {f}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowTodoModal(true)} style={{ padding: '8px 16px', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  + Nueva Tarea
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedTodos.length === 0 ? (
                <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '30px', textAlign: 'center', color: theme.textMuted, fontSize: '13px' }}>
                  No hay tareas en esta categoría.
                </div>
              ) : (
                sortedTodos.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '14px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="checkbox" checked={item.completed} onChange={() => setPersonalTodos(personalTodos.map(td => td.id === item.id ? { ...td, completed: !td.completed } : td))} style={{ accentColor: theme.primary, width: '18px', height: '18px', cursor: 'pointer' }} />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? theme.textMuted : theme.text }}>
                          {item.title}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: darkMode ? '#1f253d' : '#eef2ff', color: theme.textMuted, fontWeight: '600' }}>
                            🏷️ {item.category}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: item.priority === 'Alta' ? '#ef4444' : item.priority === 'Media' ? '#f59e0b' : '#10b981' }}>
                            • Prioridad {item.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: item.dueDate ? theme.text : theme.textMuted }}>
                        📅 {item.dueDate || 'Sin fecha'}{item.dueTime ? ` · ${item.dueTime}` : ''}
                      </span>
                      <button onClick={() => setPersonalTodos(personalTodos.filter(td => td.id !== item.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= VISTA: CALENDARIO MAESTRO ================= */}
        {activeTab === 'calendario' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', margin: 0 }}>Calendario Maestro 📅</h1>
                <p style={{ color: theme.textMuted, fontSize: '13px', margin: '4px 0 0 0' }}>Con Feriados Oficiales de Chile, Recesos y Paros</p>
              </div>

              <div style={{ display: 'flex', backgroundColor: theme.card, padding: '4px', borderRadius: '10px', border: `1px solid ${theme.cardBorder}` }}>
                <button onClick={() => setCalendarViewMode('semanal')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: calendarViewMode === 'semanal' ? theme.primary : 'transparent', color: calendarViewMode === 'semanal' ? '#fff' : theme.textMuted, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Semanal
                </button>
                <button onClick={() => setCalendarViewMode('mensual')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: calendarViewMode === 'mensual' ? theme.primary : 'transparent', color: calendarViewMode === 'mensual' ? '#fff' : theme.textMuted, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Mensual
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '4px', backgroundColor: theme.primary, borderRadius: '2px' }}></div>
                <span>Clases Regulares</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '4px', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
                <span>Receso / Feriado / Vacaciones</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '4px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div>
                <span>Paro / Toma</span>
              </div>
            </div>

            {calendarViewMode === 'semanal' && (
              <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '18px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {currentWeekDays.map((d, idx) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedCalendarDate;
                    const dayEvents = calendarEvents.filter(ev => ev.date === dateStr);
                    const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
                    const academicStatus = getDateAcademicStatus(dateStr);

                    let statusColor = theme.primary;
                    if (academicStatus.type === 'receso_vacaciones' || academicStatus.type === 'feriado') statusColor = '#10b981';
                    if (academicStatus.type === 'paro') statusColor = '#f59e0b';

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedCalendarDate(dateStr)}
                        style={{
                          textAlign: 'center',
                          padding: '12px 4px 8px 4px',
                          borderRadius: '14px',
                          backgroundColor: isSelected ? (darkMode ? '#221116' : '#ffe4e6') : (darkMode ? '#0e1017' : '#f8f9fa'),
                          border: isSelected ? `2px solid ${theme.primary}` : (isToday ? `1px dashed ${theme.primary}` : `1px solid ${theme.cardBorder}`),
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '85px'
                        }}>
                        <div>
                          <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 'bold' }}>{dayName}</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', margin: '4px 0', color: isSelected ? theme.primary : theme.text }}>
                            {d.getDate()}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', minHeight: '6px' }}>
                            {dayEvents.slice(0, 3).map((ev, i) => (
                              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: ev.type === 'acad' ? theme.text : ev.type === 'class' ? theme.textMuted : theme.cardBorder }} />
                            ))}
                          </div>
                        </div>

                        <div style={{ width: '80%', height: '3.5px', margin: '6px auto 0 auto', borderRadius: '2px', backgroundColor: statusColor }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {calendarViewMode === 'mensual' && (
              <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '18px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', textTransform: 'capitalize' }}>
                  {todayDateObj.toLocaleString('es-CL', { month: 'long', year: 'numeric' })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '11px', color: theme.textMuted, fontWeight: 'bold', marginBottom: '8px' }}>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => <div key={i}>{d}</div>)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                  {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty_${i}`} style={{ minHeight: '48px' }} />
                  ))}

                  {Array.from({ length: daysInCurrentMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedCalendarDate;
                    const dayEvents = calendarEvents.filter(ev => ev.date === dateStr);
                    const academicStatus = getDateAcademicStatus(dateStr);

                    let statusColor = theme.primary;
                    if (academicStatus.type === 'receso_vacaciones' || academicStatus.type === 'feriado') statusColor = '#10b981';
                    if (academicStatus.type === 'paro') statusColor = '#f59e0b';

                    return (
                      <div
                        key={dayNum}
                        onClick={() => setSelectedCalendarDate(dateStr)}
                        style={{
                          textAlign: 'center',
                          padding: '6px 2px',
                          borderRadius: '10px',
                          backgroundColor: isSelected ? (darkMode ? '#221116' : '#ffe4e6') : (darkMode ? '#0e1017' : '#f8f9fa'),
                          border: isSelected ? `2px solid ${theme.primary}` : (isToday ? `1px dashed ${theme.primary}` : `1px solid ${theme.cardBorder}`),
                          cursor: 'pointer',
                          minHeight: '48px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                        <span style={{ fontSize: '12px', fontWeight: isToday || isSelected ? '900' : '600', color: isSelected ? theme.primary : theme.text }}>
                          {dayNum}
                        </span>

                        <div style={{ display: 'flex', gap: '3px' }}>
                          {dayEvents.slice(0, 3).map((ev, idx) => (
                            <div key={idx} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: ev.type === 'acad' ? theme.text : ev.type === 'class' ? theme.textMuted : theme.cardBorder }} />
                          ))}
                        </div>

                        <div style={{ width: '75%', height: '3px', borderRadius: '2px', backgroundColor: statusColor }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                    {selectedCalendarDate} {selectedCalendarDate === todayStr && '🔥 (Hoy)'}
                  </h3>
                  <div style={{ fontSize: '12px', color: selectedDateStatus.type === 'clases' ? theme.primary : '#10b981', fontWeight: 'bold', marginTop: '2px' }}>
                    {selectedDateStatus.label}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: theme.textMuted }}>{selectedDateEvents.length} compromisos</span>
              </div>

              {selectedDateEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: theme.textMuted, fontSize: '13px' }}>
                  Sin eventos agendados para este día.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDateEvents.map(ev => (
                    <div
                      key={ev.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        borderRadius: '14px',
                        backgroundColor: darkMode ? '#0e1017' : '#f9fafb',
                        borderLeft: `5px solid ${ev.type === 'acad' ? theme.text : ev.type === 'class' ? theme.textMuted : theme.cardBorder}`, 
                        border: `1px solid ${theme.cardBorder}`
                      }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px' }}>{ev.title}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>{ev.subtitle}</div>
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: ev.type === 'acad' ? (darkMode ? '#242426' : '#eeeeef') : ev.type === 'class' ? (darkMode ? '#1f1f22' : '#f1f1f3') : (darkMode ? '#1f1f22' : '#f4f4f5'), color: theme.text }}>
                        {ev.type === 'acad' ? 'Académico' : 'Personal'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VISTA: ENLACES ================= */}
        {activeTab === 'enlaces' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', margin: 0 }}>Vault / Enlaces 🔗</h1>
                <p style={{ color: theme.textMuted, fontSize: '13px', margin: '4px 0 0 0' }}>Accesos directos, enlaces y recursos guardados.</p>
              </div><button onClick={()=>setShowBookmarkModal(true)} style={{padding:'9px 12px',border:0,borderRadius:9,background:theme.text,color:darkMode?'#090909':'#fff',fontWeight:900,fontSize:11,display:'flex',alignItems:'center',gap:5}}><Plus size={14}/> Añadir</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {bookmarks.map(bm => (
                <div key={bm.id} style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '18px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {bm.imageUrl ? <img src={bm.imageUrl} alt='' style={{width:42,height:42,objectFit:'cover',borderRadius:10}}/> : <span style={{ fontSize: '24px' }}>{bm.icon}</span>}
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '14px' }}>{bm.title}</div>
                      <span style={{ fontSize: '11px', color: theme.primary, fontWeight: 'bold' }}>{bm.category}</span>
                    </div>
                  </div>
                  <a href={bm.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f1f5f9', color: theme.text, textDecoration: 'none' }}>
                    <ExternalLink size={16} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      {showBookmarkModal && (
        <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:16}}><div style={{backgroundColor:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:18,width:'100%',maxWidth:430,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><h2 style={{fontSize:17,fontWeight:900,margin:0}}>Nuevo enlace</h2><button onClick={()=>setShowBookmarkModal(false)} style={{background:'none',border:0,color:theme.textMuted}}><X size={18}/></button></div>
          <form onSubmit={e=>{e.preventDefault();if(!newBookmarkTitle.trim()||!newBookmarkUrl.trim())return;setBookmarks(prev=>[...prev,{id:Date.now(),title:newBookmarkTitle.trim(),url:newBookmarkUrl.trim(),category:newBookmarkCategory,icon:newBookmarkIcon,imageUrl:newBookmarkImageFile || newBookmarkImage || undefined}]);setNewBookmarkTitle('');setNewBookmarkUrl('');setNewBookmarkImage('');setNewBookmarkImageFile('');setShowBookmarkModal(false);}} style={{display:'flex',flexDirection:'column',gap:9}}>
            <input required placeholder='Nombre' value={newBookmarkTitle} onChange={e=>setNewBookmarkTitle(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/>
            <input required placeholder='https://...' value={newBookmarkUrl} onChange={e=>setNewBookmarkUrl(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><select value={newBookmarkCategory} onChange={e=>setNewBookmarkCategory(e.target.value as any)} style={{padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}>{['Universidad','Estudio','Herramientas','Ocio'].map(c=><option key={c}>{c}</option>)}</select><input value={newBookmarkIcon} onChange={e=>setNewBookmarkIcon(e.target.value)} placeholder='Emoji' style={{padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/></div>
            <input placeholder='Imagen opcional · URL' value={newBookmarkImage} onChange={e=>setNewBookmarkImage(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/><label style={{fontSize:10,color:theme.textMuted,fontWeight:800,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><Image size={13}/> O subir imagen<input type='file' accept='image/*' style={{display:'none'}} onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024){alert('Elige una imagen de máximo 1 MB.');return;}const reader=new FileReader();reader.onload=()=>setNewBookmarkImageFile(String(reader.result||''));reader.readAsDataURL(file);}}/></label>
            <button type='submit' style={{padding:10,border:0,borderRadius:10,background:theme.text,color:darkMode?'#090909':'#fff',fontWeight:900}}>Guardar enlace</button>
          </form>
        </div></div>
      )}

        {/* ================= VISTA: CONFIGURACIÓN ================= */}
        {activeTab === 'ajustes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '540px' }}>
            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>Perfil y Carrera ⚙️</h1>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: theme.textMuted }}>Nombre de Usuario</label>
                <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: theme.textMuted }}>Semestre Actual que Cursas</label>
                <select value={currentSemesterNumber} onChange={e => switchToSemester(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '4px' }}>
                  {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>Semestre {num}</option>
                  ))}
                </select>
                <div style={{ fontSize:'11px', color:theme.textMuted, marginTop:8, lineHeight:1.45 }}>Al cambiar de semestre, LifeOS carga automáticamente los ramos de ese semestre. Si tienes un ramo reprobado, volverá a aparecer sólo en un semestre de la misma paridad: 1→3→5… o 2→4→6…</div>
              </div>
            </div>

            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px' }}>
              <h2 style={{fontSize:15,fontWeight:900,margin:'0 0 6px'}}>Calendario académico</h2>
              <p style={{fontSize:11,color:theme.textMuted,margin:'0 0 12px'}}>Configura manualmente el inicio y término de cada semestre. El Calendario Maestro usa estas fechas para distinguir clases, recesos y vacaciones.</p>
              <div style={{display:'flex',flexDirection:'column',gap:7,maxHeight:380,overflowY:'auto'}}>
                {Array.from({length:11},(_,i)=>i+1).map(num=>{const cfg=semesterDateConfig[num] || {start:'',end:''}; return <div key={num} style={{display:'grid',gridTemplateColumns:'70px 1fr 1fr',gap:7,alignItems:'center',padding:'7px 0',borderTop:`1px solid ${theme.cardBorder}`}}><div style={{fontSize:11,fontWeight:900}}>Sem. {num}</div><input type="date" value={cfg.start} onChange={e=>setSemesterDateConfig({...semesterDateConfig,[num]:{start:e.target.value,end:cfg.end}})} style={{width:'100%',boxSizing:'border-box',padding:8,borderRadius:8,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/><input type="date" value={cfg.end} onChange={e=>setSemesterDateConfig({...semesterDateConfig,[num]:{start:cfg.start,end:e.target.value}})} style={{width:'100%',boxSizing:'border-box',padding:8,borderRadius:8,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/></div>})}
              </div>
            </div>

            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px' }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <div><h2 style={{fontSize:15,fontWeight:900,margin:0}}>Notificaciones</h2><p style={{fontSize:11,color:theme.textMuted,margin:'4px 0 0'}}>Usa los avisos configurados en evaluaciones y tareas.</p></div>
                {notificationsEnabled ? <button onClick={disableNotifications} style={{padding:'8px 11px',borderRadius:9,border:`1px solid ${theme.cardBorder}`,background:'transparent',color:theme.text,fontWeight:800,fontSize:11}}>Desactivar</button> : <button onClick={requestNotificationPermission} style={{padding:'8px 11px',borderRadius:9,border:0,background:theme.text,color:darkMode?'#090909':'#fff',fontWeight:900,fontSize:11}}>Activar notificaciones</button>}
              </div>
              <div style={{fontSize:10,color:theme.textMuted,marginTop:9}}>Nota: las notificaciones del navegador funcionan mientras este LifeOS permanezca abierto en una pestaña.</div>
            </div>

            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px' }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><h2 style={{fontSize:15,fontWeight:900,margin:0}}>Sonidos de la interfaz</h2><p style={{fontSize:11,color:theme.textMuted,margin:'4px 0 0'}}>Pequeños sonidos tipo interfaz móvil al pulsar botones.</p></div><button onClick={()=>setSoundsEnabled(!soundsEnabled)} style={{padding:'8px 11px',borderRadius:9,border:`1px solid ${theme.cardBorder}`,background:soundsEnabled?theme.text:'transparent',color:soundsEnabled?(darkMode?'#090909':'#fff'):theme.text,fontWeight:900,fontSize:11}}>{soundsEnabled?'Activados':'Desactivados'}</button></div>
              <div style={{marginTop:12}}><div style={{fontSize:10,fontWeight:900,color:theme.textMuted,marginBottom:5}}>FONDO DEL DASHBOARD · OPCIONAL</div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}><label style={{padding:'8px 10px',border:`1px solid ${theme.cardBorder}`,borderRadius:9,cursor:'pointer',fontSize:10,fontWeight:800,display:'inline-flex',alignItems:'center',gap:5}}><Image size={13}/> Elegir foto<input type='file' accept='image/*' style={{display:'none'}} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>10*1024*1024){alert('Elige una imagen de máximo 10 MB. LifeOS la comprimirá automáticamente para guardarla.');return;}try{const data=await compressDashboardImage(file);setDashboardBackground(data);}catch(err){alert('No se pudo procesar la imagen. Prueba con JPG, PNG o WEBP.');}}}/></label>{dashboardBackground&&<button onClick={()=>setDashboardBackground('')} style={{padding:'8px 10px',border:`1px solid ${theme.cardBorder}`,borderRadius:9,background:'transparent',color:theme.text,fontSize:10,fontWeight:800}}>Quitar foto</button>}</div></div>
            </div>

            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px' }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                <div>
                  <h2 style={{fontSize:15,fontWeight:900,margin:0}}>☁️ LifeOS Cloud</h2>
                  <p style={{fontSize:11,color:theme.textMuted,margin:'4px 0 0',lineHeight:1.45}}>Sincroniza tus datos entre laptop, teléfono y futuros dispositivos. Los cambios se comprueban automáticamente cada pocos segundos.</p>
                </div>
                <div style={{fontSize:10,fontWeight:900,padding:'5px 8px',borderRadius:999,border:`1px solid ${theme.cardBorder}`,color:cloudStatus==='synced'?'#22c55e':cloudStatus==='error'?'#ef4444':theme.textMuted}}>
                  {!cloudConfigured() ? 'CONFIGURAR' : cloudStatus==='syncing' ? 'SINCRONIZANDO…' : cloudStatus==='synced' ? '● SINCRONIZADO' : cloudStatus==='error' ? 'ERROR' : '● DESCONECTADO'}
                </div>
              </div>
              {!cloudConfigured() ? (
                <div style={{marginTop:12,padding:11,borderRadius:10,background:darkMode?'#0e1017':'#f7f7f8',border:`1px solid ${theme.cardBorder}`,fontSize:10,color:theme.textMuted,lineHeight:1.55}}>
                  Primero crea tu proyecto de Supabase y agrega <strong style={{color:theme.text}}>VITE_SUPABASE_URL</strong> y <strong style={{color:theme.text}}>VITE_SUPABASE_PUBLISHABLE_KEY</strong> a <strong style={{color:theme.text}}>.env.local</strong>. Después reinicia <code>npm run dev</code>.
                </div>
              ) : !cloudSession ? (
                <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
                  <input type='email' placeholder='Tu correo' value={cloudEmail} onChange={e=>setCloudEmail(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/>
                  <input type='password' placeholder='Contraseña · mínimo 6 caracteres' value={cloudPassword} onChange={e=>setCloudPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void handleCloudLogin(false)}} style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/>
                  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                    <button disabled={cloudBusy} onClick={()=>void handleCloudLogin(false)} style={{padding:'9px 12px',border:0,borderRadius:9,background:theme.text,color:darkMode?'#090909':'#fff',fontWeight:900,fontSize:11}}>{cloudBusy?'Entrando…':'Iniciar sesión'}</button>
                    <button disabled={cloudBusy} onClick={()=>void handleCloudLogin(true)} style={{padding:'9px 12px',border:`1px solid ${theme.cardBorder}`,borderRadius:9,background:'transparent',color:theme.text,fontWeight:900,fontSize:11}}>Crear cuenta</button>
                  </div>
                </div>
              ) : (
                <div style={{marginTop:12}}>
                  <div style={{fontSize:11,fontWeight:800,color:theme.text,marginBottom:3}}>{cloudSession.user?.email || cloudEmail}</div>
                  <div style={{fontSize:10,color:theme.textMuted,marginBottom:10}}>{cloudMessage || 'Tus dispositivos comparten la misma copia.'}{cloudLastSync ? ` · ${new Date(cloudLastSync).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}` : ''}</div>
                  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                    <button disabled={cloudBusy} onClick={()=>void runCloudSync('push')} style={{padding:'8px 10px',border:`1px solid ${theme.cardBorder}`,borderRadius:9,background:'transparent',color:theme.text,fontWeight:900,fontSize:10}}>↑ Subir este dispositivo</button>
                    <button disabled={cloudBusy} onClick={()=>void runCloudSync('pull')} style={{padding:'8px 10px',border:`1px solid ${theme.cardBorder}`,borderRadius:9,background:'transparent',color:theme.text,fontWeight:900,fontSize:10}}>↓ Descargar nube</button>
                    <button disabled={cloudBusy} onClick={()=>void handleCloudLogout()} style={{padding:'8px 10px',border:0,borderRadius:9,background:'#ef444422',color:'#ef4444',fontWeight:900,fontSize:10}}>Cerrar sesión</button>
                  </div>
                </div>
              )}
              {cloudMessage && !(!cloudConfigured()) && <div style={{fontSize:10,color:cloudStatus==='error'?'#ef4444':theme.textMuted,marginTop:9,lineHeight:1.45}}>{cloudMessage}</div>}
              <div style={{fontSize:9,color:theme.textMuted,marginTop:10,lineHeight:1.45}}>La primera versión sincroniza el estado completo de LifeOS como una copia privada por usuario. Si editas dos dispositivos al mismo tiempo, gana la última copia guardada; más adelante podemos convertir tareas, hábitos y finanzas a sincronización por registros.</div>
            </div>

            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '20px' }}>
              <button 
                onClick={() => {
                  if (window.confirm('¿Deseas restablecer la memoria local para limpiar datos corruptos de versiones anteriores?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                style={{ width: '100%', padding: '10px', backgroundColor: '#ef444422', border: '1px solid #ef444455', color: '#ef4444', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                Restablecer Memoria / Limpiar Datos
              </button>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: EVALUACIÓN ACADÉMICA (HORARIO DE CLASES VS EXTRACURRICULAR) */}
      {showAcademicTaskModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: '14px' }}>
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Agendar Evaluación</h2>
              <button onClick={() => setShowAcademicTaskModal(false)} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (taskSubject && ['Certamen', 'Control', 'Laboratorio'].includes(taskType) && !taskEvaluationId) {
                return alert('Selecciona cuál evaluación del ramo estás agendando.');
              }
              if (taskTitle.trim() || taskEvaluationId || taskType === 'Examen') {
                let finalStart = taskStartTime;
                let finalEnd = taskEndTime;

                if (!isExtracurricular && selectedTaskSubjectObj && selectedTaskSubjectObj.scheduleBlocks.length > 0) {
                  const block = selectedTaskSubjectObj.scheduleBlocks[selectedBlockIdx] || selectedTaskSubjectObj.scheduleBlocks[0];
                  finalStart = block.startTime;
                  finalEnd = block.endTime;
                }

                const selectedEval = selectedTaskSubjectObj?.evaluations.find(e => String(e.id) === String(taskEvaluationId));
                const autoTitle = selectedEval ? selectedEval.name : (taskType === 'Examen' ? 'Examen Final' : taskTitle.trim());

                setAcademicTasks([...academicTasks, {
                  id: Date.now(),
                  title: autoTitle,
                  subject: taskSubject || (subjects[0]?.name || 'General'),
                  type: taskType,
                  dueDate: taskDate || 'Pronto',
                  startTime: finalStart,
                  endTime: finalEnd,
                  isExtracurricular,
                  weight: selectedEval ? selectedEval.weight : (parseInt(taskWeight, 10) || 20),
                  notes: taskNotes,
                  completed: false,
                  addToCalendar: taskSyncCalendar,
                  evaluationId: selectedEval?.id,
                  reminder: taskReminder
                }]);
                setTaskTitle('');
                setTaskEvaluationId('');
                setTaskNotes('');
                setTaskReminder('none');
                setShowAcademicTaskModal(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(!['Certamen', 'Control', 'Laboratorio'].includes(taskType)) && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Título *</label>
                  <input type="text" placeholder={taskType === 'Examen' ? 'Examen Final' : 'Ej. Informe práctico'} required={taskType !== 'Examen'} value={taskTitle} onChange={e => setTaskTitle(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '4px' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Asignatura</label>
                  <select value={taskSubject || (subjects[0]?.name || '')} onChange={e => {
                    setTaskSubject(e.target.value);
                    setSelectedBlockIdx(0);
                  }} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '4px' }}>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Tipo de Evaluación</label>
                  <select value={taskType} onChange={e => setTaskType(e.target.value as any)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '4px' }}>
                    <option value="Certamen">Certamen (Reemplaza clase)</option>
                    <option value="Examen">Examen Final (Reemplaza clase)</option>
                    <option value="Control">Control / Test</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Proyecto">Proyecto</option>
                    <option value="Tarea">Tarea</option>
                  </select>
                </div>
              </div>

              {['Certamen', 'Control', 'Laboratorio'].includes(taskType) && (
                <div>
                  <label style={{ fontSize:'11px', fontWeight:'bold', color:theme.textMuted }}>
                    {taskType === 'Certamen' ? '¿Qué certamen es?' : taskType === 'Control' ? '¿Qué control es?' : '¿Qué laboratorio / trabajo es?'}
                  </label>
                  <select value={taskEvaluationId} onChange={e => setTaskEvaluationId(e.target.value)} required style={{width:'100%',padding:'10px',borderRadius:'10px',backgroundColor:darkMode ? '#0e1017' : '#f9fafb',border:`1px solid ${theme.cardBorder}`,color:theme.text,marginTop:'4px'}}>
                    <option value="">Seleccionar evaluación...</option>
                    {(selectedTaskSubjectObj?.evaluations || [])
                      .filter(ev => taskType === 'Certamen' ? ev.type === 'certamen' : taskType === 'Control' ? ev.type === 'control' : ev.type === 'trabajo')
                      .map(ev => <option key={ev.id} value={ev.id}>{ev.name} • {ev.weight}%</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Fecha *</label>
                  <input type="date" required value={taskDate} onChange={e => setTaskDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Ponderación (%)</label>
                  <input type="text" inputMode="numeric" placeholder="Ej. 35" value={taskWeight} onChange={e => setTaskWeight(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f9fafb', border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '4px' }} />
                </div>
              </div>

              {/* Selector de Horario de Clase vs Extracurricular */}
              <div style={{ backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', padding: '12px', borderRadius: '12px', border: `1px solid ${theme.cardBorder}` }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={isExtracurricular} onChange={e => setIsExtracurricular(e.target.checked)} style={{ accentColor: theme.primary, width: '16px', height: '16px' }} />
                  Horario extracurricular / Fuera de clase
                </label>

                {!isExtracurricular ? (
                  <div>
                    <label style={{ fontSize: '11px', color: theme.textMuted, display: 'block', marginBottom: '4px' }}>
                      Rendir dentro del bloque habitual de clases:
                    </label>
                    {selectedTaskSubjectObj && selectedTaskSubjectObj.scheduleBlocks.length > 0 ? (
                      <select 
                        value={selectedBlockIdx} 
                        onChange={e => setSelectedBlockIdx(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '12px' }}>
                        {selectedTaskSubjectObj.scheduleBlocks.map((blk, idx) => (
                          <option key={blk.id} value={idx}>
                            {blk.day} de {blk.startTime} a {blk.endTime} ({blk.room})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ fontSize: '11px', color: theme.primary }}>
                        Sin bloques configurados en este ramo. Marca "Horario extracurricular" para poner hora manual.
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: theme.textMuted }}>Hora Inicio</label>
                      <input type="time" value={taskStartTime} onChange={e => setTaskStartTime(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '2px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: theme.textMuted }}>Hora Fin</label>
                      <input type="time" value={taskEndTime} onChange={e => setTaskEndTime(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '2px' }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{padding:'10px 12px',border:`1px solid ${theme.cardBorder}`,borderRadius:10,background:darkMode?'#0f0f11':'#fafafa'}}>
                <label style={{fontSize:11,fontWeight:800,color:theme.textMuted}}>NOTIFICACIÓN</label>
                <select value={taskReminder} onChange={e=>setTaskReminder(e.target.value as any)} style={{display:'block',width:'100%',marginTop:5,padding:9,borderRadius:9,border:`1px solid ${theme.cardBorder}`,background:theme.card,color:theme.text}}>
                  {Object.entries(reminderLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
                </select>
                {!notificationsEnabled && <div style={{fontSize:10,color:theme.textMuted,marginTop:6}}>Activa las notificaciones en Configuración para recibir estos avisos.</div>}
              </div>

              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={taskSyncCalendar} onChange={e => setTaskSyncCalendar(e.target.checked)} style={{ accentColor: theme.primary, width: '16px', height: '16px' }} />
                Sincronizar en el Calendario Maestro
              </label>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAcademicTaskModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${theme.cardBorder}`, backgroundColor: 'transparent', color: theme.text, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', fontWeight: '700', cursor: 'pointer' }}>Agendar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TO-DO */}
      {showTodoModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', width: '100%', maxWidth: '420px', padding: '24px' }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h2 style={{fontSize:18,fontWeight:900,margin:0}}>Nuevo Pendiente To-Do</h2><button type='button' onClick={()=>setShowTodoModal(false)} style={{background:'none',border:0,color:theme.textMuted,cursor:'pointer'}}><X size={18}/></button></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newTodoTitle.trim()) {
                setPersonalTodos([...personalTodos, {
                  id: Date.now(),
                  title: newTodoTitle.trim(),
                  category: newTodoCategory,
                  dueDate: newTodoDate,
                  priority: newTodoPriority,
                  completed: false,
                  addToCalendar: todoSyncCalendar,
                  dueTime: newTodoTime,
                  reminder: todoReminder
                }]);
                setNewTodoTitle('');
                setNewTodoDate('');
                setNewTodoTime('09:00');
                setTodoReminder('none');
                setShowTodoModal(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Tarea a realizar..." required value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <select value={newTodoCategory} onChange={e=>setNewTodoCategory(e.target.value as any)} style={{width:'100%',padding:10,borderRadius:10,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}>{(['Personal','Universidad','Compras','Salud','Trámites','Otro'] as const).map(c=><option key={c} value={c}>{c}</option>)}</select>
                <select value={newTodoPriority} onChange={e=>setNewTodoPriority(e.target.value as any)} style={{width:'100%',padding:10,borderRadius:10,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}>{(['Alta','Media','Baja'] as const).map(p=><option key={p} value={p}>{p} prioridad</option>)}</select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1.2fr .8fr',gap:8}}>
                <div><label style={{fontSize:10,color:theme.textMuted}}>Fecha</label><input type="date" value={newTodoDate} onChange={e=>setNewTodoDate(e.target.value)} style={{display:'block',width:'100%',padding:10,borderRadius:10,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/></div>
                <div><label style={{fontSize:10,color:theme.textMuted}}>Hora</label><input type="time" value={newTodoTime} onChange={e=>setNewTodoTime(e.target.value)} style={{display:'block',width:'100%',padding:10,borderRadius:10,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/></div>
              </div>
              <label style={{fontSize:11,fontWeight:800,display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={todoSyncCalendar} onChange={e=>setTodoSyncCalendar(e.target.checked)} /> Añadir al Calendario Maestro</label>
              <div style={{padding:'10px 12px',border:`1px solid ${theme.cardBorder}`,borderRadius:10,background:darkMode?'#0f0f11':'#fafafa'}}>
                <label style={{fontSize:11,fontWeight:800,color:theme.textMuted}}>NOTIFICACIÓN</label>
                <select value={todoReminder} onChange={e=>setTodoReminder(e.target.value as any)} style={{display:'block',width:'100%',marginTop:5,padding:9,borderRadius:9,border:`1px solid ${theme.cardBorder}`,background:theme.card,color:theme.text}}>{Object.entries(reminderLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
                {!notificationsEnabled && <div style={{fontSize:10,color:theme.textMuted,marginTop:6}}>Puedes activar las notificaciones desde Configuración.</div>}
              </div>
              <button type="submit" style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', fontWeight: '800', cursor: 'pointer' }}>Guardar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HÁBITO */}
      {showHabitModal && (
        <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:16 }}>
          <div style={{ backgroundColor:theme.card, border:`1px solid ${theme.cardBorder}`, borderRadius:20, width:'100%', maxWidth:500, maxHeight:'92vh', overflowY:'auto', padding:20 }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div><h2 style={{fontSize:17,fontWeight:900,margin:0}}>Nuevo Hábito</h2><div style={{fontSize:10,color:theme.textMuted,marginTop:3}}>Configúralo para que LifeOS sepa cómo medirlo.</div></div><button type='button' onClick={()=>setShowHabitModal(false)} style={{background:'none',border:0,color:theme.textMuted,cursor:'pointer'}}><X size={19}/></button></div>
            <form onSubmit={(e)=>{e.preventDefault();if(!newHabitName.trim())return;setHabits(prev=>[...prev,{id:Date.now(),name:newHabitName.trim(),category:newHabitCat,icon:newHabitIcon,streak:0,completed:false,frequency:newHabitFrequency,weeklyTarget:newHabitFrequency==='weekly'?Math.min(7,Math.max(1,Number(newHabitWeeklyTarget)||1)):7,isBad:newHabitIsBad,hasEndDate:newHabitHasEndDate,endDate:newHabitHasEndDate?newHabitEndDate:''}]);setNewHabitName('');setNewHabitIcon('🏋️');setNewHabitCat('Salud');setNewHabitFrequency('daily');setNewHabitWeeklyTarget('3');setNewHabitIsBad(false);setNewHabitHasEndDate(false);setNewHabitEndDate('');setShowHabitModal(false);setHabitSubTab('dia');}} style={{display:'flex',flexDirection:'column',gap:11}}>
              <input type='text' placeholder='Ej. Entrenar 45 min' required value={newHabitName} onChange={e=>setNewHabitName(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><input type='text' placeholder='Categoría' value={newHabitCat} onChange={e=>setNewHabitCat(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/><div><div style={{fontSize:10,color:theme.textMuted,fontWeight:900,marginBottom:5}}>FRECUENCIA</div><select value={newHabitFrequency} onChange={e=>setNewHabitFrequency(e.target.value as any)} style={{width:'100%',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}><option value='daily'>Todos los días</option><option value='weekly'>Semanal</option></select></div></div>
              {newHabitFrequency==='weekly' && <div><label style={{fontSize:10,color:theme.textMuted,fontWeight:900}}>OBJETIVO SEMANAL</label><input type='number' min='1' max='7' value={newHabitWeeklyTarget} onChange={e=>setNewHabitWeeklyTarget(e.target.value)} style={{display:'block',width:100,marginTop:4,padding:9,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/><div style={{fontSize:9,color:theme.textMuted,marginTop:3}}>Cuántas veces quieres cumplirlo por semana.</div></div>}
              <div><div style={{fontSize:10,color:theme.textMuted,fontWeight:900,marginBottom:5}}>EMOJI</div><div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:5}}>{HABIT_ICONS.concat(['🧠','🚰','🛌','🍎','🚭','📵','🧹','💊','🧴','🎮','💰','☀️','🌿','🧼','🚶','🏠']).map(em=><button type='button' key={em} onClick={()=>setNewHabitIcon(em)} style={{padding:6,borderRadius:8,border:`1px solid ${newHabitIcon===em?theme.text:theme.cardBorder}`,background:newHabitIcon===em?theme.text:'transparent',color:newHabitIcon===em?(darkMode?'#090909':'#fff'):theme.text,fontSize:16,cursor:'pointer'}}>{em}</button>)}</div></div>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,fontWeight:800}}><input type='checkbox' checked={newHabitIsBad} onChange={e=>setNewHabitIsBad(e.target.checked)} /> Es un hábito que quiero dejar / evitar</label>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,fontWeight:800}}><input type='checkbox' checked={newHabitHasEndDate} onChange={e=>setNewHabitHasEndDate(e.target.checked)} /> Tiene fecha de fin</label>
              {newHabitHasEndDate && <input type='date' value={newHabitEndDate} onChange={e=>setNewHabitEndDate(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/>}
              <button type='submit' style={{padding:11,border:0,borderRadius:10,background:theme.text,color:darkMode?'#090909':'#fff',fontWeight:900}}>Crear Hábito</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR RAMO */}
      {showSubjectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: isMobile ? '10px' : '20px' }}>
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', padding: isMobile ? '18px' : '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>{editingSubjectId !== null ? 'Editar Ramo' : 'Configurar Ramo'}</h2>
              <button onClick={() => setShowSubjectModal(false)} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateAdvancedSubject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Nombre del Ramo *</label>
                <input type="text" placeholder="Ej. Biomecánica" required value={subName} onChange={e => setSubName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '13px', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Semestre en la Malla</label>
                  <select value={subSemester} onChange={e => setSubSemester(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '13px', marginTop: '4px' }}>
                    {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>Semestre {num}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Créditos SCT</label>
                  <input type="text" inputMode="numeric" placeholder="Ej. 6" value={subCredits} onChange={e => setSubCredits(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '13px', marginTop: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Docente</label>
                  <input type="text" placeholder="Ej. Dr. Soto" value={subTeacher} onChange={e => setSubTeacher(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '13px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Sala / Aula</label>
                  <input type="text" placeholder="Ej. Aula Magna" value={subRoom} onChange={e => setSubRoom(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '13px', marginTop: '4px' }} />
                </div>
              </div>

              {/* Horario Semanal */}
              <div style={{ backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', padding: '12px', borderRadius: '12px', border: `1px solid ${theme.cardBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Horarios de Clase</span>
                  <button type="button" onClick={() => setSubBlocks([...subBlocks, { day: 'Miércoles', startTime: '10:15', endTime: '11:45' }])} style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + Añadir bloque
                  </button>
                </div>

                {subBlocks.map((blk, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <select value={blk.day} onChange={e => {
                      const updated = [...subBlocks];
                      updated[idx].day = e.target.value as any;
                      setSubBlocks(updated);
                    }} style={{ padding: '6px', borderRadius: '6px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '11px' }}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="time" value={blk.startTime} onChange={e => {
                      const updated = [...subBlocks];
                      updated[idx].startTime = e.target.value;
                      setSubBlocks(updated);
                    }} style={{ padding: '6px', borderRadius: '6px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '11px' }} />
                    <input type="time" value={blk.endTime} onChange={e => {
                      const updated = [...subBlocks];
                      updated[idx].endTime = e.target.value;
                      setSubBlocks(updated);
                    }} style={{ padding: '6px', borderRadius: '6px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '11px' }} />
                    {subBlocks.length > 1 && (
                      <button type="button" onClick={() => setSubBlocks(subBlocks.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Ponderaciones */}
              <div style={{ backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', padding: '12px', borderRadius: '12px', border: `1px solid ${theme.cardBorder}` }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Estructura de Evaluaciones</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: theme.textMuted }}>Certámenes (Cant / %)</label>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      <input type="text" inputMode="numeric" placeholder="2" value={numCertamenes} onChange={e => setNumCertamenes(e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
                      <input type="text" inputMode="numeric" placeholder="35" value={weightCertamenes} onChange={e => setWeightCertamenes(e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: theme.textMuted }}>Controles (Cant / %)</label>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      <input type="text" inputMode="numeric" placeholder="0" value={numControles} onChange={e => setNumControles(e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
                      <input type="text" inputMode="numeric" placeholder="0" value={weightControles} onChange={e => setWeightControles(e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: theme.textMuted }}>Trabajos (Cant / %)</label>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      <input type="text" inputMode="numeric" placeholder="1" value={numTrabajos} onChange={e => setNumTrabajos(e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
                      <input type="text" inputMode="numeric" placeholder="30" value={weightTrabajos} onChange={e => setWeightTrabajos(e.target.value)} style={{ width: '50%', padding: '8px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reglas de Examen */}
              <div style={{ backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', padding: '14px', borderRadius: '12px', border: `1px solid ${theme.cardBorder}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={16} color={theme.primary} /> Modalidad de Examen
                </div>

                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={hasExemption} onChange={e => setHasExemption(e.target.checked)} style={{ accentColor: theme.primary, width: '16px', height: '16px' }} />
                  ¿Tiene opción de eximición?
                </label>

                {hasExemption ? (
                  <div style={{ paddingLeft: '24px' }}>
                    <label style={{ fontSize: '11px', color: theme.textMuted, display: 'block' }}>Nota mínima de presentación para eximirse</label>
                    <input type="text" inputMode="decimal" placeholder="5.0" value={exemptionGrade} onChange={e => setExemptionGrade(e.target.value)} style={{ width: '100px', padding: '6px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '2px' }} />
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: theme.primary, paddingLeft: '24px', fontWeight: 'bold' }}>
                    • Sin eximición: Examen 100% obligatorio para todos los alumnos.
                  </div>
                )}

                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: theme.primary }}>
                  <input type="checkbox" checked={isExamFailingRule} onChange={e => setIsExamFailingRule(e.target.checked)} style={{ accentColor: theme.primary, width: '16px', height: '16px' }} />
                  ¿El examen es reprobatorio? (Rojo &lt; 4.0 en examen reprueba el ramo)
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: theme.textMuted }}>Mín. 1 Oportunidad</label>
                    <input type="text" inputMode="decimal" placeholder="3.5" value={minGradeForOneOpportunity} onChange={e => setMinGradeForOneOpportunity(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '2px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: theme.textMuted }}>Mín. 2 Oportunidades</label>
                    <input type="text" inputMode="decimal" placeholder="3.9" value={minGradeForTwoOpportunities} onChange={e => setMinGradeForTwoOpportunities(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '2px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: theme.textMuted }}>Ponderación Examen (%)</label>
                    <input type="text" inputMode="numeric" placeholder="30" value={examWeight} onChange={e => setExamWeight(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '8px', backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, color: theme.text, marginTop: '2px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowSubjectModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${theme.cardBorder}`, backgroundColor: 'transparent', color: theme.text, fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', fontWeight: '700', cursor: 'pointer' }}>{editingSubjectId !== null ? 'Guardar Cambios' : 'Guardar Ramo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECESO O PARO */}
      {showBreakModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '22px' }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h2 style={{fontSize:17,fontWeight:900,margin:0}}>Añadir Receso o Paro</h2><button type='button' onClick={()=>setShowBreakModal(false)} style={{background:'none',border:0,color:theme.textMuted}}><X size={18}/></button></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!breakTitle.trim() || !breakStart || !breakEnd) return;
              setAcademicBreaks([...academicBreaks, { id: Date.now(), title: breakTitle.trim(), type: breakType, startDate: breakStart, endDate: breakEnd }]);
              setBreakTitle('');
              setShowBreakModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select value={breakType} onChange={e => setBreakType(e.target.value as any)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }}>
                <option value="receso">🌴 Semana de Receso / Vacaciones</option>
                <option value="paro">🚩 Paro / Toma Estudiantil</option>
              </select>
              <input type="text" placeholder="Título / Motivo" required value={breakTitle} onChange={e => setBreakTitle(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="date" required value={breakStart} onChange={e => setBreakStart(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
                <input type="date" required value={breakEnd} onChange={e => setBreakEnd(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
              </div>
              <button type="submit" style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: breakType === 'paro' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Guardar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA CUENTA */}
      {showNewAccountModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '22px' }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h2 style={{fontSize:17,fontWeight:900,margin:0}}>Nueva Cuenta</h2><button type='button' onClick={()=>setShowNewAccountModal(false)} style={{background:'none',border:0,color:theme.textMuted}}><X size={18}/></button></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newAccName.trim()) return;
              const initialBal = parseInt(newAccBalance.replace(/\D/g, ''), 10) || 0;
              setAccountsList([...accountsList, { id: 'acc_' + Date.now(), name: newAccName.trim(), type: newAccType, balance: initialBal, color: newAccColor }]);
              setNewAccName('');
              setNewAccBalance('');
              setShowNewAccountModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Nombre (ej. Santander)" required value={newAccName} onChange={e => setNewAccName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
              <input type="text" inputMode="numeric" placeholder="Saldo Inicial" value={newAccBalance} onChange={e => setNewAccBalance(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
              <select value={newAccType} onChange={e => setNewAccType(e.target.value as any)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }}>
                <option value="debito">Cuenta débito</option>
                <option value="credito">Tarjeta de crédito</option>
                <option value="ahorro">Cuenta de ahorro</option>
                <option value="efectivo">Efectivo</option>
                <option value="inversion">Inversión</option>
              </select>
              <button type="submit" style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', fontWeight: '700', cursor: 'pointer' }}>Guardar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMIENTO FINANCIERO */}
      {showTransactionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '22px' }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h2 style={{fontSize:17,fontWeight:900,margin:0}}>{transType === 'ingreso' ? 'Abono (+)' : 'Cargo (-)'}</h2><button type='button' onClick={()=>setShowTransactionModal(false)} style={{background:'none',border:0,color:theme.textMuted}}><X size={18}/></button></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!selectedAccountId) return;
              const parsedAmount = parseInt(transAmount.replace(/\D/g, ''), 10);
              if (isNaN(parsedAmount) || parsedAmount <= 0) return alert('Ingresa un monto válido.');
              const target = accountsList.find(a => a.id === selectedAccountId);
              if (!target) return;

              const newBalance = transType === 'ingreso' ? target.balance + parsedAmount : target.balance - parsedAmount;
              setAccountsList(accountsList.map(a => a.id === selectedAccountId ? { ...a, balance: newBalance } : a));
              setTransactions([{
                id: Date.now(),
                accountId: selectedAccountId,
                type: transType,
                amount: parsedAmount,
                description: transDesc.trim() || (transType === 'ingreso' ? 'Abono a cuenta' : 'Cargo'),
                category: transCategory,
                date: transDate || new Date().toISOString().split('T')[0],
                balanceAfter: newBalance
              }, ...transactions]);

              setTransAmount('');
              setTransDesc('');
              setShowTransactionModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" inputMode="numeric" placeholder="Monto en CLP *" required value={transAmount} onChange={e => setTransAmount(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text, fontSize: '15px', fontWeight: 'bold' }} />
              <input type="text" placeholder="Concepto *" required value={transDesc} onChange={e => setTransDesc(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
              <button type="submit" style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: transType === 'ingreso' ? '#10b981' : theme.primary, color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Confirmar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LISTA DE COMPRAS */}
      {showShoppingModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.76)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:16 }}>
          <div style={{backgroundColor:theme.card,border:`1px solid ${theme.cardBorder}`,borderRadius:18,width:'100%',maxWidth:400,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><h2 style={{fontSize:17,fontWeight:900,margin:0}}>Añadir a compras</h2><button onClick={()=>setShowShoppingModal(false)} style={{background:'none',border:0,color:theme.textMuted}}><X size={18}/></button></div>
            <form onSubmit={e=>{e.preventDefault();if(!newShoppingTitle.trim())return;setShoppingItems([...shoppingItems,{id:Date.now(),title:newShoppingTitle.trim(),category:newShoppingCategory,emoji:newShoppingEmoji,completed:false}]);setNewShoppingTitle('');setShowShoppingModal(false);}}>
              <input required autoFocus value={newShoppingTitle} onChange={e=>setNewShoppingTitle(e.target.value)} placeholder="Ej. Zapatillas negras" style={{width:'100%',boxSizing:'border-box',padding:11,borderRadius:10,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text}}/>
              <div style={{marginTop:10,fontSize:10,fontWeight:900,color:theme.textMuted}}>EMOJI</div><div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:5,marginTop:5}}>{['🛍️','👟','👕','📱','💻','🧴','🏋️','🎮','🎧','🏠','💊','✈️','📚','🪴','🍜','🚗'].map(em=><button type='button' key={em} onClick={()=>setNewShoppingEmoji(em)} style={{padding:6,borderRadius:8,border:`1px solid ${newShoppingEmoji===em?theme.text:theme.cardBorder}`,background:newShoppingEmoji===em?theme.text:'transparent',color:newShoppingEmoji===em?(darkMode?'#090909':'#fff'):theme.text,fontSize:16}}>{em}</button>)}</div><select value={newShoppingCategory} onChange={e=>setNewShoppingCategory(e.target.value as any)} style={{width:'100%',boxSizing:'border-box',padding:11,borderRadius:10,background:theme.card,border:`1px solid ${theme.cardBorder}`,color:theme.text,marginTop:10}}>{(['Ropa','Tecnología','Casa','Salud','Ocio','Otros'] as const).map(c=><option key={c} value={c}>{c}</option>)}</select>
              <button type="submit" style={{width:'100%',marginTop:10,padding:11,border:0,borderRadius:10,background:theme.text,color:darkMode?'#090909':'#fff',fontWeight:900}}>Agregar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: META DE AHORRO */}
      {showGoalModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', width: '100%', maxWidth: '420px', padding: '22px' }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><h2 style={{fontSize:17,fontWeight:900,margin:0}}>Nuevo Objetivo de Compra</h2><button type='button' onClick={()=>setShowGoalModal(false)} style={{background:'none',border:0,color:theme.textMuted}}><X size={18}/></button></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!goalTitle.trim()) return;
              const target = parseInt(goalTarget.replace(/\D/g, ''), 10);
              if (isNaN(target) || target <= 0) return alert('Monto inválido.');
              setSavingGoals([...savingGoals, { id: Date.now(), title: goalTitle.trim(), emoji: goalEmoji, targetAmount: target, currentAmount: 0, hasDeadline: goalHasDeadline, deadline: goalHasDeadline ? goalDeadline : undefined }]);
              setGoalTitle('');
              setGoalTarget('');
              setShowGoalModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Nombre (ej. Mochila)" required value={goalTitle} onChange={e => setGoalTitle(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
              <input type="text" inputMode="numeric" placeholder="Monto Meta en CLP" required value={goalTarget} onChange={e => setGoalTarget(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#0e1017' : '#f8f9fa', border: `1px solid ${theme.cardBorder}`, color: theme.text }} />
              <button type="submit" style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: theme.primary, color: darkMode ? '#090909' : '#fff', fontWeight: '700', cursor: 'pointer' }}>Crear Meta</button>
            </form>
          </div>
        </div>
      )}

    </div>

  </>
  );
}
