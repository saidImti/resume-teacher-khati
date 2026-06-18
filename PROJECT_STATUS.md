# Teacher Khati - Project Handoff

## Repository and production

- GitHub: https://github.com/saidImti/resume-teacher-khati
- Production: https://resume-teacher-khati.vercel.app
- Branch: `main`
- Latest deployed commit: `6527e62`
- Stack: Next.js 14 App Router, React, TypeScript, Tailwind CSS, Supabase, Vercel.

## Architecture

- `src/app/(app)`: authenticated pages.
- `src/app/api`: API routes for Padlet, resumes, WhatsApp, students, groups, sites, pricing and registration.
- `src/components/dashboard`: main school dashboard.
- `src/components/eleves`: student register, profiles and enrollment form.
- `src/components/planning`: weekly schedules and schedule CRUD.
- `src/components/finances`: invoices, pricing rules and special family rates.
- `src/components/padlet`: Padlet API browser and multi-level resume workflow.
- `src/components/resume`: generation, editing, batch review and WhatsApp preview.
- `src/lib/supabase`: Supabase clients and data queries.
- `supabase/migrations`: database schema, policies and school-management tables.

## Completed and working

### Dashboard and school modules

- Premium dashboard with sites, groups, levels, daily schedule, school health and attention points.
- `Eleves`, `Planning` and `Finances` redesigned to share the dashboard's visual hierarchy and density.
- Students: search, filters, CSV export, level distribution, profiles and public enrollment.
- Planning: create, edit, duplicate and delete schedule slots; site filtering; weekly cockpit.
- Finances: pricing rules by site, special family rates, invoices, CSV export and useful empty state.

### Padlet and resumes

- Connected Padlet API browser.
- Complete Padlet source remains visible on the left.
- Any Padlet item can be assigned independently to any level.
- Separate selections for Preschoolers, Kids, Juniors, Tweens and Teenagers.
- Generate one resume or a complete multi-level series.
- Generated resumes are stored in Supabase and reviewed on `/resumes/generated`.
- Persistent Padlet workspace in `sessionStorage`: open board, selections, date, active level and generated resume IDs survive navigation.
- `Retour aux niveaux` restores the previous Padlet workspace.
- `Sauvegarder toute la serie` saves every generated resume in one action.

### WhatsApp and registration

- WhatsApp preview and send workflow.
- Send history stored in `whatsapp_sends`, grouped by date with message content.
- Secure public registration link and QR code.
- Public enrollment creates family/student records and supports notifications when configured.

## Important recent files

- `src/components/dashboard/DashboardContent.tsx`
- `src/components/eleves/ElevesContent.tsx`
- `src/components/eleves/StudentForm.tsx`
- `src/components/planning/PlanningContent.tsx`
- `src/components/finances/FinancesContent.tsx`
- `src/components/padlet/PadletManager.tsx`
- `src/components/padlet/PadletViewer.tsx`
- `src/components/resume/GeneratedResumesBoard.tsx`
- `src/components/whatsapp/WhatsAppSendPanel.tsx`
- `src/app/api/resumes/generate/route.ts`
- `src/app/api/whatsapp/send/route.ts`
- `src/app/api/public-registration/route.ts`

## Current unfinished task

The user correctly noted that the Planning metric `Capacite` currently adds every schedule slot's `max_students`. This can double-count the same group when it has several weekly slots and does not show real occupancy.

Implement real capacity management using:

- active/trial students;
- active enrollments (`student.enrollments`);
- unique groups, counted once;
- capacity per group, derived conservatively from its active schedules;
- occupied places;
- available places;
- full or over-capacity groups;
- occupancy percentage;
- breakdown by site and level.

Relevant existing data:

- `Student.enrollments?: Enrollment[]`
- `Enrollment.group_id`, `Enrollment.status`
- `Schedule.group_id`, `Schedule.site_id`, `Schedule.max_students`
- `getStudents()` already selects `enrollments(*, group:groups(*, level:levels(*))`
- `getSchedulesByDay()` provides hydrated schedules.

Recommended implementation:

1. Build a memoized group-capacity model in `PlanningContent.tsx`.
2. Deduplicate schedules by `group_id`.
3. Count students from active/trial students with active/trial enrollments.
4. Add top metrics: occupied, total capacity, available, full groups.
5. Replace site chips with `occupied / capacity` and available-place status.
6. Add a compact table or cards by site and level.
7. Show occupancy on each schedule card, for example `8/12`, `4 places`, or `Complet`.
8. Handle students without enrollment separately instead of silently counting them in a group.
9. Validate TypeScript, production build, responsive layout, then commit, push and deploy.

## Honest product assessment

- Dashboard after current work: approximately 16/20.
- Overall school modules after redesign: approximately 17/20 visually.
- They are professional, but not yet functionally equivalent to a major-school management system.

Major features still needed after real capacity:

- attendance and absence tracking;
- waiting lists and trial conversion;
- automated invoice generation;
- payment reminders and due-date calendar;
- enrollment and departure trends;
- role-based permissions for staff;
- administrative activity log;
- document and consent tracking;
- family communication history;
- reporting and exports by academic year.

## Important decisions

- Keep the existing dark dashboard design as the system reference.
- Operational pages should be dense, restrained and scannable.
- Avoid decorative redesigns that do not improve workflows.
- Do not replace existing Supabase or API patterns.
- Preserve working CRUD and user data while improving presentation.
- Capacity must be based on unique groups and real enrollments, not summed schedule slots.

## Verification and deployment workflow

```powershell
npm run type-check
npm run build
git status --short
git add .
git commit -m "feat: add real group capacity tracking"
git push origin main
npx vercel --prod
```

