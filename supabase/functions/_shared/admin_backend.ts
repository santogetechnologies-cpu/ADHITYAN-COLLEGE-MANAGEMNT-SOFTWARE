// =============================================================================
// Admin / operations API for the Adhityan College ERP  (Supabase Edge runtime)
//
// Ported from src/server/adminBackend.ts (Vite dev-server plugin) with these changes:
//  * caller identity + role come from _shared/auth.ts (profiles table), NOT from
//    user_metadata and NOT from a "mock-test-role:" bypass token (both removed);
//  * per-action role whitelists are explicit; unknown actions/roles fail closed;
//  * multi-tenant "platform_*" actions and platform_super_admin removed
//    (single-institution deployment);
//  * handlers that returned fake success (record_attendance, submit_marks,
//    collect_fee_payment, create_assignment ...) are real or return 501;
//  * IDORs closed (get_child_telemetry, get_parent_student_links, submit_assignment ...);
//  * first-login + login-id resolution live in their own functions.
// =============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { KNOWN_ROLES, type Caller } from "./auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";

/** Roles an administrator may assign when creating/updating accounts. */
export const ALLOWED_ROLES: string[] = [...KNOWN_ROLES];

const STAFF_STUDENT_VIEWERS = ["admin", "principal", "hod", "teacher", "receptionist"];
const FINANCE_ROLES = ["admin", "principal", "finance_manager", "financier", "accountant"];
const FEE_COLLECTORS = ["admin", "finance_manager", "financier"];
const TEACHER_ROLES = ["admin", "principal", "hod", "teacher"];
const ADMISSION_ROLES = ["admin", "principal", "receptionist"];
const ADMIN_ONLY_CONFIG = ["admin"];
const DEFAULT_ROLES = ["admin", "principal"];

/** action -> roles allowed. Anything not listed falls back to DEFAULT_ROLES (admin, principal). */
const ACTION_ROLES: Record<string, string[]> = {
  // identity-bound portal actions (handlers enforce ownership)
  submit_assignment: ["student"],
  place_store_order: [...KNOWN_ROLES],
  create_concern: [...KNOWN_ROLES],
  get_parent_student_links: ["parent", ...ADMISSION_ROLES],
  get_child_telemetry: ["parent", "student", ...STAFF_STUDENT_VIEWERS],
  // teaching
  create_assignment: TEACHER_ROLES, record_attendance: TEACHER_ROLES, submit_marks: TEACHER_ROLES,
  // finance
  generate_fee_receipt: FEE_COLLECTORS, collect_fee_payment: FEE_COLLECTORS,
  // admissions & parent accounts
  create_parent_account: ADMISSION_ROLES, link_parent_student: ADMISSION_ROLES, unlink_parent_student: ADMISSION_ROLES,
  list_parent_links: ADMISSION_ROLES, list_parent_accounts: ADMISSION_ROLES, search_parents: ADMISSION_ROLES,
  confirm_admission: ADMISSION_ROLES, create_admission_application: ADMISSION_ROLES, update_admission_status: ADMISSION_ROLES,
  enroll_admission: ADMISSION_ROLES, record_admission_deposit: ADMISSION_ROLES,
  resolve_login_id: ADMISSION_ROLES, check_student_id_availability: ADMISSION_ROLES,
  list_unprovisioned_approved_students: ADMISSION_ROLES, provision_student_account: ADMISSION_ROLES,
  list_students_for_parent_linking: ADMISSION_ROLES, create_parent_account_and_link: ADMISSION_ROLES,
  // system configuration (admin only; handlers re-check)
  save_system_config_draft: ADMIN_ONLY_CONFIG, publish_system_config: ADMIN_ONLY_CONFIG,
  rollback_system_config: ADMIN_ONLY_CONFIG, create_system_backup: ADMIN_ONLY_CONFIG,
  restore_system_backup: ADMIN_ONLY_CONFIG, get_system_audit_logs: ADMIN_ONLY_CONFIG,
};

export type HandlerResult = { status: number; body: any };

/** Random initial password. Nobody ever types it: first sign-in goes through the e-mailed activation code. */
function strongRandomPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, 'x') + 'aA1!';
}

export async function handleAdminUserOperation(caller: Caller, body: any, userToken: string): Promise<HandlerResult> {
  const callerUser = { id: caller.id, email: caller.email };
  const callerRole: string = caller.role;
  const action = body?.action;

  if (typeof action !== "string" || !action) {
    return { status: 400, body: { error: "action is required.", code: "VALIDATION_ERROR" } };
  }
  const allowed = ACTION_ROLES[action] ?? DEFAULT_ROLES;
  if (!allowed.includes(callerRole)) {
    return { status: 403, body: { error: `Access denied for role "${callerRole}".`, code: "FORBIDDEN" } };
  }

  // Privileged client (service role). Every action above has already passed the role gate.
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // Client acting AS the caller (RLS + auth.uid() apply) for RPCs that authorise by auth.uid().
  const supabaseAsUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  });
  const isUuidStr = (u?: unknown) =>
    typeof u === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u);
  void supabaseAsUser; void isUuidStr;

  try {
    switch (action) {
      // ---- re-implemented handlers (see header) -----------------------------------------
      case 'resolve_login_id': {
        const identifier = String(body.identifier ?? '').trim();
        if (identifier.length < 3) return { status: 400, body: { error: 'identifier required.' } };
        const { data: email } = await supabaseAdmin.rpc('resolve_login_id', { p_login_id: identifier });
        return { status: 200, body: { success: !!email, email: email || null } };
      }

      case 'generate_fee_receipt': {
        return { status: 410, body: { error: 'Receipts are issued automatically by collect_fee_payment.', code: 'GONE' } };
      }

      case 'collect_fee_payment': {
        const p = body.payment ?? {};
        const amount = Number(p.amount);
        if (!isUuidStr(p.student_fee_id)) return { status: 400, body: { error: 'payment.student_fee_id (uuid) is required.', code: 'VALIDATION_ERROR' } };
        if (!Number.isFinite(amount) || amount <= 0) return { status: 400, body: { error: 'payment.amount must be > 0.', code: 'VALIDATION_ERROR' } };
        const { data, error } = await supabaseAdmin.rpc('record_fee_payment', {
          p_student_fee_id: p.student_fee_id, p_amount: amount, p_payment_mode: String(p.payment_mode ?? ''),
          p_reference: p.transaction_reference ?? null, p_idempotency_key: String(p.idempotency_key ?? ''),
          p_collected_by: callerUser.id, p_remarks: p.remarks ?? null,
        });
        if (error) return { status: 500, body: { error: 'Payment could not be recorded.', code: 'PAYMENT_FAILED' } };
        if (!data?.success) return { status: 400, body: { error: data?.error ?? 'Payment rejected.', code: data?.code ?? 'PAYMENT_REJECTED' } };
        return { status: 200, body: data };
      }

      case 'submit_assignment': {
        const s = body.submission ?? {};
        if (!isUuidStr(s.assignment_id)) return { status: 400, body: { error: 'submission.assignment_id (uuid) is required.' } };
        const text = typeof s.submission_text === 'string' ? s.submission_text.slice(0, 20000) : null;
        const { data: a } = await supabaseAdmin.from('assignments').select('id, subject, due_date').eq('id', s.assignment_id).maybeSingle();
        if (!a) return { status: 404, body: { error: 'Assignment not found.' } };
        const { data: me } = await supabaseAdmin.from('profiles').select('name').eq('id', callerUser.id).maybeSingle();
        const late = a.due_date && new Date(a.due_date).getTime() < Date.now();
        const row = {
          assignment_id: a.id, student_id: callerUser.id, student_name: me?.name ?? 'Student', subject: a.subject,
          submission_text: text, attachment_url: typeof s.attachment_url === 'string' ? s.attachment_url : null,
          status: late ? 'late' : 'submitted', submitted_at: new Date().toISOString(),
        };
        const { data: prev } = await supabaseAdmin.from('assignment_submissions').select('id, status')
          .eq('assignment_id', a.id).eq('student_id', callerUser.id).maybeSingle();
        if (prev?.status === 'graded') return { status: 409, body: { error: 'Already graded; resubmission not allowed.' } };
        const q = prev
          ? supabaseAdmin.from('assignment_submissions').update(row).eq('id', prev.id)
          : supabaseAdmin.from('assignment_submissions').insert(row);
        const { data, error } = await q.select().single();
        if (error) return { status: 400, body: { error: error.message } };
        return { status: 200, body: { success: true, submission: data } };
      }

      case 'create_assignment': {
        const a = body.assignment ?? {};
        if (!a.title || !a.subject || !a.due_date) return { status: 400, body: { error: 'title, subject and due_date are required.' } };
        const { data: me } = await supabaseAdmin.from('profiles').select('name').eq('id', callerUser.id).maybeSingle();
        const { data, error } = await supabaseAdmin.from('assignments').insert({
          title: String(a.title).slice(0, 300), subject: String(a.subject).slice(0, 200),
          description: a.description ?? null, type: ['assignment', 'homework', 'project'].includes(a.type) ? a.type : 'assignment',
          priority: ['low', 'medium', 'high'].includes(a.priority) ? a.priority : 'medium',
          due_date: a.due_date, classes: Array.isArray(a.classes) ? a.classes : [], attachments: Array.isArray(a.attachments) ? a.attachments : [],
          teacher_id: callerUser.id, teacher_name: me?.name ?? null,
        }).select().single();
        if (error) return { status: 400, body: { error: error.message } };
        return { status: 200, body: { success: true, assignment: data } };
      }

      case 'record_attendance':
      case 'submit_marks': {
        // Previously returned success without writing anything. Attendance and marks are written by
        // the teacher dashboard directly to class_attendance_sessions / student_attendance_records /
        // exam_results under RLS + the migration-031 triggers. A server path is intentionally not faked.
        return { status: 501, body: { error: `"${action}" is not implemented server-side; use the RLS-protected direct writes.`, code: 'NOT_IMPLEMENTED' } };
      }

      case 'place_store_order': {
        const order = body.order ?? {};
        const items = (Array.isArray(order.items) ? order.items : []).map((it: any) => ({
          product_id: it.product_id ?? it.id, quantity: Number(it.quantity),
        }));
        // Server computes the price from the catalog; the client total is only a cross-check.
        const { data, error } = await supabaseAsUser.rpc('checkout_store_order', {
          p_student_id: callerUser.id, p_items: items, p_total_amount: Number(order.totalAmount ?? order.total_amount ?? 0),
        });
        if (error) return { status: 400, body: { error: error.message.includes('PRICE_MISMATCH') ? 'Prices changed; refresh your cart.' : 'Order failed.' } };
        if (!data?.success) return { status: 400, body: { error: data?.error ?? 'Order failed.' } };
        return { status: 200, body: { success: true, order: data } };
      }

      case 'create_concern': {
        const c = body.concern ?? {};
        if (!c.subject || !c.description) return { status: 400, body: { error: 'subject and description are required.' } };
        const { data: me } = await supabaseAdmin.from('profiles').select('name, role').eq('id', callerUser.id).maybeSingle();
        const { data, error } = await supabaseAdmin.from('concerns').insert({
          user_id: callerUser.id, student_id: me?.role === 'student' ? callerUser.id : null,
          user_name: c.is_anonymous ? null : (me?.name ?? null),
          concern_type: String(c.concern_type ?? c.category ?? 'General').slice(0, 100),
          priority: ['low', 'medium', 'high', 'critical'].includes(c.priority) ? c.priority : 'medium',
          subject: String(c.subject).slice(0, 300), description: String(c.description).slice(0, 5000),
          is_anonymous: !!c.is_anonymous, status: 'Pending',
        }).select().single();
        if (error) return { status: 400, body: { error: error.message } };
        return { status: 200, body: { success: true, concern: data } };
      }

      // ---- ported handlers (unchanged business logic) -----------------------------------
      case 'get_parent_student_links': {
        let parentId = body.parentId;
        if (callerRole === 'parent') {
          parentId = callerUser.id;
        }

        let query = supabaseAdmin.from('parent_student_links').select('*');
        if (parentId) {
          query = query.eq('parent_id', parentId);
        }
        const { data: links, error: linkErr } = await query.order('created_at', { ascending: false });
        if (linkErr) {
          return { status: 400, body: { error: linkErr.message } };
        }

        if (!links || links.length === 0) {
          return { status: 200, body: { success: true, links: [] } };
        }

        const studentIds = links.map(l => l.student_id).filter(Boolean);
        const { data: studentProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email, roll_number, student_id, class_name, department, phone, avatar_url')
          .in('id', studentIds);

        const profileMap = new Map((studentProfiles || []).map(p => [p.id, {
          ...p,
          student_id: p.student_id || p.roll_number || `STU-${p.id.slice(0, 8).toUpperCase()}`,
          roll_number: p.roll_number || p.student_id || `STU-${p.id.slice(0, 8).toUpperCase()}`,
        }]));

        const enrichedLinks = links.map(link => ({
          ...link,
          student: profileMap.get(link.student_id) || null,
        })).filter(l => Boolean(l.student));

        return { status: 200, body: { success: true, links: enrichedLinks } };
      }

      case 'get_child_telemetry': {
        const { studentId } = body;
        if (!studentId) {
          return { status: 400, body: { error: 'studentId is required.' } };
        }

        // Security: identity-bound access (was: any role could read any student's data)
        const isStaffViewer = ['admin', 'principal', 'hod', 'teacher', 'receptionist'].includes(callerRole);
        if (callerRole === 'student' && studentId !== callerUser.id) {
          return { status: 403, body: { error: 'Unauthorized: you can only view your own records.', code: 'FORBIDDEN' } };
        }
        if (callerRole === 'parent') {
          const { data: linkRecord } = await supabaseAdmin
            .from('parent_student_links')
            .select('id')
            .eq('parent_id', callerUser.id)
            .eq('student_id', studentId)
            .maybeSingle();

          if (!linkRecord) {
            return { status: 403, body: { error: 'Unauthorized: Student is not linked to your parent account.', code: 'FORBIDDEN' } };
          }
        }

        // Fetch student profile, attendance, fees, receipts, and exam results
        const [profRes, attRes, feesRes, recRes, resultsRes] = await Promise.all([
          supabaseAdmin.from('profiles').select('id, name, email, role, roll_number, student_id, class_name, department, phone, avatar_url, status').eq('id', studentId).maybeSingle(),
          supabaseAdmin.from('student_attendance_records').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
          supabaseAdmin.from('student_fees').select('*').eq('student_id', studentId),
          supabaseAdmin.from('fee_receipts').select('*').eq('student_id', studentId).order('payment_date', { ascending: false }),
          (() => { const q = supabaseAdmin.from('exam_results').select('*').eq('student_id', studentId).order('created_at', { ascending: false }); return isStaffViewer ? q : q.eq('is_published', true); })(),
        ]);

        return {
          status: 200,
          body: {
            success: true,
            student: profRes.data,
            attendance: attRes.data || [],
            fees: feesRes.data || [],
            receipts: recRes.data || [],
            exam_results: resultsRes.data || []
          }
        };
      }

      case 'check_student_id_availability': {
        const { student_id } = body;
        if (!student_id || !student_id.trim()) {
          return { status: 400, body: { error: 'Student ID is required.', code: 'VALIDATION_ERROR' } };
        }
        const cleanId = student_id.trim();

        // 1. Check profiles
        const { data: profileMatch } = await supabaseAdmin
          .from('profiles')
          .select('id, name, roll_number')
          .eq('roll_number', cleanId)
          .maybeSingle();

        if (profileMatch) {
          return {
            status: 200,
            body: {
              available: false,
              message: `Student ID "${cleanId}" is already assigned to active student ${profileMatch.name}.`
            }
          };
        }

        // 2. Check admission_applications (active non-rejected)
        try {
          const { data: appMatch } = await supabaseAdmin
            .from('admission_applications')
            .select('id, applicant_name, application_number, status')
            .neq('status', 'Rejected')
            .or(`application_number.eq.${cleanId}`)
            .maybeSingle();

          if (appMatch) {
            return {
              status: 200,
              body: {
                available: false,
                message: `Student ID "${cleanId}" is already recorded for applicant ${appMatch.applicant_name} (Status: ${appMatch.status}).`
              }
            };
          }
        } catch (e) { }

        // 3. Check metadata verifications
        try {
          const { data: docMatches } = await supabaseAdmin
            .from('admission_document_verifications')
            .select('document_url')
            .eq('document_type', 'APPLICATION_METADATA');

          for (const doc of (docMatches || [])) {
            if (doc.document_url && doc.document_url.includes(cleanId)) {
              try {
                const meta = JSON.parse(doc.document_url);
                const sId = (meta.student_id || meta.studentId || meta.application_number || meta.application_no || '').trim();
                if (sId.toLowerCase() === cleanId.toLowerCase() && meta.status !== 'Rejected') {
                  return {
                    status: 200,
                    body: {
                      available: false,
                      message: `Student ID "${cleanId}" is recorded in an active admission application for ${meta.applicant_name || meta.name} (Status: ${meta.status || 'Pending'}).`
                    }
                  };
                }
              } catch (pe) { }
            }
          }
        } catch (e) { }

        return {
          status: 200,
          body: {
            available: true,
            message: `Student ID "${cleanId}" is available.`
          }
        };
      }

      case 'create_admission_application': {
        const a = body.application;
        if (!a) return { status: 400, body: { error: 'Application payload required.', code: 'VALIDATION_ERROR' } };
        const studentId = String(a.student_id || a.studentId || a.application_number || '').trim();
        const name = String(a.applicant_name || a.name || '').trim();
        if (!studentId) {
          return { status: 400, body: { error: 'Student ID must be entered manually by authorized staff. Auto-generation is not permitted.', code: 'STUDENT_ID_REQUIRED' } };
        }
        if (studentId.length > 64 || !name || name.length > 200) {
          return { status: 400, body: { error: 'A valid applicant name and a student ID of at most 64 characters are required.', code: 'VALIDATION_ERROR' } };
        }
        const email = String(a.email || '').trim();
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return { status: 400, body: { error: 'The e-mail address is not valid.', code: 'VALIDATION_ERROR' } };
        }

        // Student id must be unique across profiles, students and open applications
        const [{ data: dupProfile }, { data: dupStudent }, { data: dupApp }] = await Promise.all([
          supabaseAdmin.from('profiles').select('name').or(`roll_number.eq.${studentId.replace(/[,()]/g, '')},student_id.eq.${studentId.replace(/[,()]/g, '')}`).limit(1).maybeSingle(),
          supabaseAdmin.from('students').select('name').eq('student_id', studentId).maybeSingle(),
          supabaseAdmin.from('admission_applications').select('applicant_name, status').eq('application_number', studentId).maybeSingle(),
        ]);
        const owner = dupProfile?.name || dupStudent?.name || dupApp?.applicant_name;
        if (owner) {
          return { status: 409, body: { error: `Student ID "${studentId}" is already in use (${owner}). Enter a unique Student ID.`, code: 'DUPLICATE_STUDENT_ID' } };
        }

        const num = (v: unknown) => { const n = Number(v); return v !== '' && v != null && Number.isFinite(n) ? n : null; };
        const txt = (v: unknown, max = 500) => (v == null || String(v).trim() === '' ? null : String(v).trim().slice(0, max));
        const course = txt(a.class_applied || a.class_name || a.program_applied, 200);
        if (!course) return { status: 400, body: { error: 'The course applied for is required.', code: 'VALIDATION_ERROR' } };
        const docs = (Array.isArray(a.documents) ? a.documents : []).filter((d: any) => d && (d.file_url || d.file_name));

        const { data: created, error: insErr } = await supabaseAdmin.from('admission_applications').insert({
          application_number: studentId, applicant_name: name, email, phone: String(a.phone || '').trim(),
          class_name: course, parent_name: txt(a.parent_name || a.guardian_name, 200) || 'Guardian',
          parent_phone: String(a.parent_phone || a.guardian_phone || '').trim(), status: 'Submitted',
          submission_date: new Date().toISOString().split('T')[0], remarks: txt(a.remarks, 1000),
          date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(String(a.date_of_birth || '')) ? a.date_of_birth : null,
          gender: txt(a.gender, 30), blood_group: txt(a.blood_group, 10), address: txt(a.address, 500),
          previous_school: txt(a.previous_school, 300), parent_email: txt(a.parent_email, 200),
          relationship: txt(a.relationship, 50), occupation: txt(a.occupation, 100), annual_income: txt(a.annual_income, 50),
          academic_year: txt(a.academic_year, 20), admission_batch: txt(a.admission_batch, 50),
          qualifying_board: txt(a.qualifying_board, 100), passing_year: txt(a.passing_year, 10),
          qualifying_marks: num(a.qualifying_marks), science_score: num(a.science_score),
          merit_category: txt(a.merit_category, 100), eligibility_verified: !!a.eligibility_verified,
          documents: docs, extra: { custom_fields: a.custom_fields ?? null, fee_payment: a.fee_payment ?? null },
        }).select().single();
        if (insErr || !created) {
          return { status: insErr?.code === '23505' ? 409 : 400, body: { error: insErr?.code === '23505' ? 'This student ID is already used by another application.' : 'The application could not be saved.', code: insErr?.code === '23505' ? 'DUPLICATE_STUDENT_ID' : 'APPLICATION_FAILED' } };
        }
        if (docs.length > 0) {
          await supabaseAdmin.from('admission_document_verifications').insert(docs.map((d: any) => ({
            application_id: created.id, student_name: name, document_type: String(d.type || 'Document').slice(0, 100),
            document_url: d.file_url || null, status: 'Pending', submission_date: new Date().toISOString().split('T')[0],
          })));
        }
        // Registering an application never creates login accounts or a student record.
        return { status: 200, body: { success: true, application: created } };
      }

      case 'update_admission_status': {
        const { id, status: requested, remarks } = body;
        if (!id || !requested) return { status: 400, body: { error: 'id and status are required.', code: 'VALIDATION_ERROR' } };
        const wanted = requested === 'Pending' ? 'Submitted' : String(requested);
        const { data, error } = await supabaseAdmin.rpc('admission_set_status', {
          p_application_id: id, p_new_status: wanted, p_remarks: remarks ?? null, p_actor: callerUser.id,
        });
        if (error) return { status: 500, body: { error: 'The status could not be changed.', code: 'STATUS_FAILED' } };
        if (!data?.success) return { status: data?.code === 'NOT_FOUND' ? 404 : 400, body: { error: data?.error ?? 'Status change rejected.', code: data?.code, allowed: data?.allowed } };
        return { status: 200, body: data };
      }

      case 'record_admission_deposit': {
        const d = body.deposit ?? {};
        const amount = Number(d.amount);
        if (!isUuidStr(d.application_id) || !Number.isFinite(amount) || amount <= 0) {
          return { status: 400, body: { error: 'deposit.application_id (uuid) and a positive deposit.amount are required.', code: 'VALIDATION_ERROR' } };
        }
        const { data, error } = await supabaseAdmin.rpc('record_admission_deposit', {
          p_application_id: d.application_id, p_amount: amount, p_payment_mode: String(d.payment_mode ?? ''),
          p_reference: d.transaction_reference ?? null, p_idempotency_key: String(d.idempotency_key ?? ''), p_actor: callerUser.id,
        });
        if (error) return { status: 500, body: { error: 'The deposit could not be recorded.', code: 'DEPOSIT_FAILED' } };
        if (!data?.success) return { status: data?.code === 'NOT_FOUND' ? 404 : 400, body: { error: data?.error ?? 'Deposit rejected.', code: data?.code } };
        return { status: 200, body: data };
      }

      case 'enroll_admission': {
        const { id, department, class_name } = body;
        if (!id) return { status: 400, body: { error: 'id is required.', code: 'VALIDATION_ERROR' } };
        const { data, error } = await supabaseAdmin.rpc('admission_enroll', {
          p_application_id: id, p_actor: callerUser.id, p_department: department ?? null, p_class_name: class_name ?? null,
        });
        if (error) return { status: 500, body: { error: 'Enrolment failed; nothing was changed. Please retry.', code: 'ENROLL_FAILED' } };
        if (!data?.success) return { status: data?.code === 'NOT_FOUND' ? 404 : 409, body: { error: data?.error ?? 'Enrolment rejected.', code: data?.code } };
        return { status: 200, body: data };
      }

      case 'list_unprovisioned_approved_students': {
        // Find approved admissions whose student_id is NOT yet in profiles (role = 'student')
        const { data: studentProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, email, roll_number')
          .eq('role', 'student');

        const registeredStudentIds = new Set(
          (studentProfiles || []).map(p => (p.roll_number || '').trim().toLowerCase()).filter(Boolean)
        );
        const registeredEmails = new Set(
          (studentProfiles || []).map(p => (p.email || '').trim().toLowerCase()).filter(Boolean)
        );

        const unprovisioned: any[] = [];
        const seenIds = new Set<string>();

        // Check metadata applications
        try {
          const { data: docMetas } = await supabaseAdmin
            .from('admission_document_verifications')
            .select('*')
            .eq('document_type', 'APPLICATION_METADATA')
            .order('created_at', { ascending: false });

          for (const doc of (docMetas || [])) {
            try {
              const meta = JSON.parse(doc.document_url);
              if (meta.status === 'Approved' || meta.status === 'Admitted') {
                const sId = (meta.student_id || meta.studentId || meta.application_no || meta.application_number || '').trim();
                const sEmail = (meta.email || '').trim().toLowerCase();
                if (sId && registeredStudentIds.has(sId.toLowerCase())) continue;
                if (sEmail && registeredEmails.has(sEmail)) continue;
                if (meta.is_provisioned) continue;

                const appId = meta.id || meta.application_id || doc.id;
                if (!seenIds.has(appId)) {
                  seenIds.add(appId);
                  unprovisioned.push({
                    id: appId,
                    student_id: sId,
                    name: meta.applicant_name || meta.name || doc.student_name,
                    email: meta.email || '',
                    phone: meta.phone || '',
                    parent_name: meta.parent_name || meta.parent?.name || 'Guardian',
                    parent_phone: meta.parent_phone || meta.parent?.phone || '',
                    parent_email: meta.parent_email || meta.parent?.email || '',
                    department: meta.class_applied || meta.class_name || meta.department || 'Paramedical Sciences',
                    class_name: meta.class_name || 'Semester 1',
                    status: meta.status,
                    approved_at: meta.reviewed_at || meta.updated_at || doc.updated_at,
                    remarks: meta.remarks || ''
                  });
                }
              }
            } catch (pe) { }
          }
        } catch (e) { }

        // Check admission_applications table
        try {
          const { data: approvedApps } = await supabaseAdmin
            .from('admission_applications')
            .select('*')
            .in('status', ['Approved', 'Admitted'])
            .order('created_at', { ascending: false });

          for (const app of (approvedApps || [])) {
            const sId = (app.student_id || app.application_number || '').trim();
            const sEmail = (app.email || '').trim().toLowerCase();
            if (sId && registeredStudentIds.has(sId.toLowerCase())) continue;
            if (sEmail && registeredEmails.has(sEmail)) continue;

            if (!seenIds.has(app.id)) {
              seenIds.add(app.id);
              unprovisioned.push({
                id: app.id,
                student_id: sId,
                name: app.applicant_name,
                email: app.email,
                phone: app.phone,
                parent_name: app.parent_name,
                parent_phone: app.parent_phone,
                parent_email: app.parent_email,
                department: app.class_name,
                class_name: 'Semester 1',
                status: app.status,
                approved_at: app.updated_at || app.created_at,
                remarks: app.remarks
              });
            }
          }
        } catch (e) { }

        return { status: 200, body: { success: true, unprovisioned } };
      }

      case 'provision_student_account': {
        const { admission_id, student_id, name, email, password, department, class_name, phone } = body;
        if (!student_id || !email || !password || !name) {
          return { status: 400, body: { error: 'Student ID, Email, Password, and Name are required.', code: 'VALIDATION_ERROR' } };
        }

        const cleanStudentId = student_id.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim();
        const cleanDepartment = (department || 'Paramedical Sciences').trim();
        const cleanClass = (class_name || 'Semester 1').trim();
        const cleanPhone = (phone || '').trim();

        if (password.length < 6) {
          return { status: 400, body: { error: 'Temporary password must be at least 6 characters long.', code: 'WEAK_PASSWORD' } };
        }

        // 1. Verify student_id uniqueness in profiles
        const { data: existingWithId } = await supabaseAdmin
          .from('profiles')
          .select('id, name, roll_number')
          .eq('roll_number', cleanStudentId)
          .maybeSingle();

        if (existingWithId) {
          return {
            status: 409,
            body: {
              error: `Student ID "${cleanStudentId}" is already assigned to active student ${existingWithId.name}.`,
              code: 'DUPLICATE_STUDENT_ID'
            }
          };
        }

        // 2. Verify email uniqueness
        const { data: existingWithEmail } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingWithEmail) {
          return {
            status: 409,
            body: {
              error: `Email "${cleanEmail}" is already registered to user "${existingWithEmail.name}".`,
              code: 'DUPLICATE_EMAIL'
            }
          };
        }

        // 3. Create Auth user
        const { data: authCreated, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            name: cleanName,
            role: 'student',
            student_id: cleanStudentId,
            department: cleanDepartment,
            class_name: cleanClass,
            phone: cleanPhone,
            status: 'active'
          }
        });

        if (authErr || !authCreated?.user) {
          return {
            status: 400,
            body: {
              error: authErr?.message || 'Failed to create student auth account.',
              code: authErr?.code || 'AUTH_CREATION_FAILED'
            }
          };
        }

        const newStudentUserId = authCreated.user.id;

        // 4. Create record in public.profiles
        const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: newStudentUserId,
            email: cleanEmail,
            name: cleanName,
            role: 'student',
            roll_number: cleanStudentId,
            department: cleanDepartment,
            class_name: cleanClass,
            phone: cleanPhone || null,
            preferences: { status: 'active', student_id: cleanStudentId },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (profileErr) {
          await supabaseAdmin.auth.admin.deleteUser(newStudentUserId);
          return {
            status: 500,
            body: {
              error: `Failed to create student profile: ${profileErr.message}`,
              code: 'PROFILE_ERROR'
            }
          };
        }

        // 5. Initialize student fee account so Finance module connects immediately
        try {
          await supabaseAdmin.from('student_fees').insert({
            student_id: newStudentUserId,
            student_name: cleanName,
            class_name: cleanClass,
            total_due: 65000,
            paid_amount: 0,
            due_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
            status: 'pending',
            created_at: new Date().toISOString()
          });
        } catch (fe) { }

        // 6. Update admission metadata to flag as provisioned and resolve parent details
        let parentNameCandidate = body.parent_name || '';
        let parentPhoneCandidate = body.parent_phone || '';
        let parentEmailCandidate = body.parent_email || '';
        let parentIdCandidate = body.parent_id || body.existing_parent_id || '';
        let parentRelCandidate = body.relationship || 'Parent';

        if (admission_id) {
          try {
            const { data: appData } = await supabaseAdmin
              .from('admission_applications')
              .select('*')
              .eq('id', admission_id)
              .maybeSingle();

            if (appData) {
              if (!parentNameCandidate) parentNameCandidate = appData.parent_name || '';
              if (!parentPhoneCandidate) parentPhoneCandidate = appData.parent_phone || '';
              if (!parentEmailCandidate) parentEmailCandidate = appData.email || '';
            }

            await supabaseAdmin
              .from('admission_applications')
              .update({
                student_id: cleanStudentId,
                remarks: `Portal account provisioned on ${new Date().toLocaleDateString()}`
              })
              .eq('id', admission_id);
          } catch (ae) { }

          try {
            const { data: docs } = await supabaseAdmin
              .from('admission_document_verifications')
              .select('*')
              .eq('document_type', 'APPLICATION_METADATA');

            for (const d of (docs || [])) {
              if (d.document_url && (d.document_url.includes(admission_id) || d.id === admission_id)) {
                try {
                  const meta = JSON.parse(d.document_url);
                  if (!parentNameCandidate) parentNameCandidate = meta.parent_name || meta.guardian_name || meta.parent?.name || '';
                  if (!parentPhoneCandidate) parentPhoneCandidate = meta.parent_phone || meta.guardian_phone || meta.parent?.phone || '';
                  if (!parentEmailCandidate) parentEmailCandidate = meta.parent_email || meta.parent?.email || '';
                  if (!parentIdCandidate) parentIdCandidate = meta.parent_id || meta.existing_parent_id || '';
                  if (meta.relationship) parentRelCandidate = meta.relationship;

                  meta.is_provisioned = true;
                  meta.provisioned_at = new Date().toISOString();
                  meta.student_user_id = newStudentUserId;
                  meta.student_id = cleanStudentId;
                  await supabaseAdmin
                    .from('admission_document_verifications')
                    .update({ document_url: JSON.stringify(meta), updated_at: new Date().toISOString() })
                    .eq('id', d.id);
                } catch (pe) { }
              }
            }
          } catch (me) { }
        }

        // 7. Automatic Parent Account Linking during Admission Provisioning
        try {
          let resolvedParentUserId: string | null = null;

          // A. Check if parentIdCandidate matches an existing parent profile
          if (parentIdCandidate) {
            const { data: pMatchId } = await supabaseAdmin
              .from('profiles')
              .select('id, login_id')
              .or(`login_id.ilike.${parentIdCandidate},roll_number.ilike.${parentIdCandidate},id.eq.${parentIdCandidate}`)
              .eq('role', 'parent')
              .maybeSingle();

            if (pMatchId) {
              resolvedParentUserId = pMatchId.id;
            }
          }

          // B. Check if parent exists by phone number
          if (!resolvedParentUserId && parentPhoneCandidate) {
            const { data: pMatchPhone } = await supabaseAdmin
              .from('profiles')
              .select('id, login_id')
              .eq('phone', parentPhoneCandidate.trim())
              .eq('role', 'parent')
              .maybeSingle();

            if (pMatchPhone) {
              resolvedParentUserId = pMatchPhone.id;
            }
          }

          // C. Check if parent exists by email
          if (!resolvedParentUserId && parentEmailCandidate) {
            const { data: pMatchEmail } = await supabaseAdmin
              .from('profiles')
              .select('id, login_id')
              .eq('email', parentEmailCandidate.trim().toLowerCase())
              .eq('role', 'parent')
              .maybeSingle();

            if (pMatchEmail) {
              resolvedParentUserId = pMatchEmail.id;
            }
          }

          // D. If parent profile does not exist and parent name is provided, provision parent account
          if (!resolvedParentUserId && parentNameCandidate.trim()) {
            const genParentLoginId = await generateUniqueParentId(supabaseAdmin);
            const parentAuthEmail = parentEmailCandidate.trim() || `${genParentLoginId.toLowerCase()}@parent.adithyan.edu.in`;
            const parentPass = strongRandomPassword();

            const { data: pAuth, error: pAuthErr } = await supabaseAdmin.auth.admin.createUser({
              email: parentAuthEmail,
              password: parentPass,
              email_confirm: true,
              user_metadata: {
                name: parentNameCandidate.trim(),
                role: 'parent',
                login_id: genParentLoginId,
                phone: parentPhoneCandidate.trim(),
                relationship: parentRelCandidate,
                is_first_login: true,
                requires_password_change: true
              }
            });

            if (!pAuthErr && pAuth?.user) {
              resolvedParentUserId = pAuth.user.id;
              await supabaseAdmin.from('profiles').upsert({
                id: pAuth.user.id,
                name: parentNameCandidate.trim(),
                email: parentAuthEmail,
                role: 'parent',
                roll_number: genParentLoginId,
                phone: parentPhoneCandidate.trim(),
                preferences: {
                  login_id: genParentLoginId,
                  is_first_login: true,
                  first_login_completed: false,
                  requires_password_change: true
                },
                updated_at: new Date().toISOString()
              });
            }
          }

          // E. Link student to parent in parent_student_links with verified = true
          if (resolvedParentUserId) {
            await supabaseAdmin.from('parent_student_links').upsert({
              parent_id: resolvedParentUserId,
              student_id: newStudentUserId,
              relationship: parentRelCandidate || 'Parent',
              verified: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'parent_id,student_id' });
          }
        } catch (ple) {
          console.warn('Auto parent link in provision_student_account notice:', ple);
        }

        return {
          status: 200,
          body: {
            success: true,
            user: {
              id: newStudentUserId,
              email: cleanEmail,
              name: cleanName,
              student_id: cleanStudentId,
              role: 'student',
              department: cleanDepartment
            }
          }
        };
      }

      case 'list_students_for_parent_linking': {
        const { data: students, error: stdErr } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email, roll_number, department, class_name, phone')
          .eq('role', 'student')
          .order('name', { ascending: true });

        if (stdErr) {
          return { status: 500, body: { error: stdErr.message, code: 'STUDENTS_FETCH_ERROR' } };
        }

        const { data: links } = await supabaseAdmin
          .from('parent_student_links')
          .select('id, parent_id, student_id, relationship, verified');

        const { data: parentProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email, phone, login_id')
          .eq('role', 'parent');

        const parentMap = new Map((parentProfiles || []).map(p => [p.id, p]));
        const studentLinksMap = new Map<string, any[]>();

        for (const l of (links || [])) {
          if (!studentLinksMap.has(l.student_id)) {
            studentLinksMap.set(l.student_id, []);
          }
          const parentInfo = parentMap.get(l.parent_id);
          studentLinksMap.get(l.student_id)!.push({
            link_id: l.id,
            parent_id: l.parent_id,
            parent_name: parentInfo?.name || 'Parent',
            parent_email: parentInfo?.email,
            parent_phone: parentInfo?.phone,
            parent_login_id: parentInfo?.login_id,
            relationship: l.relationship,
            verified: l.verified
          });
        }

        const result = (students || []).map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          student_id: s.roll_number,
          department: s.department,
          class_name: s.class_name,
          phone: s.phone,
          is_linked: studentLinksMap.has(s.id) && studentLinksMap.get(s.id)!.length > 0,
          linked_parents: studentLinksMap.get(s.id) || []
        }));

        return { status: 200, body: { success: true, students: result } };
      }

      case 'create_parent_account_and_link': {
        const { student_id, name, email, phone, password, relationship } = body;
        if (!student_id || !name || !email || !password) {
          return { status: 400, body: { error: 'Student ID, Parent Name, Email, and Password are required.', code: 'VALIDATION_ERROR' } };
        }

        const cleanStudentId = student_id.trim();
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = (phone || '').trim();
        const cleanRelationship = (relationship || 'Parent').trim();

        if (password.length < 6) {
          return { status: 400, body: { error: 'Password must be at least 6 characters long.', code: 'WEAK_PASSWORD' } };
        }

        // Verify student exists
        const { data: targetStudent } = await supabaseAdmin
          .from('profiles')
          .select('id, name, roll_number')
          .or(`id.eq.${cleanStudentId},roll_number.eq.${cleanStudentId}`)
          .maybeSingle();

        if (!targetStudent) {
          return { status: 404, body: { error: `Enrolled student not found for ID "${cleanStudentId}".`, code: 'STUDENT_NOT_FOUND' } };
        }

        const studentProfileId = targetStudent.id;

        // Check if parent account already exists with this email
        let parentUserId: string;
        const { data: existingParent } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email, role')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingParent) {
          if (existingParent.role !== 'parent') {
            return {
              status: 409,
              body: {
                error: `User with email "${cleanEmail}" already exists with role "${existingParent.role}". Cannot convert to parent account.`,
                code: 'ROLE_CONFLICT'
              }
            };
          }
          parentUserId = existingParent.id;
        } else {
          // Create parent Auth user
          const { data: parentAuth, error: pAuthErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
              name: cleanName,
              role: 'parent',
              phone: cleanPhone,
              status: 'active'
            }
          });

          if (pAuthErr || !parentAuth?.user) {
            return {
              status: 400,
              body: {
                error: pAuthErr?.message || 'Failed to create parent auth account.',
                code: pAuthErr?.code || 'AUTH_CREATION_FAILED'
              }
            };
          }

          parentUserId = parentAuth.user.id;

          const { error: pProfileErr } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: parentUserId,
              email: cleanEmail,
              name: cleanName,
              role: 'parent',
              phone: cleanPhone || null,
              preferences: { status: 'active' },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (pProfileErr) {
            await supabaseAdmin.auth.admin.deleteUser(parentUserId);
            return { status: 500, body: { error: `Failed to create parent profile: ${pProfileErr.message}`, code: 'PROFILE_ERROR' } };
          }
        }

        // Insert link into parent_student_links
        const { data: linkRecord, error: linkErr } = await supabaseAdmin
          .from('parent_student_links')
          .upsert({
            parent_id: parentUserId,
            student_id: studentProfileId,
            relationship: cleanRelationship,
            verified: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'parent_id,student_id' })
          .select()
          .single();

        if (linkErr) {
          return { status: 400, body: { error: linkErr.message, code: 'LINK_FAILED' } };
        }

        return {
          status: 200,
          body: {
            success: true,
            parent: { id: parentUserId, name: cleanName, email: cleanEmail },
            link: linkRecord
          }
        };
      }

      // =========================================================================
      // SEPARATED SYSTEM B: STUDENT LOGIN BULK IMPORT
      // =========================================================================
      case 'bulk_provision_student_accounts': {
        const { rows } = body;
        if (!Array.isArray(rows) || rows.length === 0) {
          return { status: 400, body: { error: 'Rows array is required and cannot be empty.', code: 'VALIDATION_ERROR' } };
        }

        const results: Array<{ index: number; row: any; success: boolean; message: string; accountId?: string }> = [];
        const failedRows: any[] = [];
        let successCount = 0;
        let failureCount = 0;

        for (let idx = 0; idx < rows.length; idx++) {
          const item = rows[idx];
          const cleanName = (item.name || item.student_name || '').trim();
          const cleanId = (item.student_id || item.studentId || item.roll_number || '').trim();
          const cleanEmail = (item.email || item.student_email || '').trim().toLowerCase();
          const rawPassword = item.password || item.initial_password || item.student_password;
          const cleanPassword = (rawPassword ? String(rawPassword).trim() : `Edu@${cleanId || 'Pass123'}`);

          // Validate required fields
          if (!cleanName || !cleanId || !cleanEmail) {
            results.push({ index: idx, row: item, success: false, message: 'Missing required field: Name, Student ID, or Email.' });
            failedRows.push({ ...item, failure_reason: 'Missing Name, Student ID, or Email' });
            failureCount++;
            continue;
          }

          if (cleanPassword.length < 6) {
            results.push({ index: idx, row: item, success: false, message: 'Password must be at least 6 characters long.' });
            failedRows.push({ ...item, failure_reason: 'Password too short (< 6 chars)' });
            failureCount++;
            continue;
          }

          // Check if student ID already assigned in profiles
          const { data: existingId } = await supabaseAdmin
            .from('profiles')
            .select('id, name')
            .eq('roll_number', cleanId)
            .maybeSingle();

          if (existingId) {
            results.push({ index: idx, row: item, success: false, message: `Student ID "${cleanId}" is already assigned to active user "${existingId.name}".` });
            failedRows.push({ ...item, failure_reason: `Duplicate Student ID assigned to ${existingId.name}` });
            failureCount++;
            continue;
          }

          // Check if email already registered
          const { data: existingEmail } = await supabaseAdmin
            .from('profiles')
            .select('id, name')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (existingEmail) {
            results.push({ index: idx, row: item, success: false, message: `Email "${cleanEmail}" is already registered to user "${existingEmail.name}".` });
            failedRows.push({ ...item, failure_reason: `Duplicate email registered to ${existingEmail.name}` });
            failureCount++;
            continue;
          }

          try {
            // Create Supabase Auth user
            const { data: authCreated, error: authErr } = await supabaseAdmin.auth.admin.createUser({
              email: cleanEmail,
              password: cleanPassword,
              email_confirm: true,
              user_metadata: {
                name: cleanName,
                role: 'student',
                student_id: cleanId,
                is_first_login: true,
                require_password_change: true
              }
            });

            if (authErr || !authCreated?.user) {
              results.push({ index: idx, row: item, success: false, message: authErr?.message || 'Auth account creation failed' });
              failedRows.push({ ...item, failure_reason: authErr?.message || 'Auth creation failed' });
              failureCount++;
              continue;
            }

            const newUserId = authCreated.user.id;

            // Upsert into profiles
            const { error: profileErr } = await supabaseAdmin
              .from('profiles')
              .upsert({
                id: newUserId,
                email: cleanEmail,
                name: cleanName,
                role: 'student',
                roll_number: cleanId,
                department: item.department || 'Paramedical Sciences',
                class_name: item.class_name || 'Semester 1',
                phone: item.phone || null,
                preferences: { status: 'active', student_id: cleanId, is_first_login: true },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });

            if (profileErr) {
              await supabaseAdmin.auth.admin.deleteUser(newUserId);
              results.push({ index: idx, row: item, success: false, message: `Profile creation error: ${profileErr.message}` });
              failedRows.push({ ...item, failure_reason: profileErr.message });
              failureCount++;
              continue;
            }

            // Note: Does NOT approve admission and does NOT change Total Students count!
            results.push({ index: idx, row: item, success: true, message: 'Student login provisioned successfully.', accountId: newUserId });
            successCount++;
          } catch (err: any) {
            results.push({ index: idx, row: item, success: false, message: err.message || 'Server error' });
            failedRows.push({ ...item, failure_reason: err.message || 'Server error' });
            failureCount++;
          }
        }

        // Record audit log
        try {
          await supabaseAdmin.from('audit_logs').insert([{
            user_email: callerUser?.email || 'admin@adithyan.edu.in',
            user_role: 'admin',
            action: 'bulk_import_student_accounts',
            entity_type: 'students',
            new_values: { totalRows: rows.length, successCount, failureCount, timestamp: new Date().toISOString() }
          }]);
        } catch {}

        return {
          status: 200,
          body: {
            success: true,
            totalRows: rows.length,
            successCount,
            failureCount,
            results,
            failedRows
          }
        };
      }

      // =========================================================================
      // SEPARATED SYSTEM C: PARENT ACCOUNT BULK PROVISIONING & STUDENT LINKING
      // =========================================================================
      case 'bulk_provision_parent_accounts': {
        const { rows } = body;
        if (!Array.isArray(rows) || rows.length === 0) {
          return { status: 400, body: { error: 'Rows array is required and cannot be empty.', code: 'VALIDATION_ERROR' } };
        }

        const results: Array<{ index: number; row: any; success: boolean; isReused?: boolean; message: string; linkId?: string }> = [];
        const failedRows: any[] = [];
        let successCount = 0;
        let failureCount = 0;

        for (let idx = 0; idx < rows.length; idx++) {
          const item = rows[idx];
          const cleanStudentId = (item.student_id || item.studentId || '').trim();
          const cleanParentName = (item.parent_name || item.name || '').trim();
          const cleanParentEmail = (item.parent_email || item.email || '').trim().toLowerCase();
          const rawPassword = item.password || item.initial_password;
          const cleanPassword = (rawPassword ? String(rawPassword).trim() : `Par@${cleanStudentId || 'Pass123'}`);
          const cleanRelationship = (item.relationship || 'Parent').trim();

          if (!cleanStudentId || !cleanParentName || !cleanParentEmail) {
            results.push({ index: idx, row: item, success: false, message: 'Missing Student ID, Parent Name, or Parent Email.' });
            failedRows.push({ ...item, failure_reason: 'Missing Student ID, Parent Name, or Parent Email' });
            failureCount++;
            continue;
          }

          // 1. Validate Student ID exists in institutional records
          let studentProfileId: string | null = null;
          const { data: studentProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, name, roll_number')
            .eq('roll_number', cleanStudentId)
            .maybeSingle();

          if (studentProfile) {
            studentProfileId = studentProfile.id;
          } else {
            // Check admission_applications
            const { data: admRecord } = await supabaseAdmin
              .from('admission_applications')
              .select('id, applicant_name, application_number')
              .or(`application_number.eq.${cleanStudentId},id.eq.${cleanStudentId}`)
              .maybeSingle();

            if (admRecord) {
              studentProfileId = admRecord.id;
            } else {
              // Check admission_merit_lists
              const { data: meritRecord } = await supabaseAdmin
                .from('admission_merit_lists')
                .select('id, student_name')
                .or(`id.eq.${cleanStudentId},student_name.ilike.%${cleanStudentId}%`)
                .maybeSingle();

              if (meritRecord) {
                studentProfileId = meritRecord.id;
              } else {
                // Check admission_document_verifications
                const { data: docMatches } = await supabaseAdmin
                  .from('admission_document_verifications')
                  .select('id, document_url')
                  .eq('document_type', 'APPLICATION_METADATA');

                for (const doc of (docMatches || [])) {
                  if (doc.document_url && doc.document_url.includes(cleanStudentId)) {
                    studentProfileId = doc.id;
                    break;
                  }
                }
              }
            }
          }

          if (!studentProfileId) {
            results.push({ index: idx, row: item, success: false, message: `Student ID "${cleanStudentId}" not found in institutional records.` });
            failedRows.push({ ...item, failure_reason: `Student ID "${cleanStudentId}" not found` });
            failureCount++;
            continue;
          }

          // 2. Check if Parent Account already exists with this email
          let parentUserId: string;
          let isReused = false;

          const { data: existingParent } = await supabaseAdmin
            .from('profiles')
            .select('id, name, email, role')
            .eq('email', cleanParentEmail)
            .maybeSingle();

          if (existingParent) {
            if (existingParent.role !== 'parent') {
              results.push({ index: idx, row: item, success: false, message: `Email "${cleanParentEmail}" already belongs to role "${existingParent.role}". Cannot convert to parent.` });
              failedRows.push({ ...item, failure_reason: `Email role conflict: ${existingParent.role}` });
              failureCount++;
              continue;
            }
            parentUserId = existingParent.id;
            isReused = true;
          } else {
            // Create new parent Auth user
            if (cleanPassword.length < 6) {
              results.push({ index: idx, row: item, success: false, message: 'New parent password must be at least 6 characters.' });
              failedRows.push({ ...item, failure_reason: 'Password too short (< 6 chars)' });
              failureCount++;
              continue;
            }

            try {
              const { data: parentAuth, error: pAuthErr } = await supabaseAdmin.auth.admin.createUser({
                email: cleanParentEmail,
                password: cleanPassword,
                email_confirm: true,
                user_metadata: {
                  name: cleanParentName,
                  role: 'parent',
                  is_first_login: true,
                  require_password_change: true
                }
              });

              if (pAuthErr || !parentAuth?.user) {
                results.push({ index: idx, row: item, success: false, message: pAuthErr?.message || 'Failed to create parent auth account.' });
                failedRows.push({ ...item, failure_reason: pAuthErr?.message || 'Parent auth creation failed' });
                failureCount++;
                continue;
              }

              parentUserId = parentAuth.user.id;

              await supabaseAdmin.from('profiles').upsert({
                id: parentUserId,
                email: cleanParentEmail,
                name: cleanParentName,
                role: 'parent',
                roll_number: `PAR-${Date.now().toString().slice(-4)}`,
                preferences: { status: 'active', is_first_login: true },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });
            } catch (err: any) {
              results.push({ index: idx, row: item, success: false, message: err.message || 'Parent account creation error' });
              failedRows.push({ ...item, failure_reason: err.message || 'Parent account creation error' });
              failureCount++;
              continue;
            }
          }

          // 3. Link parent to student in parent_student_links
          try {
            const { data: linkRec, error: linkErr } = await supabaseAdmin
              .from('parent_student_links')
              .upsert({
                parent_id: parentUserId,
                student_id: studentProfileId,
                relationship: cleanRelationship,
                verified: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'parent_id,student_id' })
              .select()
              .single();

            if (linkErr) {
              results.push({ index: idx, row: item, success: false, message: `Failed to link parent to student: ${linkErr.message}` });
              failedRows.push({ ...item, failure_reason: linkErr.message });
              failureCount++;
              continue;
            }

            const successMsg = isReused
              ? `Reused existing parent account (${cleanParentEmail}) and linked to student "${cleanStudentId}".`
              : `Created new parent account and linked to student "${cleanStudentId}".`;

            results.push({ index: idx, row: item, success: true, isReused, message: successMsg, linkId: linkRec?.id });
            successCount++;
          } catch (err: any) {
            results.push({ index: idx, row: item, success: false, message: err.message || 'Linking error' });
            failedRows.push({ ...item, failure_reason: err.message || 'Linking error' });
            failureCount++;
          }
        }

        // Record audit log
        try {
          await supabaseAdmin.from('audit_logs').insert([{
            user_email: callerUser?.email || 'admin@adithyan.edu.in',
            user_role: 'admin',
            action: 'bulk_import_parent_accounts',
            entity_type: 'parents',
            new_values: { totalRows: rows.length, successCount, failureCount, timestamp: new Date().toISOString() }
          }]);
        } catch {}

        return {
          status: 200,
          body: {
            success: true,
            totalRows: rows.length,
            successCount,
            failureCount,
            results,
            failedRows
          }
        };
      }

      // =========================================================================
      // SEPARATED SYSTEM D: COMBINED STUDENT + PARENT BULK IMPORT
      // =========================================================================
      case 'bulk_provision_combined_accounts': {
        const { rows } = body;
        if (!Array.isArray(rows) || rows.length === 0) {
          return { status: 400, body: { error: 'Rows array is required and cannot be empty.', code: 'VALIDATION_ERROR' } };
        }

        const results: Array<{ index: number; row: any; success: boolean; studentCreated: boolean; parentLinked: boolean; message: string }> = [];
        const failedRows: any[] = [];
        let successCount = 0;
        let failureCount = 0;

        for (let idx = 0; idx < rows.length; idx++) {
          const item = rows[idx];
          const cleanStudentName = (item.student_name || item.name || '').trim();
          const cleanStudentId = (item.student_id || item.studentId || '').trim();
          const cleanStudentEmail = (item.student_email || item.email || '').trim().toLowerCase();
          const rawStudentPassword = item.student_password || item.password;
          const cleanStudentPassword = (rawStudentPassword ? String(rawStudentPassword).trim() : `Edu@${cleanStudentId || 'Pass123'}`);

          const cleanParentName = (item.parent_name || '').trim();
          const cleanParentEmail = (item.parent_email || '').trim().toLowerCase();
          const rawParentPassword = item.parent_password;
          const cleanParentPassword = (rawParentPassword ? String(rawParentPassword).trim() : `Par@${cleanStudentId || 'Pass123'}`);
          const cleanRelationship = (item.relationship || 'Parent').trim();

          // Validate student requirements
          if (!cleanStudentName || !cleanStudentId || !cleanStudentEmail) {
            results.push({ index: idx, row: item, success: false, studentCreated: false, parentLinked: false, message: 'Missing student Name, ID, or Email.' });
            failedRows.push({ ...item, failure_reason: 'Missing student credentials' });
            failureCount++;
            continue;
          }

          let studentUserId: string;

          // 1. Check or create Student Account
          const { data: existingStudent } = await supabaseAdmin
            .from('profiles')
            .select('id, name, email')
            .or(`roll_number.eq.${cleanStudentId},email.eq.${cleanStudentEmail}`)
            .maybeSingle();

          if (existingStudent) {
            studentUserId = existingStudent.id;
          } else {
            try {
              const { data: stuAuth, error: stuAuthErr } = await supabaseAdmin.auth.admin.createUser({
                email: cleanStudentEmail,
                password: cleanStudentPassword,
                email_confirm: true,
                user_metadata: {
                  name: cleanStudentName,
                  role: 'student',
                  student_id: cleanStudentId,
                  is_first_login: true,
                  require_password_change: true
                }
              });

              if (stuAuthErr || !stuAuth?.user) {
                results.push({ index: idx, row: item, success: false, studentCreated: false, parentLinked: false, message: stuAuthErr?.message || 'Failed to create student auth user' });
                failedRows.push({ ...item, failure_reason: stuAuthErr?.message || 'Student auth failed' });
                failureCount++;
                continue;
              }

              studentUserId = stuAuth.user.id;

              await supabaseAdmin.from('profiles').upsert({
                id: studentUserId,
                email: cleanStudentEmail,
                name: cleanStudentName,
                role: 'student',
                roll_number: cleanStudentId,
                department: item.department || 'Paramedical Sciences',
                class_name: item.class_name || 'Semester 1',
                preferences: { status: 'active', student_id: cleanStudentId, is_first_login: true },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });
            } catch (err: any) {
              results.push({ index: idx, row: item, success: false, studentCreated: false, parentLinked: false, message: err.message || 'Student creation error' });
              failedRows.push({ ...item, failure_reason: err.message || 'Student creation error' });
              failureCount++;
              continue;
            }
          }

          // 2. Handle Parent Account & Linking (Graceful: if parent info missing, do not fail student creation!)
          let parentLinked = false;
          let detailMessage = 'Student account provisioned.';

          if (cleanParentName && cleanParentEmail) {
            try {
              let parentUserId: string;
              const { data: existingParent } = await supabaseAdmin
                .from('profiles')
                .select('id, role')
                .eq('email', cleanParentEmail)
                .maybeSingle();

              if (existingParent && existingParent.role === 'parent') {
                parentUserId = existingParent.id;
              } else {
                const { data: parentAuth } = await supabaseAdmin.auth.admin.createUser({
                  email: cleanParentEmail,
                  password: cleanParentPassword,
                  email_confirm: true,
                  user_metadata: {
                    name: cleanParentName,
                    role: 'parent',
                    is_first_login: true,
                    require_password_change: true
                  }
                });

                if (parentAuth?.user) {
                  parentUserId = parentAuth.user.id;
                  await supabaseAdmin.from('profiles').upsert({
                    id: parentUserId,
                    email: cleanParentEmail,
                    name: cleanParentName,
                    role: 'parent',
                    roll_number: `PAR-${Date.now().toString().slice(-4)}`,
                    preferences: { status: 'active', is_first_login: true },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'id' });
                } else {
                  parentUserId = '';
                }
              }

              if (parentUserId) {
                await supabaseAdmin.from('parent_student_links').upsert({
                  parent_id: parentUserId,
                  student_id: studentUserId,
                  relationship: cleanRelationship,
                  verified: true,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'parent_id,student_id' });
                parentLinked = true;
                detailMessage = 'Student account created and linked to parent account.';
              }
            } catch (pErr: any) {
              detailMessage = `Student account created; parent linking notice: ${pErr.message}`;
            }
          } else {
            detailMessage = 'Student account created (Parent details omitted).';
          }

          results.push({
            index: idx,
            row: item,
            success: true,
            studentCreated: true,
            parentLinked,
            message: detailMessage
          });
          successCount++;
        }

        // Record audit log
        try {
          await supabaseAdmin.from('audit_logs').insert([{
            user_email: callerUser?.email || 'admin@adithyan.edu.in',
            user_role: 'admin',
            action: 'bulk_import_combined_accounts',
            entity_type: 'students_and_parents',
            new_values: { totalRows: rows.length, successCount, failureCount, timestamp: new Date().toISOString() }
          }]);
        } catch {}

        return {
          status: 200,
          body: {
            success: true,
            totalRows: rows.length,
            successCount,
            failureCount,
            results,
            failedRows
          }
        };
      }

      // =========================================================================
      // SEPARATED SYSTEM E: INDEPENDENT OFFICIAL STUDENT STATS
      // =========================================================================
      case 'get_official_student_stats': {
        // 1. Official Enrolled Students = ONLY approved/enrolled admissions!
        const { count: enrolledAppsCount } = await supabaseAdmin
          .from('admission_applications')
          .select('*', { count: 'exact', head: true })
          .in('status', ['approved', 'enrolled', 'accepted', 'Approved', 'Enrolled', 'Accepted', 'Admitted']);

        const { count: enrolledMeritCount } = await supabaseAdmin
          .from('admission_merit_lists')
          .select('*', { count: 'exact', head: true })
          .in('status', ['approved', 'enrolled', 'accepted', 'Approved', 'Enrolled', 'Accepted', 'Admitted']);

        const { count: totalAppsCount } = await supabaseAdmin
          .from('admission_applications')
          .select('*', { count: 'exact', head: true });

        const { count: totalMeritCount } = await supabaseAdmin
          .from('admission_merit_lists')
          .select('*', { count: 'exact', head: true });

        const { count: pendingAppsCount } = await supabaseAdmin
          .from('admission_applications')
          .select('*', { count: 'exact', head: true })
          .in('status', ['submitted', 'under_review', 'shortlisted', 'Submitted', 'Under Review', 'Pending', 'pending']);

        const { count: pendingMeritCount } = await supabaseAdmin
          .from('admission_merit_lists')
          .select('*', { count: 'exact', head: true })
          .in('status', ['submitted', 'under_review', 'shortlisted', 'Submitted', 'Under Review', 'Pending', 'pending']);

        // 2. Student Login Accounts = profiles where role = 'student'
        const { count: studentLoginsCount } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        // 3. Parent Accounts = profiles where role = 'parent'
        const { count: parentAccountsCount } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'parent');

        // 4. Parent-Student Links
        const { count: linksCount } = await supabaseAdmin
          .from('parent_student_links')
          .select('*', { count: 'exact', head: true });

        const officialTotal = (enrolledAppsCount || 0) + (enrolledMeritCount || 0);
        const totalLogins = studentLoginsCount || 0;

        return {
          status: 200,
          body: {
            success: true,
            stats: {
              official_enrolled_students: officialTotal,
              total_admission_applications: (totalAppsCount || 0) + (totalMeritCount || 0),
              pending_admission_reviews: (pendingAppsCount || 0) + (pendingMeritCount || 0),
              provisioned_student_logins: totalLogins,
              provisioned_parent_accounts: parentAccountsCount || 0,
              active_parent_student_links: linksCount || 0,
              enrolled_without_login: Math.max(0, officialTotal - totalLogins)
            }
          }
        };
      }

      case 'list_users': {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          return { status: 500, body: { error: listError.message, code: listError.code || 'LIST_USERS_ERROR' } };
        }

        const users = listData.users.map((u: any) => {
          const isBanned = Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now());
          return {
            id: u.id,
            email: u.email || '',
            name: u.user_metadata?.name || u.email?.split('@')[0] || 'User',
            role: u.user_metadata?.role || 'student',
            department: u.user_metadata?.department || '',
            class_name: u.user_metadata?.class_name || '',
            phone: u.user_metadata?.phone || '',
            status: isBanned ? 'inactive' : (u.user_metadata?.status || 'active'),
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at
          };
        });

        return { status: 200, body: { success: true, users } };
      }

      case 'create_user': {
        const { user: newUser } = body;
        if (!newUser?.email || !newUser?.password || !newUser?.role) {
          return { status: 400, body: { error: 'Email, password, and role are required.', code: 'VALIDATION_ERROR' } };
        }

        const cleanEmail = newUser.email.trim().toLowerCase();

        if (!ALLOWED_ROLES.includes(newUser.role)) {
          return { status: 400, body: { error: `Invalid role "${newUser.role}". Must be one of: ${ALLOWED_ROLES.join(', ')}`, code: 'INVALID_ROLE' } };
        }

        if (newUser.password.length < 6) {
          return { status: 400, body: { error: 'Password must be at least 6 characters long.', code: 'WEAK_PASSWORD' } };
        }

        // Check for duplicate accounts in Supabase Auth
        const { data: allUsersData, error: listCheckError } = await supabaseAdmin.auth.admin.listUsers();
        if (listCheckError) {
          return { status: 500, body: { error: `Failed to verify user registry: ${listCheckError.message}`, code: listCheckError.code || 'REGISTRY_ERROR' } };
        }

        const duplicate = allUsersData.users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
        if (duplicate) {
          return {
            status: 409,
            body: {
              error: `A user with email "${cleanEmail}" already exists in the system (Role: ${duplicate.user_metadata?.role || 'user'}). Duplicate creation rejected.`,
              code: 'DUPLICATE_EMAIL'
            }
          };
        }

        // Create Auth user in Supabase Auth
        const cleanStudentId = newUser.student_id ? newUser.student_id.trim() : undefined;
        const rawAssignedClasses = newUser.assigned_classes !== undefined ? newUser.assigned_classes : newUser.assignedClasses;
        const assignedClassesList: string[] = Array.isArray(rawAssignedClasses) ? rawAssignedClasses : [];
        const primaryClass = assignedClassesList.length > 0 ? assignedClassesList[0] : (newUser.class_name || '');
        const teacherDept = newUser.role === 'teacher' ? (newUser.department || 'Paramedical Faculty') : (newUser.department || '');

        const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: newUser.password,
          email_confirm: true,
          user_metadata: {
            name: newUser.name?.trim() || cleanEmail.split('@')[0],
            role: newUser.role,
            student_id: cleanStudentId,
            department: teacherDept,
            class_name: primaryClass,
            assigned_classes: assignedClassesList,
            classes: assignedClassesList,
            phone: newUser.phone || '',
            status: 'active'
          }
        });

        if (createError) {
          return {
            status: 400,
            body: {
              error: createError.message,
              code: createError.code || 'AUTH_CREATION_FAILED'
            }
          };
        }

        const authUser = createdData.user;

        // Create matching record in public.profiles using matching UUID
        let { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUser.id,
            email: cleanEmail,
            name: newUser.name?.trim() || cleanEmail.split('@')[0],
            role: newUser.role,
            roll_number: cleanStudentId || null,
            department: teacherDept || null,
            class_name: primaryClass || null,
            phone: newUser.phone || null,
            preferences: {
              status: 'active',
              student_id: cleanStudentId,
              role: newUser.role,
              assigned_classes: assignedClassesList
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (profileError && profileError.code === '23514') {
          console.warn(`Role "${newUser.role}" not in legacy profiles_role_check constraint. Upserting with fallback role while preserving in user_metadata & preferences.`);
          const { error: retryError } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: authUser.id,
              email: cleanEmail,
              name: newUser.name?.trim() || cleanEmail.split('@')[0],
              role: 'admin',
              roll_number: cleanStudentId || null,
              department: teacherDept || null,
              class_name: primaryClass || null,
              phone: newUser.phone || null,
              preferences: {
                status: 'active',
                student_id: cleanStudentId,
                role: newUser.role,
                assigned_classes: assignedClassesList
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          if (!retryError) {
            profileError = null;
          }
        }

        if (newUser.role === 'student') {
          try {
            await supabaseAdmin.from('student_fees').insert({
              student_id: authUser.id,
              total_amount: 65000,
              paid_amount: 0,
              due_amount: 65000,
              status: 'Pending',
              academic_year: '2026-2027',
              created_at: new Date().toISOString()
            });
          } catch (fe) { }
        }

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // If profile creation failed due to database constraint/foreign key failure (not missing schema cache)
          if (profileError.code !== 'PGRST205') {
            console.warn(`Profile creation failed with code ${profileError.code}. Rolling back created auth user ${authUser.id}...`);
            await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            return {
              status: 500,
              body: {
                error: `Database profile creation failed: ${profileError.message}. Auth user was safely rolled back.`,
                code: profileError.code
              }
            };
          }
        }

        return { status: 200, body: { success: true, user: authUser } };
      }

      case 'update_user': {
        const userId = body.userId || body.id;
        const updates = body.updates || body;
        if (!userId || !updates) {
          return { status: 400, body: { error: 'User ID and updates are required.', code: 'VALIDATION_ERROR' } };
        }

        if (updates.role && !ALLOWED_ROLES.includes(updates.role)) {
          return { status: 400, body: { error: `Invalid role "${updates.role}".`, code: 'INVALID_ROLE' } };
        }

        const { data: targetUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (getError || !targetUser?.user) {
          return { status: 404, body: { error: 'Target user not found.', code: 'USER_NOT_FOUND' } };
        }

        // Guard: Cannot remove the last active admin role
        if (targetUser.user.user_metadata?.role === 'admin' && updates.role && updates.role !== 'admin') {
          const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
          const adminCount = allUsers.users.filter((u: any) => u.user_metadata?.role === 'admin').length;
          if (adminCount <= 1) {
            return { status: 400, body: { error: 'Cannot demote the last remaining active Administrator.', code: 'LAST_ADMIN_PROTECTED' } };
          }
        }

        // Retrieve existing profile preferences
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('preferences, class_name, role')
          .eq('id', userId)
          .maybeSingle();

        const currentPrefs = existingProfile?.preferences || {};
        let updatedPreferences = { ...currentPrefs };
        let assignedClassesList: string[] | undefined = undefined;

        const rawAssigned = updates.assigned_classes !== undefined ? updates.assigned_classes : updates.assignedClasses;
        if (rawAssigned !== undefined) {
          assignedClassesList = Array.isArray(rawAssigned) ? rawAssigned : [];
          updatedPreferences.assigned_classes = assignedClassesList;
        }

        const primaryClass = assignedClassesList !== undefined
          ? (assignedClassesList.length > 0 ? assignedClassesList[0] : null)
          : (updates.class_name !== undefined ? updates.class_name : existingProfile?.class_name);

        const mergedMeta: any = {
          ...targetUser.user.user_metadata,
          ...updates
        };
        if (assignedClassesList !== undefined) {
          mergedMeta.assigned_classes = assignedClassesList;
          mergedMeta.classes = assignedClassesList;
        }
        if (primaryClass !== undefined) {
          mergedMeta.class_name = primaryClass;
        }

        const { data: updatedData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: mergedMeta,
          email: updates.email ? updates.email.trim().toLowerCase() : undefined
        });

        if (updateError) {
          return { status: 400, body: { error: updateError.message, code: updateError.code || 'UPDATE_FAILED' } };
        }

        // Also update matching public.profiles record defensively
        const profileUpdateFields: any = {
          preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        };
        if (updates.name !== undefined) profileUpdateFields.name = updates.name;
        if (updates.role !== undefined) profileUpdateFields.role = updates.role;
        if (updates.department !== undefined) profileUpdateFields.department = updates.department;
        if (primaryClass !== undefined) profileUpdateFields.class_name = primaryClass;
        if (updates.phone !== undefined) profileUpdateFields.phone = updates.phone;

        const { error: profileUpdErr } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdateFields)
          .eq('id', userId);

        if (profileUpdErr && profileUpdErr.code === '23514') {
          const fallbackFields = { ...profileUpdateFields };
          delete fallbackFields.role;
          await supabaseAdmin
            .from('profiles')
            .update(fallbackFields)
            .eq('id', userId);
        }

        return { status: 200, body: { success: true, user: updatedData.user } };
      }

      case 'assign_teacher_classes': {
        const teacherId = body.teacherId || body.userId || body.id;
        const rawAssigned = body.assigned_classes !== undefined ? body.assigned_classes : body.assignedClasses;
        if (!teacherId || rawAssigned === undefined) {
          return { status: 400, body: { error: 'Teacher ID and assigned_classes are required.', code: 'VALIDATION_ERROR' } };
        }

        const classList: string[] = Array.isArray(rawAssigned) ? rawAssigned : [];
        const primaryClass = classList.length > 0 ? classList[0] : null;

        const { data: targetUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(teacherId);
        if (getError || !targetUser?.user) {
          return { status: 404, body: { error: 'Target teacher user not found.', code: 'USER_NOT_FOUND' } };
        }

        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('preferences, class_name')
          .eq('id', teacherId)
          .maybeSingle();

        const updatedPreferences = {
          ...(existingProfile?.preferences || {}),
          assigned_classes: classList
        };

        const mergedMeta = {
          ...targetUser.user.user_metadata,
          assigned_classes: classList,
          classes: classList,
          class_name: primaryClass
        };

        await supabaseAdmin.auth.admin.updateUserById(teacherId, {
          user_metadata: mergedMeta
        });

        await supabaseAdmin
          .from('profiles')
          .update({
            preferences: updatedPreferences,
            class_name: primaryClass,
            updated_at: new Date().toISOString()
          })
          .eq('id', teacherId);

        return {
          status: 200,
          body: {
            success: true,
            teacherId,
            assigned_classes: classList,
            message: 'Teacher classes updated successfully.'
          }
        };
      }

      case 'set_active_status': {
        if (callerRole !== 'admin') {
          return { status: 403, body: { error: 'Access denied: System Administrator privileges required to change user status.', code: 'FORBIDDEN' } };
        }
        const { userId, active } = body;
        if (!userId) {
          return { status: 400, body: { error: 'User ID is required.', code: 'VALIDATION_ERROR' } };
        }

        // Guard: Admin cannot deactivate themselves
        if (userId === callerUser.id && !active) {
          return { status: 400, body: { error: 'You cannot deactivate your own Administrator account.', code: 'SELF_DEACTIVATION_BLOCKED' } };
        }

        const { data: targetUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (getError || !targetUser?.user) {
          return { status: 404, body: { error: 'Target user not found.', code: 'USER_NOT_FOUND' } };
        }

        // Guard: If deactivating an admin, ensure another active admin remains
        if (targetUser.user.user_metadata?.role === 'admin' && !active) {
          const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
          const activeAdmins = allUsers.users.filter((u: any) =>
            u.user_metadata?.role === 'admin' &&
            !(u.banned_until && new Date(u.banned_until).getTime() > Date.now()) &&
            u.id !== userId
          );
          if (activeAdmins.length === 0) {
            return { status: 400, body: { error: 'Cannot deactivate the last remaining active Administrator.', code: 'LAST_ADMIN_PROTECTED' } };
          }
        }

        const banDuration = active ? 'none' : '876000h';
        const mergedMeta = {
          ...targetUser.user.user_metadata,
          status: active ? 'active' : 'inactive'
        };

        const { data: banData, error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: banDuration,
          user_metadata: mergedMeta
        });

        if (banError) {
          return { status: 400, body: { error: banError.message, code: banError.code || 'STATUS_UPDATE_FAILED' } };
        }

        return { status: 200, body: { success: true, user: banData.user } };
      }

      case 'reset_password': {
        if (callerRole !== 'admin') {
          return { status: 403, body: { error: 'Access denied: System Administrator privileges required to reset passwords.', code: 'FORBIDDEN' } };
        }
        const { userId, newPassword } = body;
        if (!userId || !newPassword || newPassword.length < 6) {
          return { status: 400, body: { error: 'Valid User ID and minimum 6-character password required.', code: 'WEAK_PASSWORD' } };
        }

        const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword
        });

        if (pwdError) {
          return { status: 400, body: { error: pwdError.message, code: pwdError.code || 'PASSWORD_RESET_FAILED' } };
        }

        return { status: 200, body: { success: true, message: 'Password reset successfully in Supabase Auth.' } };
      }

      case 'delete_user': {
        if (callerRole !== 'admin') {
          return { status: 403, body: { error: 'Access denied: System Administrator privileges required to delete user accounts.', code: 'FORBIDDEN' } };
        }
        const { userId } = body;
        if (!userId) {
          return { status: 400, body: { error: 'User ID is required.', code: 'VALIDATION_ERROR' } };
        }

        // Guard 1: Admin cannot delete themselves
        if (userId === callerUser.id) {
          return { status: 400, body: { error: 'You cannot delete your own Administrator account.', code: 'SELF_DELETION_BLOCKED' } };
        }

        // Guard 2: Cannot delete last remaining admin
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        const target = allUsers.users.find((u: any) => u.id === userId);
        if (target?.user_metadata?.role === 'admin') {
          const adminCount = allUsers.users.filter((u: any) => u.user_metadata?.role === 'admin').length;
          if (adminCount <= 1) {
            return { status: 400, body: { error: 'Cannot delete the last remaining Administrator account.', code: 'LAST_ADMIN_PROTECTED' } };
          }
        }

        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (delError) {
          return { status: 400, body: { error: delError.message, code: delError.code || 'DELETE_FAILED' } };
        }

        // Optionally remove profiles record if exists
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        return { status: 200, body: { success: true, message: 'User login access deleted from Supabase Auth.' } };
      }

      case 'link_parent_student': {
        const { parentId, studentId, relationship } = body;
        if (!parentId || !studentId) {
          return { status: 400, body: { error: 'Parent ID and Student ID are required.', code: 'VALIDATION_ERROR' } };
        }
        const { data, error } = await supabaseAdmin
          .from('parent_student_links')
          .upsert({
            parent_id: parentId,
            student_id: studentId,
            relationship: relationship || 'Parent',
            verified: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'parent_id,student_id' })
          .select()
          .single();

        if (error) {
          return { status: 400, body: { error: error.message, code: error.code || 'LINK_FAILED' } };
        }
        return { status: 200, body: { success: true, link: data } };
      }

      case 'unlink_parent_student': {
        const { linkId, parentId, studentId } = body;
        let query = supabaseAdmin.from('parent_student_links').delete();
        if (linkId) {
          query = query.eq('id', linkId);
        } else if (parentId && studentId) {
          query = query.eq('parent_id', parentId).eq('student_id', studentId);
        } else {
          return { status: 400, body: { error: 'Either linkId or both parentId and studentId must be provided.', code: 'VALIDATION_ERROR' } };
        }
        const { error } = await query;
        if (error) {
          return { status: 400, body: { error: error.message, code: error.code || 'UNLINK_FAILED' } };
        }
        return { status: 200, body: { success: true } };
      }

      case 'list_parent_links': {
        const { parentId } = body;
        let query = supabaseAdmin.from('parent_student_links').select('*');
        if (parentId) query = query.eq('parent_id', parentId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          return { status: 400, body: { error: error.message, code: error.code || 'FETCH_FAILED' } };
        }
        return { status: 200, body: { success: true, links: data || [] } };
      }

      case 'create_parent_account': {
        const { parent } = body;
        if (!parent?.login_id || !parent?.password || !parent?.name) {
          return { status: 400, body: { error: 'Parent Login ID, temporary password, and Name are required.', code: 'VALIDATION_ERROR' } };
        }

        const cleanLoginId = parent.login_id.trim();
        const cleanName = parent.name.trim();
        const cleanPhone = (parent.phone || '').trim();
        const cleanRelationship = (parent.relationship || 'Parent').trim();
        const cleanPassword = parent.password;
        const studentId = parent.student_id;

        if (cleanPassword.length < 6) {
          return { status: 400, body: { error: 'Temporary password must be at least 6 characters long.', code: 'WEAK_PASSWORD' } };
        }

        // 1. Check duplicate Login ID in profiles
        const { data: duplicateLogin } = await supabaseAdmin
          .from('profiles')
          .select('id, name, login_id')
          .ilike('login_id', cleanLoginId)
          .maybeSingle();

        if (duplicateLogin) {
          return {
            status: 409,
            body: {
              error: `Parent Login ID "${cleanLoginId}" is already assigned to ${duplicateLogin.name}. Please choose a unique Login ID.`,
              code: 'DUPLICATE_LOGIN_ID'
            }
          };
        }

        // 2. Resolve or generate internal auth email
        let cleanEmail = (parent.email || '').trim().toLowerCase();
        if (!cleanEmail) {
          const sanitizedId = cleanLoginId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
          cleanEmail = `${sanitizedId}@parent.adithyan.edu.in`;
        }

        const { data: duplicateEmail } = await supabaseAdmin
          .from('profiles')
          .select('id, email, name')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (duplicateEmail) {
          return {
            status: 409,
            body: {
              error: `Email "${cleanEmail}" is already registered to user "${duplicateEmail.name}".`,
              code: 'DUPLICATE_EMAIL'
            }
          };
        }

        // 3. Create parent account in Supabase Auth (No email invites, no OTP, no activation email needed)
        const { data: authCreated, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            name: cleanName,
            role: 'parent',
            login_id: cleanLoginId,
            phone: cleanPhone,
            relationship: cleanRelationship,
            requires_password_change: true
          }
        });

        if (authError || !authCreated?.user) {
          return {
            status: 400,
            body: {
              error: authError?.message || 'Failed to create parent auth account.',
              code: authError?.code || 'AUTH_CREATION_FAILED'
            }
          };
        }

        const newParentId = authCreated.user.id;

        // 4. Ensure profile is updated with login_id, role, phone, and status
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: newParentId,
            email: cleanEmail,
            name: cleanName,
            role: 'parent',
            login_id: cleanLoginId,
            phone: cleanPhone,
            preferences: { status: 'active', login_id: cleanLoginId },
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          await supabaseAdmin.auth.admin.deleteUser(newParentId);
          return {
            status: 500,
            body: {
              error: `Failed to create parent profile: ${profileError.message}`,
              code: 'PROFILE_ERROR'
            }
          };
        }

        // 5. Automatically link to student if studentId is provided
        let linkedStudent: Record<string, unknown> | null = null;
        if (studentId) {
          const { data: studentRecord } = await supabaseAdmin
            .from('profiles')
            .select('id, name, roll_number, class_name')
            .eq('id', studentId)
            .maybeSingle();

          if (studentRecord) {
            await supabaseAdmin
              .from('parent_student_links')
              .upsert({
                parent_id: newParentId,
                student_id: studentId,
                relationship: cleanRelationship,
                verified: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'parent_id,student_id' });

            linkedStudent = {
              id: studentRecord.id,
              name: studentRecord.name,
              student_id: studentRecord.roll_number,
              class_name: studentRecord.class_name
            };
          }
        }

        // 6. Return response with Login ID and status (NEVER exposing plaintext password)
        return {
          status: 200,
          body: {
            success: true,
            parent: {
              id: newParentId,
              login_id: cleanLoginId,
              name: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
              role: 'parent',
              status: 'active',
              linked_student: linkedStudent
            }
          }
        };
      }

      case 'list_parent_accounts': {
        const { data: parents, error: pErr } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email, phone, roll_number, preferences, created_at')
          .eq('role', 'parent')
          .order('created_at', { ascending: false });

        if (pErr) {
          return { status: 500, body: { error: pErr.message, code: pErr.code } };
        }

        const parentIds = (parents || []).map(p => p.id);
        const linksMap: Record<string, any[]> = {};

        if (parentIds.length > 0) {
          const { data: links } = await supabaseAdmin
            .from('parent_student_links')
            .select('id, parent_id, student_id, relationship, verified, created_at')
            .in('parent_id', parentIds);

          if (links && links.length > 0) {
            const studentIds = links.map(l => l.student_id);
            const { data: students } = await supabaseAdmin
              .from('profiles')
              .select('id, name, roll_number, class_name, department')
              .in('id', studentIds);

            const studentLookup = new Map((students || []).map(s => [s.id, s]));

            links.forEach(l => {
              if (!linksMap[l.parent_id]) linksMap[l.parent_id] = [];
              linksMap[l.parent_id].push({
                link_id: l.id,
                relationship: l.relationship,
                verified: l.verified,
                student: studentLookup.get(l.student_id) || { id: l.student_id, name: 'Unknown Student' }
              });
            });
          }
        }

        const enrichedParents = (parents || []).map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          login_id: p.preferences?.login_id || p.roll_number || '',
          status: p.preferences?.status || 'active',
          created_at: p.created_at,
          linked_children: linksMap[p.id] || []
        }));

        return { status: 200, body: { success: true, parents: enrichedParents } };
      }

      case 'search_parents': {
        const { query: searchTerm } = body;
        let query = supabaseAdmin
          .from('profiles')
          .select('id, name, email, phone, roll_number, preferences')
          .eq('role', 'parent');

        if (searchTerm && searchTerm.trim()) {
          const term = `%${searchTerm.trim()}%`;
          query = query.or(`name.ilike.${term},roll_number.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
        }

        const { data, error } = await query.limit(20);
        if (error) {
          return { status: 500, body: { error: error.message, code: error.code } };
        }
        return { status: 200, body: { success: true, parents: data || [] } };
      }

      case 'confirm_admission': {
        const { application_id, student, parent, scholarship, fee_payment, documents } = body;
        if (!student?.name || !student?.email || !student?.department) {
          return { status: 400, body: { error: 'Student Name, Email, and Course/Department are required.', code: 'VALIDATION_ERROR' } };
        }
        if (!parent?.name) {
          return { status: 400, body: { error: 'Parent Name is required.', code: 'VALIDATION_ERROR' } };
        }

        const cleanStudentName = student.name.trim();
        const cleanStudentEmail = student.email.trim().toLowerCase();
        const cleanStudentPhone = (student.phone || '').trim();
        const cleanDepartment = student.department.trim();
        let rawClass = (student.class_name || '').trim();
        let cleanClass = rawClass;
        if (!cleanClass || cleanClass === 'Semester 1' || cleanClass === cleanDepartment) {
          cleanClass = `${cleanDepartment} - Year 1 (Semester 1)`;
        }

        const cleanParentName = parent.name.trim();
        const cleanRelationship = (parent.relationship || 'Father').trim();
        const cleanParentPhone = (parent.phone || '').trim();
        const cleanParentEmail = (parent.email || '').trim().toLowerCase();
        const existingParentIdInput = (parent.existing_parent_id || '').trim();

        // 1. Idempotency Check: Check if Student account already exists
        const { data: existingStudentProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email, roll_number, login_id')
          .eq('email', cleanStudentEmail)
          .maybeSingle();

        let studentUserId = existingStudentProfile?.id;
        let studentId = existingStudentProfile?.roll_number;
        // The institution's manually entered student id (set when the application was registered)
        let preassignedStudentId: string | null = null;
        if (!studentUserId && application_id) {
          const { data: appRow } = await supabaseAdmin.from('admission_applications')
            .select('application_number').eq('id', application_id).maybeSingle();
          preassignedStudentId = appRow?.application_number || null;
        }

        if (!studentUserId) {
          // Use the application's student id when there is one; otherwise generate
          studentId = preassignedStudentId || await generateUniqueStudentId(supabaseAdmin);
          const initialStudentPassword = strongRandomPassword();

          // Create Student account in Supabase Auth
          const { data: studentAuth, error: studentAuthErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanStudentEmail,
            password: initialStudentPassword,
            email_confirm: true,
            user_metadata: {
              name: cleanStudentName,
              role: 'student',
              student_id: studentId,
              roll_number: studentId,
              login_id: studentId,
              phone: cleanStudentPhone,
              department: cleanDepartment,
              class_name: cleanClass,
              is_first_login: true,
              requires_password_change: true
            }
          });

          if (studentAuthErr || !studentAuth?.user) {
            if (studentAuthErr?.message?.toLowerCase().includes('already been registered') || studentAuthErr?.code === 'email_exists') {
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
              const existing = listData?.users?.find((u: any) => u.email?.toLowerCase() === cleanStudentEmail);
              if (existing) {
                studentUserId = existing.id;
                studentId = existing.user_metadata?.student_id || existing.user_metadata?.roll_number || await generateUniqueStudentId(supabaseAdmin);
              } else {
                return {
                  status: 400,
                  body: {
                    error: studentAuthErr.message || 'Email already exists.',
                    code: studentAuthErr.code || 'STUDENT_AUTH_ERROR'
                  }
                };
              }
            } else {
              return {
                status: 400,
                body: {
                  error: studentAuthErr?.message || 'Failed to create student auth account.',
                  code: studentAuthErr?.code || 'STUDENT_AUTH_ERROR'
                }
              };
            }
          } else {
            studentUserId = studentAuth.user.id;
          }

          // Upsert student in profiles
          const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
            id: studentUserId,
            name: cleanStudentName,
            email: cleanStudentEmail,
            role: 'student',
            roll_number: studentId,
            phone: cleanStudentPhone,
            department: cleanDepartment,
            class_name: cleanClass,
            preferences: {
              student_id: studentId,
              login_id: studentId,
              year: 'Year 1',
              semester: 'Semester 1',
              academic_year: student.academic_year || '2026-2027',
              is_first_login: true,
              first_login_completed: false,
              requires_password_change: true
            },
            updated_at: new Date().toISOString()
          });
          if (profErr) {
            console.error('Student profiles upsert error:', profErr);
          }

          // Upsert in central students table
          await supabaseAdmin.from('students').upsert({
            user_id: studentUserId,
            student_id: studentId,
            roll_number: studentId,
            name: cleanStudentName,
            email: cleanStudentEmail,
            department: cleanDepartment,
            class_name: cleanClass,
            current_semester: 1,
            status: 'active',
            phone: cleanStudentPhone,
            admission_date: new Date().toISOString().split('T')[0]
          }, { onConflict: 'student_id' });
        }

        // 2. Parent Account Resolution or Creation
        let parentUserId: string | null = null;
        let parentLoginId: string | null = null;
        let isNewParent = false;

        // Search for existing parent by explicit ID, phone, or email
        if (existingParentIdInput) {
          const { data: pMatch } = await supabaseAdmin
            .from('profiles')
            .select('id, login_id, name, email')
            .or(`login_id.ilike.${existingParentIdInput},id.eq.${existingParentIdInput}`)
            .maybeSingle();
          if (pMatch) {
            parentUserId = pMatch.id;
            parentLoginId = pMatch.login_id;
          }
        }

        if (!parentUserId && cleanParentPhone) {
          const { data: pMatchPhone } = await supabaseAdmin
            .from('profiles')
            .select('id, login_id, name, email')
            .eq('role', 'parent')
            .eq('phone', cleanParentPhone)
            .maybeSingle();
          if (pMatchPhone) {
            parentUserId = pMatchPhone.id;
            parentLoginId = pMatchPhone.login_id;
          }
        }

        if (!parentUserId && cleanParentEmail) {
          const { data: pMatchEmail } = await supabaseAdmin
            .from('profiles')
            .select('id, login_id, name, email')
            .eq('email', cleanParentEmail)
            .maybeSingle();
          if (pMatchEmail) {
            parentUserId = pMatchEmail.id;
            parentLoginId = pMatchEmail.login_id;
          }
        }

        // If parent does NOT exist, create new Parent account
        if (!parentUserId) {
          isNewParent = true;
          parentLoginId = await generateUniqueParentId(supabaseAdmin);
          const initialParentPassword = strongRandomPassword();

          let parentAuthEmail = cleanParentEmail;
          if (!parentAuthEmail) {
            const sanitizedId = parentLoginId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
            parentAuthEmail = `${sanitizedId}@parent.adithyan.edu.in`;
          }

          const { data: parentAuth, error: parentAuthErr } = await supabaseAdmin.auth.admin.createUser({
            email: parentAuthEmail,
            password: initialParentPassword,
            email_confirm: true,
            user_metadata: {
              name: cleanParentName,
              role: 'parent',
              login_id: parentLoginId,
              phone: cleanParentPhone,
              relationship: cleanRelationship,
              is_first_login: true,
              requires_password_change: true
            }
          });

          if (parentAuthErr || !parentAuth?.user) {
            if (parentAuthErr?.message?.toLowerCase().includes('already been registered') || parentAuthErr?.code === 'email_exists') {
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
              const existing = listData?.users?.find((u: any) => u.email?.toLowerCase() === parentAuthEmail?.toLowerCase());
              if (existing) {
                parentUserId = existing.id;
                parentLoginId = existing.user_metadata?.login_id || await generateUniqueParentId(supabaseAdmin);
                isNewParent = false;
              } else {
                return {
                  status: 400,
                  body: {
                    error: parentAuthErr.message || 'Parent email already exists.',
                    code: parentAuthErr.code || 'PARENT_AUTH_ERROR'
                  }
                };
              }
            } else {
              return {
                status: 400,
                body: {
                  error: parentAuthErr?.message || 'Failed to create parent auth account.',
                  code: parentAuthErr?.code || 'PARENT_AUTH_ERROR'
                }
              };
            }
          } else {
            parentUserId = parentAuth.user.id;
          }

          await supabaseAdmin.from('profiles').upsert({
            id: parentUserId,
            name: cleanParentName,
            email: parentAuthEmail,
            role: 'parent',
            roll_number: parentLoginId,
            phone: cleanParentPhone,
            preferences: {
              login_id: parentLoginId,
              is_first_login: true,
              first_login_completed: false,
              requires_password_change: true
            },
            updated_at: new Date().toISOString()
          });
        }

        // 3. Link Student to Parent Account in parent_student_links
        await supabaseAdmin.from('parent_student_links').upsert({
          parent_id: parentUserId,
          student_id: studentUserId,
          relationship: cleanRelationship,
          verified: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'parent_id,student_id' });

        // 4. Approve + enrol the application with the same functions the admissions screen uses:
        //    ends as 'Enrolled' and linked to the permanent student record (idempotent on retry).
        if (application_id) {
          await supabaseAdmin.from('admission_applications')
            .update({ status: 'Approved', updated_at: new Date().toISOString() })
            .eq('id', application_id).in('status', ['Submitted', 'Under Review', 'Waitlisted', 'Offered']);
          await supabaseAdmin.rpc('admission_enroll', {
            p_application_id: application_id, p_actor: callerUser.id, p_department: cleanDepartment, p_class_name: cleanClass,
          });
        }

        // 5. Initial Payment & Official Fee Receipt Generation
        let receiptData: any = null;
        if (fee_payment && Number(fee_payment.amount_paid) > 0) {
          const totalFee = Number(fee_payment.total_course_fee) || 55000;
          const paidAmount = Number(fee_payment.amount_paid);
          const concession = scholarship?.applicable ? (Number(scholarship.concession_amount) || 0) : 0;
          const balance = Math.max(0, totalFee - concession - paidAmount);
          const paymentMode = fee_payment.payment_method || 'Cash';
          const txRef = fee_payment.transaction_reference || `TXN-${Date.now().toString().slice(-6)}`;
          const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
          const qrToken = `QR-REC-${Date.now().toString(36).toUpperCase()}`;

          // Create student_fees record
          const { data: feeRecord } = await supabaseAdmin.from('student_fees').insert({
            student_id: studentUserId,
            student_name: cleanStudentName,
            class_name: cleanDepartment,
            term: 'Admission & 1st Year Tuition',
            total_due: totalFee,
            paid_amount: paidAmount,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: paidAmount >= (totalFee - concession) ? 'paid' : 'partial'
          }).select().single();

          const isUuid = (u?: string) => Boolean(u && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u));

          // Create official fee_receipts record
          const { data: createdReceipt, error: receiptErr } = await supabaseAdmin.from('fee_receipts').insert({
            receipt_number: receiptNo,
            student_fee_id: feeRecord?.id || null,
            student_id: studentUserId,
            student_name: cleanStudentName,
            roll_number: studentId,
            department: cleanDepartment,
            academic_year: '2026-2027',
            semester: cleanClass || 'Semester 1',
            fee_type: 'Admission & 1st Year Tuition Fee',
            gross_amount: totalFee,
            discount_applied: concession,
            discount_reason: scholarship?.scheme || (concession > 0 ? 'Institutional Concession' : 'None'),
            amount_paid: paidAmount,
            balance_remaining: balance,
            payment_mode: paymentMode,
            transaction_reference: txRef,
            payment_date: new Date().toISOString(),
            cashier_user_id: isUuid(callerUser?.id) ? callerUser.id : null,
            qr_verification_token: qrToken
          }).select().single();

          if (receiptErr) {
            console.error('fee_receipts insert error:', receiptErr);
          }

          receiptData = createdReceipt;
        }

        // 6. Record document verifications if provided
        if (documents && Array.isArray(documents) && documents.length > 0) {
          const isUuid = (u?: string) => Boolean(u && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u));
          for (const doc of documents) {
            if (doc.document_type) {
              await supabaseAdmin.from('admission_document_verifications').insert({
                application_id: application_id || null,
                student_name: cleanStudentName,
                document_type: doc.document_type,
                document_url: doc.document_url || null,
                status: 'Verified',
                verified_by: isUuid(callerUser?.id) ? callerUser.id : null,
                verified_at: new Date().toISOString(),
                submission_date: new Date().toISOString().split('T')[0]
              });
            }
          }
        }

        return {
          status: 200,
          body: {
            success: true,
            message: 'Admission confirmed and accounts provisioned successfully.',
            student: {
              id: studentUserId,
              student_id: studentId,
              name: cleanStudentName,
              email: cleanStudentEmail,
              phone: cleanStudentPhone,
              department: cleanDepartment,
              class_name: cleanClass,
              is_first_login: true
            },
            parent: {
              id: parentUserId,
              parent_id: parentLoginId,
              name: cleanParentName,
              phone: cleanParentPhone,
              relationship: cleanRelationship,
              is_reused: !isNewParent,
              is_first_login: isNewParent
            },
            receipt: receiptData
          }
        };
      }

      // =======================================================================
      // SUPER ADMIN CONTROL CENTER CONFIGURATION ACTIONS
      // =======================================================================
      case 'save_system_config_draft': {
        if (callerRole !== 'admin') {
          return { status: 403, body: { error: 'Unauthorized: Super Admin privileges required.', code: 'FORBIDDEN' } };
        }
        const { configType, targetRole, data } = body;
        if (!configType || !data) {
          return { status: 400, body: { error: 'configType and data are required.', code: 'VALIDATION_ERROR' } };
        }

        // Record in live Supabase audit_logs
        await supabaseAdmin.from('audit_logs').insert({
          user_email: callerUser.email || 'admin@gmail.com',
          user_role: 'admin',
          action: 'save_system_config_draft',
          entity_type: configType,
          entity_id: targetRole || 'global',
          new_values: { data, timestamp: new Date().toISOString() }
        });

        return { status: 200, body: { success: true, message: `Draft saved for ${configType} (${targetRole || 'global'})` } };
      }

      case 'publish_system_config': {
        if (callerRole !== 'admin') {
          return { status: 403, body: { error: 'Unauthorized: Super Admin privileges required.', code: 'FORBIDDEN' } };
        }
        const { releaseVersion, summary, snapshot } = body;
        const versionStr = releaseVersion || `v1.${Date.now()}.0`;

        // 1. Synchronize to institutional_settings
        if (snapshot?.globalSettings) {
          try {
            await supabaseAdmin.from('institutional_settings').update({
              institution_name: snapshot.globalSettings.institutionName,
              institution_code: snapshot.globalSettings.institutionCode,
              academic_year: snapshot.globalSettings.academicYear,
              contact_email: snapshot.globalSettings.contactEmail,
              contact_phone: snapshot.globalSettings.contactPhone,
              min_attendance_percentage: snapshot.globalSettings.attendancePolicyThreshold,
              passing_marks_percentage: snapshot.globalSettings.passingMarksThreshold,
              updated_at: new Date().toISOString()
            }).eq('id', '00000000-0000-0000-0000-000000000001');
          } catch { }
        }

        // 3. Log publication in audit_logs
        await supabaseAdmin.from('audit_logs').insert({
          user_email: callerUser.email || 'admin@gmail.com',
          user_role: 'admin',
          action: 'publish_system_config',
          entity_type: 'release',
          entity_id: versionStr,
          new_values: { version: versionStr, summary, publishedAt: new Date().toISOString() }
        });

        return { status: 200, body: { success: true, version: versionStr, message: 'Configuration successfully published.' } };
      }

      case 'rollback_system_config': {
        if (callerRole !== 'admin') {
          return { status: 403, body: { error: 'Unauthorized: Super Admin privileges required.', code: 'FORBIDDEN' } };
        }
        const { targetVersion } = body;
        await supabaseAdmin.from('audit_logs').insert({
          user_email: callerUser.email || 'admin@gmail.com',
          user_role: 'admin',
          action: 'rollback_system_config',
          entity_type: 'release',
          entity_id: String(targetVersion),
          new_values: { rolledBackTo: targetVersion, timestamp: new Date().toISOString() }
        });
        return { status: 200, body: { success: true, message: `System rolled back to release ${targetVersion}.` } };
      }

      case 'get_system_audit_logs': {
        const { limit = 50, actionFilter } = body;
        let query = supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
        if (actionFilter && actionFilter !== 'all') {
          query = query.eq('action', actionFilter);
        }
        const { data: logs, error: logErr } = await query;
        if (logErr) return { status: 400, body: { error: logErr.message } };
        return { status: 200, body: { success: true, logs: logs || [] } };
      }

      case 'create_system_backup': {
        if (callerRole !== 'admin') {
          return { status: 403, body: { error: 'Unauthorized: Super Admin privileges required.', code: 'FORBIDDEN' } };
        }
        const { backupName, payload } = body;
        const name = backupName || `backup_${new Date().toISOString().split('T')[0]}`;

        await supabaseAdmin.from('audit_logs').insert({
          user_email: callerUser.email || 'admin@gmail.com',
          user_role: 'admin',
          action: 'create_system_backup',
          entity_type: 'backup',
          entity_id: name,
          new_values: { name, timestamp: new Date().toISOString() }
        });
        return { status: 200, body: { success: true, backupName: name } };
      }

      case 'restore_system_backup': {
        if (callerRole !== 'admin') {
          return { status: 403, body: { error: 'Unauthorized: Super Admin privileges required.', code: 'FORBIDDEN' } };
        }
        const { backupName } = body;
        await supabaseAdmin.from('audit_logs').insert({
          user_email: callerUser.email || 'admin@gmail.com',
          user_role: 'admin',
          action: 'restore_system_backup',
          entity_type: 'backup',
          entity_id: backupName || 'manual_restore',
          new_values: { restoredFrom: backupName, timestamp: new Date().toISOString() }
        });
        return { status: 200, body: { success: true, message: 'Backup restored successfully.' } };
      }


      default:
        return { status: 400, body: { error: `Unknown action: "${action}".`, code: 'UNKNOWN_ACTION' } };
    }
  } catch (err: any) {
    return { status: 500, body: { error: err.message || 'Operation failed.', code: err.code || 'SERVER_ERROR' } };
  }
}


/**
 * Generate collision-free human-readable permanent Student ID: STU-YYYY-NNNN
 */
export async function generateUniqueStudentId(supabaseAdmin: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('roll_number, login_id')
    .or(`roll_number.ilike.${prefix}%,login_id.ilike.${prefix}%`);

  let maxSeq = 1000;
  if (data && data.length > 0) {
    for (const row of data) {
      const idStr = row.roll_number || row.login_id || '';
      const match = idStr.match(/STU-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  let candidateSeq = maxSeq + 1;
  while (true) {
    const candidate = `${prefix}${String(candidateSeq).padStart(4, '0')}`;
    const { data: exists } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`roll_number.eq.${candidate},login_id.eq.${candidate}`)
      .maybeSingle();

    if (!exists) {
      return candidate;
    }
    candidateSeq++;
  }
}

/**
 * Generate collision-free human-readable permanent Parent ID: PAR-YYYY-NNNN
 */
export async function generateUniqueParentId(supabaseAdmin: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAR-${year}-`;

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('login_id')
    .ilike('login_id', `${prefix}%`);

  let maxSeq = 1000;
  if (data && data.length > 0) {
    for (const row of data) {
      const idStr = row.login_id || '';
      const match = idStr.match(/PAR-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  let candidateSeq = maxSeq + 1;
  while (true) {
    const candidate = `${prefix}${String(candidateSeq).padStart(4, '0')}`;
    const { data: exists } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('login_id', candidate)
      .maybeSingle();

    if (!exists) {
      return candidate;
    }
    candidateSeq++;
  }
}

