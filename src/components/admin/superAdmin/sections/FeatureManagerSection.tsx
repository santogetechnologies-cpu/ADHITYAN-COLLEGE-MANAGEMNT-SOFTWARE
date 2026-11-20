import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Sparkles, 
  Search, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Lock,
  Layers
} from 'lucide-react';
import { FeatureDefinition } from '@/types/superAdmin.types';

interface FeatureManagerSectionProps {
  features: FeatureDefinition[];
  onSaveFeaturesDraft: (updatedFeatures: FeatureDefinition[]) => Promise<boolean>;
}

export function FeatureManagerSection({
  features,
  onSaveFeaturesDraft
}: FeatureManagerSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFeatures, setCurrentFeatures] = useState<FeatureDefinition[]>(features);
  const [saving, setSaving] = useState(false);

  const filteredFeatures = currentFeatures.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.actionKey.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (featId: string) => {
    const updated = currentFeatures.map(f => 
      f.id === featId ? { ...f, enabled: !f.enabled } : f
    );
    setCurrentFeatures(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveFeaturesDraft(currentFeatures);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Granular Feature & Capability Manager
            </h2>
            <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
              {currentFeatures.filter(f => f.enabled).length} / {currentFeatures.length} Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable or restrict specific workflows (such as online fee payment, assignment submission, student CSV import) independently of entire modules.
          </p>
        </div>

        <Button
          size="sm"
          disabled={saving}
          onClick={handleSave}
          className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Save Features Draft
        </Button>
      </div>

      {/* 2. Search Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search features by name, action key, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Features Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-slate-50/75">
                <TableHead className="font-semibold text-slate-700">Feature Name / Action Key</TableHead>
                <TableHead className="font-semibold text-slate-700">Parent Module</TableHead>
                <TableHead className="font-semibold text-slate-700">Assigned Roles</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeatures.map((f) => (
                <TableRow key={f.id} className="text-xs hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-900">{f.name}</span>
                        {f.requiresAdminSanction && (
                          <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 flex items-center">
                            <Lock className="w-2.5 h-2.5 mr-0.5" /> Sanction Required
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{f.actionKey}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{f.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] bg-slate-50 uppercase font-mono">{f.moduleId}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-600 text-[11px]">{f.assignedRoles.join(', ')}</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${f.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                    >
                      {f.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={f.enabled ? 'outline' : 'default'}
                      onClick={() => handleToggle(f.id)}
                      className="h-7 px-2.5 text-[11px] font-semibold"
                    >
                      {f.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
