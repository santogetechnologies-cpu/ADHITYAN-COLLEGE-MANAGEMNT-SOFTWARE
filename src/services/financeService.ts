import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface StudentFeeItem {
  id: string;
  student_id: string;
  student_name?: string;
  fee_type: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  receipt_number?: string;
}

export interface FinanceTransactionItem {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  payment_method: string;
  reference_number?: string;
  date: string;
}

export const financeService = {
  async listStudentFees(studentId?: string): Promise<StudentFeeItem[]> {
    try {
      let query = supabase
        .from('student_fees')
        .select('*')
        .order('due_date', { ascending: true });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Join student names
      const { data: students } = await supabase.from('profiles').select('id, name');
      const studentMap = new Map((students || []).map(s => [s.id, s.name]));

      return (data || []).map((f: any) => ({
        id: f.id,
        student_id: f.student_id,
        student_name: studentMap.get(f.student_id) || 'Student Candidate',
        fee_type: f.fee_type || 'Tuition Fee',
        amount: Number(f.amount) || 0,
        paid_amount: Number(f.paid_amount) || (f.status === 'paid' ? Number(f.amount) : 0),
        due_date: f.due_date,
        status: f.status || 'pending',
        receipt_number: f.receipt_number,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch student fees');
    }
  },

  async recordFeePayment(feeId: string, amount: number, paymentMethod: string = 'online'): Promise<void> {
    try {
      const receiptNo = `REC-${Date.now().toString().slice(-6)}`;

      // 1. Update student_fees
      const { data: fee, error: feeErr } = await supabase
        .from('student_fees')
        .update({
          status: 'paid',
          paid_amount: amount,
          receipt_number: receiptNo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId)
        .select()
        .single();

      if (feeErr) throw feeErr;

      // 2. Insert into finance_transactions
      await supabase.from('finance_transactions').insert({
        transaction_type: 'income',
        amount,
        category: fee?.fee_type || 'Tuition Fee',
        description: `Fee payment received for record ${feeId}. Receipt #${receiptNo}`,
        payment_method: paymentMethod,
        reference_number: receiptNo,
      });
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to record fee payment');
    }
  },

  async listTransactions(type?: 'income' | 'expense'): Promise<FinanceTransactionItem[]> {
    try {
      let query = supabase
        .from('finance_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('transaction_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        transaction_type: t.transaction_type,
        amount: Number(t.amount) || 0,
        category: t.category || 'General',
        description: t.description || '',
        payment_method: t.payment_method || 'bank_transfer',
        reference_number: t.reference_number,
        date: t.created_at || new Date().toISOString(),
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to load financial transactions');
    }
  },

  async recordExpense(input: { amount: number; category: string; description: string; payment_method?: string }): Promise<void> {
    try {
      const { error } = await supabase.from('finance_transactions').insert({
        transaction_type: 'expense',
        amount: input.amount,
        category: input.category,
        description: input.description,
        payment_method: input.payment_method || 'petty_cash',
        reference_number: `EXP-${Date.now().toString().slice(-6)}`,
      });

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to record expense');
    }
  },

  async getSummary() {
    try {
      const [txData, feesData] = await Promise.all([
        this.listTransactions(),
        this.listStudentFees(),
      ]);

      const totalIncome = txData
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = txData
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalOutstandingFees = feesData
        .filter(f => f.status !== 'paid')
        .reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);

      return {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        totalOutstandingFees,
        recentTransactions: txData.slice(0, 10),
      };
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to calculate financial summary');
    }
  },
};

export default financeService;

