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

  promotionPreview: async (f: { department?: string; className?: string; semester?: number | null }): Promise<PromotionCandidate[]> =>
    (await rpc('promotion_preview', { p_department: f.department || null, p_class: f.className || null, p_semester: f.semester ?? null })).items ?? [],
  promote: async (ids: string[], action: 'promote' | 'graduate', maxSemester: number, academicYear?: string) =>
    ok(await rpc('students_promote', { p_student_ids: ids, p_action: action, p_max_semester: maxSemester, p_academic_year: academicYear || null })),
  promotionUndo: async (batch: string) => ok(await rpc('students_promotion_undo', { p_batch: batch })),
  promotionHistory: async (): Promise<PromotionBatch[]> => (await rpc('promotion_history')).items ?? [],

  auditSearch: async (f: { query?: string; entity?: string; from?: string; to?: string; limit?: number; offset?: number }): Promise<{ total: number; items: AuditRow[] }> =>
    rpc('audit_log_search', { p_query: f.query || null, p_entity: f.entity || null, p_from: f.from || null, p_to: f.to || null, p_limit: f.limit ?? 100, p_offset: f.offset ?? 0 }),
};
