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
export interface AuditRow { id: string; user_email: string; user_role: string | null; action: string; entity_type: string | null; entity_id: string | null; old_values: any; new_values: any; created_at: string }

export const campusOpsService = {
  hostelOccupancy: async (): Promise<HostelRoomView[]> => (await rpc('hostel_occupancy')).rooms ?? [],
  hostelSaveRoom: async (r: { id?: string | null; block: string; floor: number; room: string; capacity: number; type: string; fee: number; status?: string }) =>
    ok(await rpc('hostel_room_save', { p_id: r.id ?? null, p_block: r.block, p_floor: r.floor, p_room: r.room, p_capacity: r.capacity, p_type: r.type, p_fee: r.fee, p_status: r.status ?? 'Available' })),
  hostelAllot: async (student: string, room: string, remarks?: string) => ok(await rpc('hostel_allot', { p_student: student, p_room: room, p_remarks: remarks ?? null })),
  hostelVacate: async (allotment: string) => ok(await rpc('hostel_vacate', { p_allotment: allotment })),
  hostelTransfer: async (student: string, room: string) => ok(await rpc('hostel_transfer', { p_student: student, p_room: room })),

  promotionPreview: async (f: { department?: string; className?: string; semester?: number | null }): Promise<PromotionCandidate[]> =>
    (await rpc('promotion_preview', { p_department: f.department || null, p_class: f.className || null, p_semester: f.semester ?? null })).items ?? [],
  promote: async (ids: string[], action: 'promote' | 'graduate', maxSemester: number, academicYear?: string) =>
    ok(await rpc('students_promote', { p_student_ids: ids, p_action: action, p_max_semester: maxSemester, p_academic_year: academicYear || null })),
  promotionUndo: async (batch: string) => ok(await rpc('students_promotion_undo', { p_batch: batch })),
  promotionHistory: async (): Promise<PromotionBatch[]> => (await rpc('promotion_history')).items ?? [],

  auditSearch: async (f: { query?: string; entity?: string; from?: string; to?: string; limit?: number; offset?: number }): Promise<{ total: number; items: AuditRow[] }> =>
    rpc('audit_log_search', { p_query: f.query || null, p_entity: f.entity || null, p_from: f.from || null, p_to: f.to || null, p_limit: f.limit ?? 100, p_offset: f.offset ?? 0 }),
};
