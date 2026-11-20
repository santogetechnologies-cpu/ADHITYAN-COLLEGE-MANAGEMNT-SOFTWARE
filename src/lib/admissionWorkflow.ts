/**
 * Admission pipeline rules shown in the UI. They MIRROR the server-side rules in
 * supabase/migrations/037_admissions_lifecycle.sql (admission_set_status / admission_enroll).
 * The database is the authority: if these ever drift, the server refuses the change and the UI
 * shows its message. Keep both in sync.
 */
export type AdmissionStatus =
  | 'Submitted' | 'Under Review' | 'Approved' | 'Waitlisted' | 'Offered' | 'Enrolled' | 'Rejected' | 'Cancelled';

export interface AdmissionAction {
  id: string;
  label: string;
  /** target status (omitted for enrolment) */
  to?: AdmissionStatus;
  /** creates/links the permanent student record instead of just changing status */
  enroll?: boolean;
  /** the server refuses Rejected/Cancelled without a reason */
  reasonRequired?: boolean;
  tone: 'primary' | 'neutral' | 'danger';
  /** confirmation text shown before running (consequential actions) */
  confirm?: string;
}

const approve: AdmissionAction = { id: 'approve', label: 'Approve', to: 'Approved', tone: 'primary' };
const reject: AdmissionAction = { id: 'reject', label: 'Reject', to: 'Rejected', reasonRequired: true, tone: 'danger' };
const cancel: AdmissionAction = { id: 'cancel', label: 'Cancel admission', to: 'Cancelled', reasonRequired: true, tone: 'danger' };
const enroll: AdmissionAction = {
  id: 'enroll', label: 'Enroll student', enroll: true, tone: 'primary',
  confirm: 'This creates the permanent student record using the application\'s student ID. A portal login is created separately.',
};

export const ADMISSION_ACTIONS: Record<AdmissionStatus, AdmissionAction[]> = {
  Submitted: [{ id: 'review', label: 'Start review', to: 'Under Review', tone: 'primary' }, reject],
  'Under Review': [approve, { id: 'waitlist', label: 'Waitlist', to: 'Waitlisted', tone: 'neutral' }, reject],
  Waitlisted: [approve, reject],
  Approved: [enroll, { id: 'offer', label: 'Send offer', to: 'Offered', tone: 'neutral' }, cancel],
  Offered: [enroll, cancel],
  Rejected: [{ id: 'reopen', label: 'Reopen for review', to: 'Under Review', tone: 'neutral' }],
  Enrolled: [],
  Cancelled: [],
};

export function actionsFor(status: string): AdmissionAction[] {
  return ADMISSION_ACTIONS[status as AdmissionStatus] ?? [];
}

export const PENDING_STATUSES: AdmissionStatus[] = ['Submitted', 'Under Review', 'Waitlisted'];
export const AWAITING_ENROLMENT: AdmissionStatus[] = ['Approved', 'Offered'];

export const STATUS_STYLE: Record<AdmissionStatus, string> = {
  Submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  'Under Review': 'bg-amber-100 text-amber-800 border-amber-200',
  Waitlisted: 'bg-orange-100 text-orange-800 border-orange-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Offered: 'bg-sky-100 text-sky-800 border-sky-200',
  Enrolled: 'bg-emerald-600 text-white border-emerald-700',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  Cancelled: 'bg-zinc-200 text-zinc-700 border-zinc-300',
};
