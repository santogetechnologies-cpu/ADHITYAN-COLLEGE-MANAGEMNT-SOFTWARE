import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Download, 
  Clock, 
  User, 
  ChevronRight, 
  ChevronDown, 
  ShieldCheck,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
}

export function AuditMonitoringView() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Failed to query audit_logs:', error);
      }
      setLogs(data || []);
    } catch {
      toast.error('Failed to load audit logs from database');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = search.toLowerCase();
    return (
      (log.user_email || '').toLowerCase().includes(term) ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.entity_type || '').toLowerCase().includes(term) ||
      (log.entity_id || '').toLowerCase().includes(term)
    );
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No audit records to export');
      return;
    }

    const headers = ['Timestamp', 'User Email', 'Role', 'Action', 'Entity Type', 'Entity ID'];
    const rows = filteredLogs.map(l => [
      l.created_at,
      l.user_email || 'N/A',
      l.user_role || 'N/A',
      l.action,
      l.entity_type || 'N/A',
      l.entity_id || 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `adhityan_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit log CSV exported successfully');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Institutional Audit Logs & Security Monitoring
            </h2>
            <p className="text-xs text-slate-500">
              Immutable ledger of configuration releases, role changes, credential resets, and administrative operations recorded directly in Supabase.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 text-xs text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-500" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAuditLogs}
              className="h-8 text-xs text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by user, action, entity..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Action Type:</span>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recorded Actions</SelectItem>
                <SelectItem value="publish_configuration">publish_configuration</SelectItem>
                <SelectItem value="save_draft">save_draft</SelectItem>
                <SelectItem value="update_user">update_user</SelectItem>
                <SelectItem value="reset_password">reset_password</SelectItem>
                <SelectItem value="create_course">create_course</SelectItem>
                <SelectItem value="delete_course">delete_course</SelectItem>
                <SelectItem value="update_workflow_configuration">update_workflow_configuration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Operator</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Querying audit records from Supabase...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isExpanded = expandedRowId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                        className="hover:bg-slate-50/80 cursor-pointer"
                      >
                        <td className="p-3 text-slate-400">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{log.user_email || 'system'}</div>
                          <div className="text-[10px] text-slate-400 uppercase">{log.user_role || 'admin'}</div>
                        </td>
                        <td className="p-3">
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[10px]">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {log.entity_type || '—'}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {log.entity_id || '—'}
                        </td>
                      </tr>

                      {/* Expandable JSON details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="p-4 border-t border-b border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Previous Values (old_values):</span>
                                <pre className="bg-white p-2.5 rounded border border-slate-200 text-[11px] overflow-x-auto max-h-48 text-slate-600">
                                  {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'null (Initial Creation)'}
                                </pre>
                              </div>
                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Mutated Values (new_values):</span>
                                <pre className="bg-white p-2.5 rounded border border-slate-200 text-[11px] overflow-x-auto max-h-48 text-indigo-900">
                                  {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
