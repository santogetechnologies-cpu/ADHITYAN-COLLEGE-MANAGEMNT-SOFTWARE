import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Layers, 
  Search, 
  Save, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck,
  Lock
} from 'lucide-react';
import { ModuleDefinition } from '@/types/superAdmin.types';

interface ModuleManagerSectionProps {
  modules: ModuleDefinition[];
  onSaveModulesDraft: (updatedModules: ModuleDefinition[]) => Promise<boolean>;
}

export function ModuleManagerSection({
  modules,
  onSaveModulesDraft
}: ModuleManagerSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentModules, setCurrentModules] = useState<ModuleDefinition[]>(modules);
  const [saving, setSaving] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const filteredModules = currentModules.filter(m => {
    const matchesCat = categoryFilter === 'All' || m.category === categoryFilter;
    const matchesSearch = !searchTerm || 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleToggleModule = (modId: string) => {
    const target = currentModules.find(m => m.id === modId);
    if (!target) return;

    // Safety guard: Core modules cannot be disabled
    if (target.isSystemCore && target.enabled) {
      setWarningMessage(`Safety Warning: "${target.name}" is a protected core module required for institutional functioning.`);
      return;
    }

    // Dependency check: Warn if disabling a module depended upon by other active modules
    if (target.enabled) {
      const dependents = currentModules.filter(m => m.enabled && m.dependencies.includes(target.id));
      if (dependents.length > 0) {
        setWarningMessage(`Notice: Disabling "${target.name}" affects dependent active modules: ${dependents.map(d => d.name).join(', ')}.`);
      } else {
        setWarningMessage(null);
      }
    } else {
      setWarningMessage(null);
    }

    const updated = currentModules.map(m => 
      m.id === modId ? { ...m, enabled: !m.enabled } : m
    );
    setCurrentModules(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveModulesDraft(currentModules);
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
              ERP Module Registry & Lifecycle Manager
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              {currentModules.filter(m => m.enabled).length} / {currentModules.length} Enabled
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable or disable major ERP functional systems, manage role assignments, and audit inter-module dependencies.
          </p>
        </div>

        <Button
          size="sm"
          disabled={saving}
          onClick={handleSave}
          className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Save Modules Draft
        </Button>
      </div>

      {warningMessage && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button type="button" onClick={() => setWarningMessage(null)} className="text-amber-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* 2. Filter Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search modules by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['All', 'Core', 'Academic', 'Student Services', 'Administration', 'Operations', 'Finance'].map(cat => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className="h-7 text-xs px-2.5 font-medium whitespace-nowrap"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Modules Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-slate-50/75">
                <TableHead className="font-semibold text-slate-700">Module System</TableHead>
                <TableHead className="font-semibold text-slate-700">Category</TableHead>
                <TableHead className="font-semibold text-slate-700">Route</TableHead>
                <TableHead className="font-semibold text-slate-700">Dependencies</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModules.map((m) => (
                <TableRow key={m.id} className="text-xs hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-900">{m.name}</span>
                        {m.isSystemCore && (
                          <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center">
                            <Lock className="w-2.5 h-2.5 mr-0.5" /> Core
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{m.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] bg-slate-50">{m.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[10px] text-slate-700">{m.routePath}</span>
                  </TableCell>
                  <TableCell>
                    {m.dependencies.length > 0 ? (
                      <span className="text-[10px] text-slate-600 font-mono">{m.dependencies.join(', ')}</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${m.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                    >
                      {m.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={m.enabled ? 'outline' : 'default'}
                      disabled={m.isSystemCore}
                      onClick={() => handleToggleModule(m.id)}
                      className="h-7 px-2.5 text-[11px] font-semibold"
                    >
                      {m.enabled ? 'Disable' : 'Enable'}
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
