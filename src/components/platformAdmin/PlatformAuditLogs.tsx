import React, { useState, useEffect } from 'react';
import { useCollege } from '@/context/CollegeContext';
import { multiCollegeService } from '@/services/multiCollegeService';
import { PlatformAuditLog, College } from '@/types/multiCollege.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  ShieldAlert,
  Clock,
  Building2,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight
} from 'lucide-react';

export function PlatformAuditLogs() {
  const { collegesList } = useCollege();
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');
  const [inspectedLog, setInspectedLog] = useState<PlatformAuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await multiCollegeService.listPlatformAuditLogs({ limit: 200 });
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch platform audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (selectedCollegeFilter !== 'ALL') {
      if (log.college_code?.toUpperCase() !== selectedCollegeFilter.toUpperCase() &&
          log.college_id !== selectedCollegeFilter) {
        return false;
      }
    }

    if (selectedActionFilter !== 'ALL') {
      if (!log.action.toLowerCase().includes(selectedActionFilter.toLowerCase())) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = log.super_admin_email.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      const matchEntity = (log.entity_type || '').toLowerCase().includes(q) || (log.entity_id || '').toLowerCase().includes(q);
      const matchCollege = (log.college_code || '').toLowerCase().includes(q);
      return matchEmail || matchAction || matchEntity || matchCollege;
    }

    return true;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('provision')) {
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-mono text-[11px]">{action}</Badge>;
    }
    if (action.includes('publish')) {
      return <Badge className="bg-indigo-500/10 text-indigo-700 border-indigo-300 font-mono text-[11px]">{action}</Badge>;
    }
    if (action.includes('status') || action.includes('suspend') || action.includes('deactivate')) {
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 font-mono text-[11px]">{action}</Badge>;
    }
    if (action.includes('delete') || action.includes('purge')) {
      return <Badge className="bg-rose-500/10 text-rose-700 border-rose-300 font-mono text-[11px]">{action}</Badge>;
    }
    return <Badge className="bg-slate-500/10 text-slate-700 border-slate-300 font-mono text-[11px]">{action}</Badge>;
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `platform_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Platform Audit Trail
          </h1>
          <p className="text-sm text-slate-500">
            Immutable log of all administrative actions, tenant provisioning, status modifications, and configuration releases across all colleges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="gap-1.5 text-xs text-slate-700 border-slate-300 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={filteredLogs.length === 0}
            className="gap-1.5 text-xs text-slate-700 border-slate-300 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by admin email, action, college code, entity..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/50"
              />
            </div>

            <div>
              <Select value={selectedCollegeFilter} onValueChange={setSelectedCollegeFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Colleges (Global)</SelectItem>
                  {collegesList.map(c => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.code} – {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={selectedActionFilter} onValueChange={setSelectedActionFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Action Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Action Types</SelectItem>
                  <SelectItem value="provision">Provisioning</SelectItem>
                  <SelectItem value="publish">Publish Config</SelectItem>
                  <SelectItem value="status">Status Changes</SelectItem>
                  <SelectItem value="update">Updates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="py-3 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Audit Records ({filteredLogs.length})
          </CardTitle>
          <span className="text-xs text-slate-400 font-mono">
            Immutable Audit Store
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs">Loading platform audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm font-medium">No audit logs matching criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting the filters or executing an administrative action.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[11px] font-semibold text-slate-600">Timestamp</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-600">College</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-600">Action</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-600">Entity</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-600">Operator</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-600 text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap font-mono">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-semibold bg-slate-100 text-slate-700 border-slate-300">
                          {log.college_code || 'PLATFORM'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">
                        <span className="font-semibold text-slate-800">{log.entity_type}</span>
                        {log.entity_id ? ` : ${log.entity_id}` : ''}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">
                        {log.super_admin_email}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectedLog(log)}
                          className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Diff
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff / Details Modal */}
      {inspectedLog && (
        <Dialog open={!!inspectedLog} onOpenChange={open => !open && setInspectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-600" />
                Audit Record Details
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Action: <span className="font-mono font-semibold text-slate-800">{inspectedLog.action}</span> | 
                College: <span className="font-mono font-semibold text-slate-800">{inspectedLog.college_code || 'GLOBAL'}</span> | 
                Operator: <span className="font-mono font-semibold text-slate-800">{inspectedLog.super_admin_email}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-600">Timestamp:</span>{' '}
                  <span className="font-mono text-slate-800">{new Date(inspectedLog.created_at).toISOString()}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Entity Type:</span>{' '}
                  <span className="font-mono text-slate-800">{inspectedLog.entity_type}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Entity ID:</span>{' '}
                  <span className="font-mono text-slate-800">{inspectedLog.entity_id || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">College ID:</span>{' '}
                  <span className="font-mono text-slate-800">{inspectedLog.college_id || 'N/A'}</span>
                </div>
              </div>

              {/* Diffs display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Old Values */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Previous State (old_values)
                  </p>
                  <pre className="p-3 bg-slate-900 text-slate-200 text-[11px] rounded-lg overflow-x-auto max-h-64 font-mono">
                    {inspectedLog.old_values ? JSON.stringify(inspectedLog.old_values, null, 2) : '// No previous state recorded'}
                  </pre>
                </div>

                {/* New Values */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Updated State (new_values)
                  </p>
                  <pre className="p-3 bg-slate-900 text-slate-200 text-[11px] rounded-lg overflow-x-auto max-h-64 font-mono">
                    {inspectedLog.new_values ? JSON.stringify(inspectedLog.new_values, null, 2) : '// No payload recorded'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setInspectedLog(null)} className="text-xs">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
