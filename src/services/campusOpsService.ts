import { supabase } from '@/lib/supabase';

const sb: any = supabase;

async function rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

/** Throws with the server's plain-language message when a write was refused. */
function ok(res: any): any {
  if (res && res.success === false) throw new Error(res.error || 'The action was refused.');
  return res;
}

export interface HostelOccupant { allotment_id: string; student_id: string; name: string; roll: string | null; since: string }
export interface HostelRoomView { id: string; block: string; floor: number; room: string; capacity: number; occupancy: number; type: string; annual_fee: number; status: string; occupants: HostelOccupant[] }
export interface PromotionCandidate { id: string; student_id: string; name: string; department: string | null; class_name: string | null; semester: number; dues: number; arrear_subjects: number }
export interface PromotionBatch { batch_id: string; action: 'promote' | 'graduate'; count: number; academic_year: string | null; at: string; undone: boolean }
export interface TransportStopView { id: string; name: string; time: string; order: number; riders: number }
export interface TransportRider { student_id: string; name: string; class_name: string | null; stop: string }
export interface TransportVehicleView { id: string; vehicle_number: string; route_name: string; driver_name: string; driver_phone: string | null; driver_id: string | null; capacity: number; status: string; riders: number; stops: TransportStopView[]; roster: TransportRider[] }
export interface LifecycleEvent { id: string; student_id: string; name: string; code: string; event: 'discontinued' | 'reinstated' | 'transferred'; type: string | null; reason: string; effective: string; from_class: string | null; to_class: string | null; from_department: string | null; to_department: string | null; dues: number; at: string }
export interface StudentHit { id: string; name: string; student_id: string; class_name: string | null; department: string | null; status: string }
export interface StaffHit { id: string; name: string; role: string; department: string | null; email: string }
export interface LeaveRow { id: string; student_id: string; leave_type: string; from_date: string; to_date: string; reason: string; status: string; decision_note: string | null; created_at: string; student?: { name: string; class_name: string | null } | null }
export interface ChannelStatus { allowed: boolean; settings: { email: boolean; sms: boolean; whatsapp: boolean; auto_reminders: boolean; reminder_days: number }; providers: Record<string, { provider: string; enabled: boolean }>; counts: Record<string, number>; recent_failures: { channel: string; to: string; error: string | null; at: string }[]; scheduler: boolean }
export interface AuditRow { id: string; user_email: string; user_role: string | null; action: string; entity_type: string | null; entity_id: string | null; old_values: any; new_values: any; created_at: string }

export const campusOpsService = {
  hostelOccupancy: async (): Promise<HostelRoomView[]> => (await rpc('hostel_occupancy')).rooms ?? [],
  hostelSaveRoom: async (r: { id?: string | null; block: string; floor: number; room: string; capacity: number; type: string; fee: number; status?: string }) =>
    ok(await rpc('hostel_room_save', { p_id: r.id ?? null, p_block: r.block, p_floor: r.floor, p_room: r.room, p_capacity: r.capacity, p_type: r.type, p_fee: r.fee, p_status: r.status ?? 'Available' })),
  hostelAllot: async (student: string, room: string, remarks?: string) => ok(await rpc('hostel_allot', { p_student: student, p_room: room, p_remarks: remarks ?? null })),
  hostelVacate: async (allotment: string) => ok(await rpc('hostel_vacate', { p_allotment: allotment })),
  hostelTransfer: async (student: string, room: string) => ok(await rpc('hostel_transfer', { p_student: student, p_room: room })),

  transportOverview: async (): Promise<TransportVehicleView[]> => (await rpc('transport_overview')).vehicles ?? [],
  transportAssign: async (student: string, vehicle: string, stop: string) => ok(await rpc('transport_assign', { p_student: student, p_vehicle: vehicle, p_stop: stop })),
  transportUnassign: async (student: string) => ok(await rpc('transport_unassign', { p_student: student })),
  transportStartDay: async (vehicle: string) => ok(await rpc('transport_generate_day_logs', { p_vehicle: vehicle })),
  async transportSaveVehicle(v: { id?: string | null; vehicle_number: string; route_name: string; driver_name: string; driver_phone?: string; capacity: number; status: string }) {
    if (!v.vehicle_number.trim() || !v.route_name.trim() || !v.driver_name.trim() || !(v.capacity >= 1)) throw new Error('Vehicle number, route, driver name and at least 1 seat are required.');
    const row = { vehicle_number: v.vehicle_number.trim(), route_name: v.route_name.trim(), driver_name: v.driver_name.trim(), driver_phone: v.driver_phone?.trim() || null, capacity: v.capacity, status: v.status };
    const q = v.id ? sb.from('transport_vehicles').update(row).eq('id', v.id) : sb.from('transport_vehicles').insert(row);
    const { error } = await q;
    if (error) throw new Error(error.code === '23505' ? 'A vehicle with that number already exists.' : error.message);
  },
  async transportSaveStop(s: { id?: string | null; vehicle_id: string; stop_name: string; scheduled_time: string; stop_order: number }) {
    if (!s.stop_name.trim() || !s.scheduled_time.trim()) throw new Error('Stop name and time are required.');
    const row = { vehicle_id: s.vehicle_id, stop_name: s.stop_name.trim(), scheduled_time: s.scheduled_time.trim(), stop_order: s.stop_order };
    const { error } = await (s.id ? sb.from('transport_stops').update(row).eq('id', s.id) : sb.from('transport_stops').insert(row));
    if (error) throw new Error(error.message);
  },
  async transportDeleteStop(id: string) {
    const { error } = await sb.from('transport_stops').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  lifecycleHistory: async (student?: string): Promise<LifecycleEvent[]> => (await rpc('student_lifecycle_history', { p_student: student ?? null })).items ?? [],
  discontinue: async (student: string, type: string, reason: string, effective: string, force: boolean) => {
    const res = await rpc('student_discontinue', { p_student: student, p_type: type, p_reason: reason, p_effective: effective || null, p_force: force });
    if (res?.code === 'DUES_PENDING') { const e: any = new Error(res.error); e.code = 'DUES_PENDING'; e.dues = res.dues; throw e; }
    return ok(res);
  },
  reinstate: async (student: string, reason: string) => ok(await rpc('student_reinstate', { p_student: student, p_reason: reason })),
  transfer: async (student: string, department: string, className: string, reason: string, semester?: number | null) =>
    ok(await rpc('student_transfer', { p_student: student, p_department: department || null, p_class: className || null, p_reason: reason, p_semester: semester ?? null })),

  leaveApply: async (type: string, from: string, to: string, reason: string) => ok(await rpc('student_leave_apply', { p_type: type, p_from: from, p_to: to, p_reason: reason })),
  leaveCancel: async (id: string) => ok(await rpc('student_leave_cancel', { p_id: id })),
  leaveDecide: async (id: string, decision: 'Approve' | 'Reject', note?: string) => ok(await rpc('student_leave_decide', { p_id: id, p_decision: decision, p_note: note ?? null })),
  async leaveList(): Promise<LeaveRow[]> {
    const { data, error } = await sb.from('student_leave_requests').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    const rows: LeaveRow[] = data || [];
    const ids = [...new Set(rows.map(r => r.student_id))];
    if (ids.length) {
      const { data: ps } = await sb.from('profiles').select('id,name,class_name').in('id', ids);
      const m = new Map((ps || []).map((p: any) => [p.id, p]));
      rows.forEach(r => { r.student = (m.get(r.student_id) as any) ?? null; });
    }
    return rows;
  },

  announce: async (a: { title: string; message: string; category: string; priority: string; audience: string; className?: string; department?: string }) =>
    ok(await rpc('announcement_publish', { p_title: a.title, p_message: a.message, p_category: a.category, p_priority: a.priority, p_audience: a.audience, p_class: a.className?.trim() || null, p_department: a.department?.trim() || null })),
  async announcements(): Promise<any[]> {
    const { data, error } = await sb.from('institutional_broadcasts').select('*').order('published_at', { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return data || [];
  },
  sendFeeReminders: async (daysAhead = 7): Promise<{ sent: number; skipped: number }> => ok(await rpc('fee_send_reminders', { p_days_ahead: daysAhead })),
  globalSearch: async (q: string): Promise<{ students: StudentHit[]; staff: StaffHit[] }> => {
    const r = await rpc('global_search', { p_query: q });
    return { students: r?.students ?? [], staff: r?.staff ?? [] };
  },
  exportDataset: async (name: string): Promise<Record<string, any>[]> => ok(await rpc('export_dataset', { p_name: name })).rows ?? [],

  channelStatus: async (): Promise<ChannelStatus | null> => { const r = await rpc('notification_channel_status'); return r?.allowed ? r : null; },
  saveChannelSettings: async (c: { email: boolean; sms: boolean; whatsapp: boolean; autoReminders: boolean; reminderDays: number }) =>
    ok(await rpc('notification_settings_set', { p_email: c.email, p_sms: c.sms, p_whatsapp: c.whatsapp, p_auto_reminders: c.autoReminders, p_reminder_days: c.reminderDays })),
  retryFailedMessages: async (): Promise<{ requeued: number }> => ok(await rpc('outbox_retry_failed')),
  async leaveForStudents(studentIds: string[]): Promise<LeaveRow[]> {
    if (!studentIds.length) return [];
    const { data, error } = await sb.from('student_leave_requests').select('*').in('student_id', studentIds).order('from_date', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data || [];
  },

  promotionPreview: async (f: { department?: string; className?: string; semester?: number | null }): Promise<PromotionCandidate[]> =>
    (await rpc('promotion_preview', { p_department: f.department || null, p_class: f.className || null, p_semester: f.semester ?? null })).items ?? [],
  promote: async (ids: string[], action: 'promote' | 'graduate', maxSemester: number, academicYear?: string) =>
    ok(await rpc('students_promote', { p_student_ids: ids, p_action: action, p_max_semester: maxSemester, p_academic_year: academicYear || null })),
  promotionUndo: async (batch: string) => ok(await rpc('students_promotion_undo', { p_batch: batch })),
  promotionHistory: async (): Promise<PromotionBatch[]> => (await rpc('promotion_history')).items ?? [],

  auditSearch: async (f: { query?: string; entity?: string; from?: string; to?: string; limit?: number; offset?: number }): Promise<{ total: number; items: AuditRow[] }> =>
    rpc('audit_log_search', { p_query: f.query || null, p_entity: f.entity || null, p_from: f.from || null, p_to: f.to || null, p_limit: f.limit ?? 100, p_offset: f.offset ?? 0 }),
};
