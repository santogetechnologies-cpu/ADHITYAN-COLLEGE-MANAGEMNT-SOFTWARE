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

const WORKFLOWS_CACHE_KEY = 'adhityan_super_admin_workflows_v2';

class WorkflowEngineService {
  private cache: InstitutionalWorkflow[] | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const stored = localStorage.getItem(WORKFLOWS_CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch {}

    if (!this.cache || this.cache.length === 0) {
      this.cache = DEFAULT_WORKFLOWS;
    }
  }

  async getWorkflows(): Promise<InstitutionalWorkflow[]> {
    if (!this.cache) this.init();
    return [...(this.cache || DEFAULT_WORKFLOWS)];
  }

  async getWorkflowById(id: string): Promise<InstitutionalWorkflow | undefined> {
    const list = await this.getWorkflows();
    return list.find(w => w.id === id);
  }

  async updateWorkflow(updated: InstitutionalWorkflow): Promise<boolean> {
    const list = await this.getWorkflows();
    const index = list.findIndex(w => w.id === updated.id);
    const itemToSave = {
      ...updated,
      version: (updated.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      list[index] = itemToSave;
    } else {
      list.push(itemToSave);
    }

    this.cache = list;
    try {
      localStorage.setItem(WORKFLOWS_CACHE_KEY, JSON.stringify(list));
    } catch {}

    // Record in audit_logs
    try {
      await supabase.from('audit_logs').insert([{
        user_email: 'superadmin@adhityan.edu.in',
        user_role: 'admin',
        action: 'update_workflow_configuration',
        entity_type: 'workflow',
        entity_id: updated.id,
        new_values: { workflow: itemToSave }
      }]);
    } catch {}

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
