import { supabase } from '@/lib/supabase';
import { UserRole } from '@/context/AuthContext';

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface WorkflowStage {
  id: string;
  name: string;
  order: number;
  responsibleRoles: UserRole[];
  requiredApprovals: number;
  conditions?: WorkflowCondition[];
  allowedActions: ('approve' | 'reject' | 'return_for_edit' | 'escalate')[];
  rejectionBehavior: 'terminate' | 'return_to_previous' | 'return_to_initiator';
  targetStatusOnApproval: string;
  targetStatusOnRejection: string;
  sendNotificationOnEntry: boolean;
  notificationTemplate?: string;
}

export interface InstitutionalWorkflow {
  id: string;
  name: string;
  description: string;
  category: 'Admissions' | 'Finance' | 'Academics' | 'Human Resources' | 'Student Affairs';
  isActive: boolean;
  initiatorRoles: UserRole[];
  entityTable: string;
  stages: WorkflowStage[];
  version: number;
  updatedAt: string;
}

const DEFAULT_WORKFLOWS: InstitutionalWorkflow[] = [
  {
    id: 'wf_student_admission',
    name: 'Student Admission & Enrollment',
    description: 'Multi-stage scrutiny from online application through document verification to principal sanction and student provisioning.',
    category: 'Admissions',
    isActive: true,
    initiatorRoles: ['student', 'parent', 'receptionist', 'admin'],
    entityTable: 'admission_applications',
    version: 1,
    updatedAt: new Date().toISOString(),
    stages: [
      {
        id: 'stage_doc_verification',
        name: 'Document & Eligibility Verification',
        order: 1,
        responsibleRoles: ['receptionist', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve', 'reject', 'return_for_edit'],
        rejectionBehavior: 'return_to_initiator',
        targetStatusOnApproval: 'verified',
        targetStatusOnRejection: 'rejected',
        sendNotificationOnEntry: true,
        notificationTemplate: 'Your application documents are under verification by the admissions office.'
      },
      {
        id: 'stage_merit_sanction',
        name: 'Principal Merit Sanction & Seat Allocation',
        order: 2,
        responsibleRoles: ['principal', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve', 'reject', 'escalate'],
        rejectionBehavior: 'terminate',
        targetStatusOnApproval: 'approved',
        targetStatusOnRejection: 'waitlisted',
        sendNotificationOnEntry: true,
        notificationTemplate: 'Your admission has received institutional sanction from the Principal.'
      },
      {
        id: 'stage_fee_payment',
        name: 'Fee Payment & Account Provisioning',
        order: 3,
        responsibleRoles: ['finance_manager', 'accountant', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve'],
        rejectionBehavior: 'return_to_previous',
        targetStatusOnApproval: 'enrolled',
        targetStatusOnRejection: 'payment_pending',
        sendNotificationOnEntry: true,
        notificationTemplate: 'Admission fees received. Student profile and portal account generated.'
      }
    ]
  },
  {
    id: 'wf_leave_approval',
    name: 'Staff & Faculty Leave Approval',
    description: 'Leave request processing across Department HODs, HR, and Principal sanction.',
    category: 'Human Resources',
    isActive: true,
    initiatorRoles: ['teacher', 'hr_manager', 'store_manager', 'transport_driver'],
    entityTable: 'staff_leave_applications',
    version: 1,
    updatedAt: new Date().toISOString(),
    stages: [
      {
        id: 'stage_hod_recommendation',
        name: 'Department Head (HOD) Endorsement',
        order: 1,
        responsibleRoles: ['hod', 'principal', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve', 'reject'],
        rejectionBehavior: 'terminate',
        targetStatusOnApproval: 'recommended',
        targetStatusOnRejection: 'rejected',
        sendNotificationOnEntry: true
      },
      {
        id: 'stage_principal_leave_sanction',
        name: 'Principal Final Authorization',
        order: 2,
        responsibleRoles: ['principal', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve', 'reject'],
        rejectionBehavior: 'terminate',
        targetStatusOnApproval: 'approved',
        targetStatusOnRejection: 'rejected',
        sendNotificationOnEntry: true
      }
    ]
  },
  {
    id: 'wf_fee_waiver_refund',
    name: 'Fee Waiver, Concession & Refund',
    description: 'Financial adjustment governance ensuring two-level verification for fee discounts or student refunds.',
    category: 'Finance',
    isActive: true,
    initiatorRoles: ['finance_manager', 'accountant', 'admin'],
    entityTable: 'fee_structures',
    version: 1,
    updatedAt: new Date().toISOString(),
    stages: [
      {
        id: 'stage_finance_audit',
        name: 'Accounts Scrutiny & Ledger Audit',
        order: 1,
        responsibleRoles: ['finance_manager', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve', 'reject'],
        rejectionBehavior: 'return_to_initiator',
        targetStatusOnApproval: 'verified_by_finance',
        targetStatusOnRejection: 'rejected',
        sendNotificationOnEntry: false
      },
      {
        id: 'stage_principal_financial_sanction',
        name: 'Executive Sanction by Principal',
        order: 2,
        responsibleRoles: ['principal', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve', 'reject'],
        rejectionBehavior: 'terminate',
        targetStatusOnApproval: 'concession_approved',
        targetStatusOnRejection: 'rejected',
        sendNotificationOnEntry: true
      }
    ]
  },
  {
    id: 'wf_exam_marks_moderation',
    name: 'Exam Marks Moderation & Result Publishing',
    description: 'Three-tier verification for internal assessments, university examinations, and semester mark sheets.',
    category: 'Academics',
    isActive: true,
    initiatorRoles: ['teacher', 'admin'],
    entityTable: 'exam_results',
    version: 1,
    updatedAt: new Date().toISOString(),
    stages: [
      {
        id: 'stage_hod_marks_review',
        name: 'HOD Department Review',
        order: 1,
        responsibleRoles: ['hod', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve', 'return_for_edit'],
        rejectionBehavior: 'return_to_initiator',
        targetStatusOnApproval: 'hod_verified',
        targetStatusOnRejection: 'revision_requested',
        sendNotificationOnEntry: false
      },
      {
        id: 'stage_coe_validation',
        name: 'Controller of Examinations (COE) Moderation',
        order: 2,
        responsibleRoles: ['coe', 'principal', 'admin'],
        requiredApprovals: 1,
        allowedActions: ['approve', 'reject'],
        rejectionBehavior: 'return_to_previous',
        targetStatusOnApproval: 'published',
        targetStatusOnRejection: 'withheld',
        sendNotificationOnEntry: true
      }
    ]
  }
];

const SETTING_KEY = 'workflows';
const CACHE_TTL_MS = 15_000;

/**
 * Workflow DEFINITIONS (stages, responsible roles, ...). Stored in the shared, versioned table app_settings
 * (key 'workflows') so every administrator and device sees the same definitions; each save is a new release in
 * app_setting_versions with the acting administrator recorded. (They used to live in each browser's localStorage.)
 *
 * NOTE: nothing in the application enforces these definitions yet; the admissions flow, for example, is driven by
 * migration 037/042. They are configuration for a future approval engine, not a running engine.
 */
class WorkflowEngineService {
  private cache: InstitutionalWorkflow[] | null = null;
  private loadedAt = 0;

  private async load(force = false): Promise<InstitutionalWorkflow[]> {
    if (!force && this.cache && Date.now() - this.loadedAt < CACHE_TTL_MS) return this.cache;
    try {
      const { data, error } = await supabase.from('app_settings' as any).select('value').eq('key', SETTING_KEY).maybeSingle();
      if (error) throw error;
      const items = (data as any)?.value?.items;
      this.cache = Array.isArray(items) && items.length > 0 ? items : DEFAULT_WORKFLOWS;
      this.loadedAt = Date.now();
    } catch (err) {
      console.warn('Could not load workflow definitions; using the last known ones:', err);
      if (!this.cache) this.cache = DEFAULT_WORKFLOWS;
    }
    return this.cache as InstitutionalWorkflow[];
  }

  async getWorkflows(): Promise<InstitutionalWorkflow[]> {
    return [...(await this.load())];
  }

  async getWorkflowById(id: string): Promise<InstitutionalWorkflow | undefined> {
    const list = await this.getWorkflows();
    return list.find(w => w.id === id);
  }

  async updateWorkflow(updated: InstitutionalWorkflow): Promise<boolean> {
    // reload first so two administrators editing different workflows do not overwrite each other's work
    const list = [...(await this.load(true))];
    const index = list.findIndex(w => w.id === updated.id);
    const itemToSave = {
      ...updated,
      version: (updated.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };
    if (index >= 0) list[index] = itemToSave; else list.push(itemToSave);

    const { error } = await supabase.rpc('app_settings_publish' as any, {
      p_key: SETTING_KEY, p_value: { items: list } as any, p_summary: `Workflow "${updated.name}" updated`
    });
    if (error) {
      console.warn('Workflow definition was not saved:', error.message);
      return false;                       // the screen reports the failure; nothing is shown as saved locally
    }
    this.cache = list;
    this.loadedAt = Date.now();
    window.dispatchEvent(new CustomEvent('workflow_config_updated', { detail: { workflowId: updated.id } }));
    return true;
  }

  async toggleWorkflowStatus(id: string, isActive: boolean): Promise<boolean> {
    const wf = await this.getWorkflowById(id);
    if (!wf) return false;
    return this.updateWorkflow({ ...wf, isActive });
  }

  canRolePerformAction(
    workflow: InstitutionalWorkflow,
    stageOrder: number,
    role: UserRole,
    action: 'approve' | 'reject' | 'return_for_edit' | 'escalate'
  ): boolean {
    if (role === 'platform_super_admin' || role === 'admin') return true;
    const stage = workflow.stages.find(s => s.order === stageOrder);
    if (!stage) return false;
    const isRoleResponsible = stage.responsibleRoles.includes(role);
    const isActionAllowed = stage.allowedActions.includes(action);
    return isRoleResponsible && isActionAllowed;
  }
}

export const workflowEngineService = new WorkflowEngineService();
