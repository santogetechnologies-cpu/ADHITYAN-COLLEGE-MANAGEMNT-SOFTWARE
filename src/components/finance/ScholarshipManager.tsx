import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Award, CheckCircle2, XCircle, Clock, FileText, RefreshCw, Loader2, DollarSign } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { ScholarshipMaster, ScholarshipApplication } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';

export function ScholarshipManager() {
  const { toast } = useToast();
  const [scholarships, setScholarships] = useState<ScholarshipMaster[]>([]);
  const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ScholarshipApplication | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scholList, appList] = await Promise.all([
        db.getScholarships(),
        db.getScholarshipApplications(),
      ]);
      setScholarships(scholList);
      setApplications(appList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (appId: string, status: 'Approved' | 'Rejected', amount?: number) => {
    setActionLoading(true);
    try {
      const ok = await db.updateScholarshipStatus(appId, status, amount);
      if (ok) {
        toast({
          title: `Scholarship Application ${status}`,
          description: `The concession has been recorded and updated.`,
        });
        setSelectedApp(null);
        loadData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Scholarships & Fee Concessions Portal</h3>
            <p className="text-xs text-slate-500">Government schemes, Merit waivers, Sports quota, and Institutional fee concessions</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={loadData} className="h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Available Schemes Master Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Recognized Institutional Schemes ({scholarships.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scholarships.map((s) => (
            <Card key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {s.code}
                  </Badge>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                    {s.category}
                  </Badge>
                </div>
                <CardTitle className="text-xs font-bold text-slate-900">{s.scholarship_name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2 text-xs">
                <p className="text-[11px] text-slate-500 leading-snug">{s.eligibility_criteria}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold">
                  <span className="text-slate-600">Benefit:</span>
                  <span className="text-emerald-600 font-extrabold">
                    {s.discount_type === 'Percentage' ? `${s.discount_value}% Tuition Waiver` : `₹${s.discount_value.toLocaleString('en-IN')} Concession`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Student Concession Applications Queue */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Student Concession Applications Queue ({applications.length})
        </h4>

        {loading ? (
          <div className="flex items-center justify-center py-10 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-5 h-5 animate-spin text-[#1D61E7]" />
          </div>
        ) : applications.length === 0 ? (
          <Card className="bg-white text-center py-10">
            <CardContent className="space-y-2">
              <Award className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs text-slate-500">No active scholarship or concession requests in queue.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Candidate</th>
                    <th className="p-3">Scheme Applied</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Requested</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{app.student_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{app.roll_number}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-800">{app.scholarship_name}</td>
                      <td className="p-3 text-slate-600">{app.department}</td>
                      <td className="p-3 font-bold text-slate-900">₹{Number(app.requested_amount).toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <Badge
                          variant={app.status === 'Approved' ? 'default' : app.status === 'Rejected' ? 'destructive' : 'secondary'}
                          className="text-[10px] font-bold"
                        >
                          {app.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        {app.status === 'Submitted' || app.status === 'Verified_Accounts' ? (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                              onClick={() => handleUpdateStatus(app.id, 'Approved', app.requested_amount)}
                              disabled={actionLoading}
                            >
                              Sanction Waiver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 rounded-lg"
                              onClick={() => handleUpdateStatus(app.id, 'Rejected')}
                              disabled={actionLoading}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

