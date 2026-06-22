// ============================================================
// Types TypeScript globaux — Résumé Teacher Khati
// ============================================================

// ─── ENTITÉS DE BASE ─────────────────────────────────────────

export interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  name: string
  slug: string
  address: string | null
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LevelSlug = 'preschoolers' | 'kids' | 'juniors' | 'tweens' | 'teenagers'

export interface Level {
  id: string
  name: string
  slug: LevelSlug
  age_min: number
  age_max: number
  description: string | null
  color: string
  emoji: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  site_id: string
  level_id: string
  academic_year_id: string
  name: string
  day_of_week: number | null  // 0=Lundi, 6=Dimanche
  time_slot: string | null
  max_students: number
  sort_order: number
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  site?: Site
  level?: Level
  academic_year?: AcademicYear
}

export type SessionStatus = 'draft' | 'in_progress' | 'completed'

export interface Session {
  id: string
  group_id: string
  session_date: string
  title: string | null
  theme: string | null
  status: SessionStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  group?: Group
}

// ─── CONTENU SOURCE ──────────────────────────────────────────

export type ContentType = 'padlet' | 'youtube' | 'pdf' | 'image' | 'audio' | 'text' | 'url'
export type ContentStatus = 'pending' | 'processing' | 'ready' | 'error'

export interface PadletMetadata {
  title?: string
  card_count?: number
  has_images?: boolean
  has_videos?: boolean
  cards?: PadletCard[]
}

export interface PadletCard {
  id: string
  title?: string
  body?: string
  image_url?: string
  youtube_url?: string
  position: number
  author?: string
}

export interface YouTubeMetadata {
  title?: string
  duration?: number
  thumbnail?: string
  transcript?: string
}

export interface AIAnalysis {
  theme?: string
  vocabulary?: Array<{ en: string; fr: string; emoji?: string }>
  activities?: Array<{ name: string; skill: string; duration?: number }>
  skills_covered?: string[]
  session_highlight?: string
  difficulty?: string
}

export interface Content {
  id: string
  session_id: string
  type: ContentType
  url: string | null
  raw_text: string | null
  file_path: string | null
  metadata: PadletMetadata | YouTubeMetadata | Record<string, unknown>
  ai_analysis: AIAnalysis
  status: ContentStatus
  error_msg: string | null
  created_at: string
  updated_at: string
}

// ─── RÉSUMÉS ─────────────────────────────────────────────────

export type ResumeStatus = 'draft' | 'reviewed' | 'approved' | 'sent'

export type SectionType = 'intro' | 'vocabulary' | 'activities' | 'grammar' | 'phonics' | 'free'

export interface ResumeSection {
  id: string
  resume_id: string
  type: SectionType
  title: string | null
  content_json: Record<string, unknown> | null  // TipTap JSON
  content_text: string | null
  sort_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface Resume {
  id: string
  session_id: string
  version: number
  title: string
  intro: string | null
  body_json: Record<string, unknown> | null  // TipTap JSON
  body_html: string | null
  body_text: string | null
  ai_model: string | null
  ai_prompt: string | null
  status: ResumeStatus
  is_current: boolean
  created_at: string
  updated_at: string
  // Relations
  sections?: ResumeSection[]
  session?: Session
}

// ─── ACTIVITÉS ───────────────────────────────────────────────

export type Skill = 'speaking' | 'listening' | 'reading' | 'writing' | 'phonics' | 'vocabulary' | 'grammar'

export interface Activity {
  id: string
  name: string
  description: string | null
  level_ids: string[]
  skills: Skill[]
  tags: string[]
  duration_min: number | null
  emoji: string | null
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
  // Relations
  levels?: Level[]
}

export interface ResumeActivity {
  id: string
  resume_id: string
  activity_id: string
  sort_order: number
  custom_note: string | null
  created_at: string
  // Relations
  activity?: Activity
}

// ─── WHATSAPP ────────────────────────────────────────────────

export type WhatsAppSendStatus = 'pending' | 'sending' | 'sent' | 'partial_error' | 'failed'

export interface WhatsAppSend {
  id: string
  resume_id: string
  group_id: string
  message_body: string
  recipient_count: number
  wa_message_ids: string[]
  status: WhatsAppSendStatus
  sent_at: string | null
  error_log: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── UTILISATEURS ────────────────────────────────────────────

export type UserRole = 'admin' | 'teacher'

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  defaultSiteId?: string
  language?: 'fr' | 'en'
}

export interface User {
  id: string
  full_name: string | null
  role: UserRole
  site_ids: string[]
  avatar_url: string | null
  preferences: UserPreferences
  created_at: string
  updated_at: string
  // Relations
  sites?: Site[]
}

// ─── STATISTIQUES ────────────────────────────────────────────

export interface SiteStats {
  site: Site
  groups_count: number
  active_groups_count: number
  sessions_this_week: number
  resumes_pending: number
  resumes_sent_total: number
}

export interface GroupStats {
  group: Group
  sessions_count: number
  last_session_date: string | null
  resumes_sent: number
}

// ─── UI HELPERS ──────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
  emoji?: string
  color?: string
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  status: LoadingState
  error: string | null
}

// ─── API RESPONSES ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
  success: boolean
}

export interface GenerateResumeRequest {
  session_id: string
  level_slug: LevelSlug
  content_ids: string[]
  custom_instructions?: string
}

export interface GenerateResumeResponse {
  resume: Resume
  sections: ResumeSection[]
}

export interface N8NWebhookPayload {
  workflow_id: string
  session_id?: string
  content_id?: string
  data: Record<string, unknown>
}

// ─── LEÇON STRUCTURÉE (Wizard Step 2) ────────────────────────

export type LessonContentType = 'activity' | 'song' | 'video' | 'game' | 'roleplay'

export interface LessonItem {
  id: string
  type: LessonContentType
  name: string
  link?: string          // Lien YouTube ou autre
  selected: boolean
  levels?: LevelSlug[]   // Pour les cartes Padlet multi-niveaux
}

export interface StructuredLesson {
  theme: string
  items: LessonItem[]
}

// ─── GESTION SCOLAIRE ─────────────────────────────────────────

export type StudentStatus    = 'trial' | 'active' | 'suspended' | 'departed'
export type EnrollmentStatus = 'trial' | 'active' | 'completed' | 'cancelled'
export type InvoiceStatus    = 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod    = 'cash' | 'card' | 'transfer' | 'check' | 'other'
export type BillingType      = 'per_session' | 'monthly_per_child' | 'monthly_family'
export type DayOfWeek        = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const DAY_LABELS: Record<number, string> = {
  0: 'Lundi', 1: 'Mardi', 2: 'Mercredi', 3: 'Jeudi',
  4: 'Vendredi', 5: 'Samedi', 6: 'Dimanche',
}

export interface Family {
  id: string
  user_id: string
  parent1_first: string
  parent1_last: string
  parent1_phone: string | null
  parent1_email: string | null
  parent1_whatsapp: string | null
  parent2_first: string | null
  parent2_last: string | null
  parent2_phone: string | null
  parent2_email: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  primary_site_id: string | null
  custom_monthly_rate: number | null
  custom_rate_note: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  site?: Site
  students?: Student[]
}

export interface Student {
  id: string
  user_id: string
  family_id: string | null
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: 'M' | 'F' | 'autre'
  photo_url: string | null
  photo_consent: boolean
  site_id: string | null
  level_id: string | null
  status: StudentStatus
  enrollment_date: string
  departure_date: string | null
  departure_reason: string | null
  medical_notes: string | null
  emergency_name: string | null
  emergency_phone: string | null
  emergency_relation: string | null
  notes: string | null
  created_at: string
  updated_at: string
  site?: Site
  level?: Level
  family?: Family
  enrollments?: Enrollment[]
}

export interface Enrollment {
  id: string
  user_id: string
  student_id: string
  group_id: string
  academic_year_id: string | null
  start_date: string
  end_date: string | null
  status: EnrollmentStatus
  notes: string | null
  created_at: string
  updated_at: string
  student?: Student
  group?: Group
}

export interface Schedule {
  id: string
  user_id: string
  group_id: string
  site_id: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  room: string | null
  max_students: number
  is_active: boolean
  notes: string | null
  valid_from: string | null
  valid_until: string | null
  created_at: string
  updated_at: string
  group?: Group
  site?: Site
}

export interface PricingRule {
  id: string
  user_id: string
  site_id: string
  name: string
  billing_type: BillingType
  price_per_session: number | null
  price_1_child: number | null
  price_2_children: number | null
  price_3_children: number | null
  price_4_children: number | null
  price_5plus: number | null
  effective_from: string
  effective_until: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  site?: Site
}

export interface InvoiceLineItem {
  student_id: string
  student_name: string
  description: string
  amount: number
}

export interface Invoice {
  id: string
  user_id: string
  family_id: string
  site_id: string | null
  period_month: number
  period_year: number
  invoice_number: string | null
  amount_due: number
  amount_paid: number
  discount: number
  status: InvoiceStatus
  due_date: string | null
  line_items: InvoiceLineItem[]
  notes: string | null
  reminder_sent_at: string | null
  created_at: string
  updated_at: string
  family?: Family
  site?: Site
  payments?: Payment[]
}

export interface Payment {
  id: string
  user_id: string
  invoice_id: string | null
  family_id: string
  amount: number
  currency: string
  method: PaymentMethod
  payment_date: string
  reference: string | null
  notes: string | null
  created_at: string
  family?: Family
  invoice?: Invoice
}

export interface StudentStats {
  total: number
  active: number
  trial: number
  departed: number
  suspended: number
  bySite: Array<{ site: Site; active: number; departed: number }>
  byLevel: Array<{ level: Level; count: number }>
  byDay: Array<{ day: number; label: string; count: number }>
  monthlyEvolution: Array<{ month: string; enrolled: number; departed: number; total: number }>
}
