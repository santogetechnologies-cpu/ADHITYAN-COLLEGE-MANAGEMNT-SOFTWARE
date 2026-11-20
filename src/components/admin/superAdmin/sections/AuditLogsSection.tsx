import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  ShieldCheck, 
  Sliders, 
  Eye, 
  ArrowRight,
  Database,
  Filter
} from 'lucide-react';
import { AuditLogItem } from '@/types/superAdmin.types';
import { superAdminService } from '@/services/superAdminService';

export function AuditLogsSection() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const items = await superAdminService.getAuditLogs({
        actionFilter: actionFilter === 'all' ? undefined : actionFilter,
        limit: 100
      });
      setLogs(items);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.user_email && item.user_email.toLowerCase().includes(term)) ||
      (item.action && item.action.toLowerCase().includes(term)) ||
      (item.entity_type && item.entity_type.toLowerCase().includes(term)) ||
      (item.entity_id && item.entity_id.toLowerCase().includes(term))
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'publish_configuration':
        return <Badge className="bg-emerald-600 text-white font-medium text-[10px]">Publish Live</Badge>;
      case 'rollback_configuration':
        return <Badge className="bg-rose-600 text-white font-medium text-[10px]">Rollback</Badge>;
      case 'save_draft':
        return <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]">Draft Saved</Badge>;
      case 'create_backup':
        return <Badge className="bg-indigo-600 text-white font-medium text-[10px]">Backup Created</Badge>;
      case 'restore_backup':
        return <Badge className="bg-purple-600 text-white font-medium text-[10px]">Backup Restored</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{action.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              System Audit Logs & Governance Trail
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Supabase audit_logs
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable full-stack audit trail of all administrative configuration actions, publish events, rollbacks, and schema mutations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="h-8 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Trail
          </Button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by admin email, action, entity type, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Audit Actions</option>
            <option value="publish_configuration">publish_configuration</option>
            <option value="rollback_configuration">rollback_configuration</option>
            <option value="save_draft">save_draft</option>
            <option value="create_backup">create_backup</option>
            <option value="restore_backup">restore_backup</option>
          </select>
        </div>
      </div>

      {/* 3. Audit Logs Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-slate-50/75">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[200px]">Actor / Author</TableHead>
                <TableHead className="w-[150px]">Action</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead className="text-right w-[110px]">Inspector</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-indigo-600" />
                    Querying Supabase audit_logs records...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                    <Database className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No audit records match the current search or filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((item) => (
                  <TableRow key={item.id} className="text-xs hover:bg-slate-50/50">
                    <TableCell className="font-mono text-[11px] text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{new Date(item.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-800 text-xs">{item.user_email || 'System'}</p>
                          <span className="text-[10px] text-muted-foreground uppercase">{item.user_role || 'admin'}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {getActionBadge(item.action)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[11px] text-indigo-700 font-semibold bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-100">
                          {item.entity_type}
                        </span>
                        {item.entity_id && (
                          <span className="text-slate-500 text-[11px] truncate max-w-[200px]">
                            : {item.entity_id}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(item)}
                        className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Diff
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Inspection Modal (JSON Diff & Payload) */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Audit Log Record Inspector</span>
              {selectedLog && getActionBadge(selectedLog.action)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              ID: {selectedLog?.id} • Logged at {selectedLog && new Date(selectedLog.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-md border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">Actor:</span>
                  <p className="font-semibold text-slate-800">{selectedLog.user_email}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Role:</span>
                  <p className="font-semibold text-slate-800 uppercase">{selectedLog.user_role}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Entity Type:</span>
                  <p className="font-mono text-slate-800">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Entity ID:</span>
                  <p className="font-mono text-slate-800">{selectedLog.entity_id || 'N/A'}</p>
                </div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
                    Previous Values (old_values)
                  </h4>
                  <pre className="text-[11px] font-mono bg-slate-900 text-rose-300 p-3 rounded-md max-h-48 overflow-y-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                  New Values / Payload (new_values)
                </h4>
                <pre className="text-[11px] font-mono bg-slate-900 text-emerald-300 p-3 rounded-md max-h-56 overflow-y-auto">
                  {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : 'No payload recorded'}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
