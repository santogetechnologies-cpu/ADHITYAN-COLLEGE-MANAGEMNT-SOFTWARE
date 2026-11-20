import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  History, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText,
  Loader2
} from 'lucide-react';
import { ConfigurationRelease } from '@/types/superAdmin.types';

interface VersionHistorySectionProps {
  releases: ConfigurationRelease[];
  activeVersion?: string;
  onRollback: (versionNumber: number) => Promise<boolean>;
}

export function VersionHistorySection({
  releases,
  activeVersion = 'v1.0.0',
  onRollback
}: VersionHistorySectionProps) {
  const [rollingBackId, setRollingBackId] = useState<number | null>(null);

  const handleRollback = async (versionNum: number) => {
    if (!confirm(`Are you sure you want to rollback the active ERP configuration to version #${versionNum}?`)) {
      return;
    }
    setRollingBackId(versionNum);
    try {
      await onRollback(versionNum);
    } finally {
      setRollingBackId(null);
    }
  };

  const defaultMockRelease: ConfigurationRelease = {
    id: 'rel_init',
    release_version: 'v1.0.0',
    version_number: 1,
    title: 'Initial Production Release v1.0.0',
    change_summary: 'Baseline institutional configuration for Adithyan Paramedical ERP.',
    author_email: 'admin@gmail.com',
    snapshot: {} as any,
    is_active: true,
    created_at: new Date().toISOString()
  };

  const displayList = releases.length > 0 ? releases : [defaultMockRelease];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Configuration Releases & Version History
            </h2>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              Active: {activeVersion}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log of all published system configuration snapshots with one-click rollback recovery.
          </p>
        </div>
      </div>

      {/* 2. Releases Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-slate-50/75">
                <TableHead className="font-semibold text-slate-700">Release Version</TableHead>
                <TableHead className="font-semibold text-slate-700">Summary / Notes</TableHead>
                <TableHead className="font-semibold text-slate-700">Publisher</TableHead>
                <TableHead className="font-semibold text-slate-700">Published Timestamp</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Rollback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayList.map((rel) => {
                const isActive = rel.release_version === activeVersion || rel.is_active;
                const isLoading = rollingBackId === rel.version_number;

                return (
                  <TableRow key={rel.id} className="text-xs hover:bg-slate-50/50">
                    <TableCell>
                      <div>
                        <span className="font-bold text-slate-900 block">{rel.release_version}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">#{rel.version_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700 line-clamp-1">{rel.change_summary}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600 font-mono text-[11px]">{rel.author_email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600 text-[11px]">
                        {new Date(rel.created_at).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : 'bg-slate-50 text-slate-500'}`}
                      >
                        {isActive ? 'Active Live' : 'Archived'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleRollback(rel.version_number)}
                          className="h-7 px-2.5 text-[11px] font-semibold text-amber-700 border-amber-200 hover:bg-amber-50"
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                          Rollback
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Current</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
