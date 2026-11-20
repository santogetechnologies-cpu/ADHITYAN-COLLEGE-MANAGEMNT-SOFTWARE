import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';
import { printDocument } from '@/lib/exportUtils';

export interface CertificateItem {
  id: string;
  student_id: string;
  student_name?: string;
  certificate_type: 'Degree' | 'Bonafide' | 'Transfer' | 'Merit' | 'Course_Completion';
  certificate_number: string;
  issue_date: string;
  status: 'active' | 'revoked';
}

export const certificateService = {
  async listCertificates(): Promise<CertificateItem[]> {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('issue_date', { ascending: false });

      if (error) throw error;

      const { data: students } = await supabase.from('profiles').select('id, name');
      const studentMap = new Map((students || []).map(s => [s.id, s.name]));

      return (data || []).map((c: any) => ({
        id: c.id,
        student_id: c.student_id,
        student_name: studentMap.get(c.student_id) || 'Student Graduate',
        certificate_type: c.certificate_type,
        certificate_number: c.certificate_number,
        issue_date: c.issue_date,
        status: c.status || 'active',
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch issued certificates');
    }
  },

  async issueCertificate(input: {
    student_id: string;
    certificate_type: string;
  }): Promise<CertificateItem> {
    try {
      const uniqueCertNo = `AGI-${input.certificate_type.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase
        .from('certificates')
        .insert({
          student_id: input.student_id,
          certificate_type: input.certificate_type,
          certificate_number: uniqueCertNo,
          issue_date: new Date().toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to issue certificate');
    }
  },

  printCertificate(cert: { student_name: string; certificate_type: string; certificate_number: string; issue_date: string }): void {
    const certHtml = `
      <div style="border: 8px double #1e3a8a; padding: 40px; text-align: center; background: #fafafa; border-radius: 8px; margin-top: 20px;">
        <h1 style="color: #1e3a8a; font-size: 28px; margin-bottom: 8px;">CERTIFICATE OF ${cert.certificate_type.toUpperCase().replace(/_/g, ' ')}</h1>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">This document certifies that</p>
        <h2 style="font-size: 32px; color: #111; margin: 16px 0; font-family: Georgia, serif;">${cert.student_name}</h2>
        <p style="font-size: 16px; line-height: 1.8; color: #334155; max-width: 650px; margin: 0 auto;">
          has successfully fulfilled the prescribed institutional requirements and curriculum standards under the regulations of the College Academic Council.
        </p>
        <div style="display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px;">
          <div style="text-align: center;">
            <div style="border-top: 1px solid #94a3b8; width: 160px; margin-bottom: 4px;"></div>
            <span style="font-size: 12px; color: #64748b;">Academic Dean</span>
          </div>
          <div style="text-align: center;">
            <div style="border-top: 1px solid #94a3b8; width: 160px; margin-bottom: 4px;"></div>
            <span style="font-size: 12px; color: #64748b;">Principal & Director</span>
          </div>
        </div>
        <div style="margin-top: 30px; font-size: 11px; color: #94a3b8; font-family: monospace;">
          Certificate Ref: ${cert.certificate_number} • Date Issued: ${cert.issue_date}
        </div>
      </div>
    `;
    printDocument(`Official ${cert.certificate_type} Certificate`, certHtml);
  },
};

export default certificateService;

