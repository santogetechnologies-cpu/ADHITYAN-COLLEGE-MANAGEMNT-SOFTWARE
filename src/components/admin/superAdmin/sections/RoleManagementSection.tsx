import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Settings, 
  Edit, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  Layers,
  Save,
  Loader2
} from 'lucide-react';
import { RoleCustomConfig, ModuleDefinition } from '@/types/superAdmin.types';
import { DEFAULT_MODULES } from '@/services/superAdminDefaults';

interface RoleManagementSectionProps {
  roles?: Record<string, RoleCustomConfig>;
  modules?: ModuleDefinition[];
  onSaveRoleDraft?: (roleKey: string, updatedRole: RoleCustomConfig) => Promise<boolean>;
  onSaveRole?: (roleKey: string, updatedRole: RoleCustomConfig) => Promise<boolean>;
  onPreviewRole?: (roleKey: string) => void;
  onNavigateToBuilder?: (roleKey: string) => void;
  onCustomizeRole?: (roleKey: string) => void;
}

export function RoleManagementSection({
  roles = {},
  modules,
  onSaveRoleDraft,
  onSaveRole,
  onPreviewRole,
  onNavigateToBuilder,
  onCustomizeRole
}: RoleManagementSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [editingRole, setEditingRole] = useState<RoleCustomConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const safeModules = modules && modules.length > 0 ? modules : DEFAULT_MODULES;
  const roleList = Object.values(roles || {});

  const filteredRoles = roleList.filter(r => {
    const matchesCat = categoryFilter === 'All' || r.category === categoryFilter;
    const matchesSearch = !searchTerm || 
      r.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenEdit = (role: RoleCustomConfig) => {
    setEditingRole({ ...role });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    // Safety guardrail: Admin must remain active
    if (editingRole.role === 'admin' && editingRole.status !== 'active') {
      alert('Security Policy: The Super Administrator role cannot be restricted or deactivated.');
      return;
    }

    setSaving(true);
    try {
      const saveFn = onSaveRoleDraft || onSaveRole;
      if (saveFn) {
        const ok = await saveFn(editingRole.role, editingRole);
        if (ok) {
          setEditingRole(null);
        }
      } else {
        setEditingRole(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    if (!editingRole) return;
    const current = editingRole.allowedModules || [];
    const updated = current.includes(moduleId)
      ? current.filter(m => m !== moduleId)
      : [...current, moduleId];
    setEditingRole({ ...editingRole, allowedModules: updated });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Role Governance & Portals Directory
            </h2>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              {roleList.length} Institutional Roles
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centrally configure portal landing pages, display titles, module assignments, and operational permissions.
          </p>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search roles by title, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['All', 'Administration', 'Academic', 'Student & Parent', 'Finance', 'Operations', 'Specialized'].map(cat => (
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

      {/* 3. Roles Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-slate-50/75">
                <TableHead className="font-semibold text-slate-700">Role Title / ID</TableHead>
                <TableHead className="font-semibold text-slate-700">Category</TableHead>
                <TableHead className="font-semibold text-slate-700">Landing Page</TableHead>
                <TableHead className="font-semibold text-slate-700">Allowed Modules</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((r) => (
                <TableRow key={r.role} className="text-xs hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-900">{r.label}</span>
                        {r.isSystemProtected && (
                          <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center">
                            <Lock className="w-2.5 h-2.5 mr-0.5" /> Protected
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{r.role}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{r.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] bg-slate-50">{r.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {r.home}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-600 font-medium">
                      {r.allowedModules.includes('*') ? 'All Modules (*)' : `${r.allowedModules.length} Modules`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${r.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                    >
                      {r.status === 'active' ? 'Active' : 'Restricted'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => (onPreviewRole || onNavigateToBuilder)?.(r.role)}
                        className="h-7 px-2 text-[11px]"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onCustomizeRole ? onCustomizeRole(r.role) : handleOpenEdit(r)}
                        className="h-7 px-2.5 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Customize Functionality
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Configure Role Modal */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        {editingRole && (
          <DialogContent className="max-w-xl max-h-[85vh] bg-white p-5 rounded-xl flex flex-col">
            <DialogHeader className="border-b border-slate-100 pb-2.5">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Settings className="w-4 h-4 text-primary" />
                <span>Configure Role: {editingRole.label} ({editingRole.role})</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Changes will be saved as draft and activated once published by Super Admin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Display Title *</label>
                  <Input
                    required
                    value={editingRole.label}
                    onChange={(e) => setEditingRole({ ...editingRole, label: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Landing Route *</label>
                  <Input
                    required
                    value={editingRole.home}
                    onChange={(e) => setEditingRole({ ...editingRole, home: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Role Description</label>
                <Textarea
                  rows={2}
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Category</label>
                  <select
                    value={editingRole.category}
                    onChange={(e) => setEditingRole({ ...editingRole, category: e.target.value as any })}
                    className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                  >
                    <option value="Administration">Administration</option>
                    <option value="Academic">Academic</option>
                    <option value="Student & Parent">Student & Parent</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Specialized">Specialized</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Role Status</label>
                  <select
                    disabled={editingRole.isSystemProtected}
                    value={editingRole.status}
                    onChange={(e) => setEditingRole({ ...editingRole, status: e.target.value as any })}
                    className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                  >
                    <option value="active">Active (Full Portal Access)</option>
                    <option value="restricted">Restricted (Maintenance Mode)</option>
                  </select>
                </div>
              </div>

              {/* Module Assignment */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="font-semibold text-slate-800 block">
                  Assigned ERP Modules
                </label>
                <p className="text-[11px] text-muted-foreground">Select which modules this role is authorized to access.</p>
                
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {safeModules.map((m) => {
                    const isChecked = editingRole.allowedModules.includes('*') || editingRole.allowedModules.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-white cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={editingRole.isSystemProtected && editingRole.role === 'admin'}
                          onChange={() => toggleModule(m.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="font-medium text-slate-800">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="border-t border-slate-100 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRole(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="h-8 text-xs bg-primary text-primary-foreground font-semibold">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save Draft
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
