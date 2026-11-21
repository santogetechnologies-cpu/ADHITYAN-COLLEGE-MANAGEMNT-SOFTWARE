import React, { useState } from 'react';
import { ModuleDefinition, MasterSystemConfigState } from '@/types/superAdmin.types';
import { 
  Boxes, 
  Check, 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  Layers, 
  Users, 
  FileText, 
  Lock, 
  Unlock,
  Search,
  ExternalLink
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ModuleManagementViewProps {
  masterConfig: MasterSystemConfigState;
  onUpdateModules: (modules: ModuleDefinition[]) => void;
}

export function ModuleManagementView({
  masterConfig,
  onUpdateModules
}: ModuleManagementViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const modules = masterConfig.modules || [];

  const categories = ['all', 'Core ERP', 'Academic', 'Finance', 'Operations', 'Compliance', 'Portals'];

  const filteredModules = modules.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleModuleStatus = (moduleId: string, newStatus: 'active' | 'disabled') => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;

    // Check if other active modules depend on this one
    if (newStatus === 'disabled') {
      const dependentModules = modules.filter(m => 
        m.enabled && m.dependencies && m.dependencies.includes(moduleId)
      );

      if (dependentModules.length > 0) {
        const names = dependentModules.map(d => d.name).join(', ');
        toast.warning(
          `Module "${mod.name}" has active dependents: ${names}. Disabling it may restrict functionality in those modules.`
        );
      }
    }

    const updated = modules.map(m => m.id === moduleId ? { ...m, enabled: newStatus === 'active' } : m);
    onUpdateModules(updated);
    toast.success(`Module "${mod.name}" is now ${newStatus === 'active' ? 'Enabled' : 'Disabled'}`);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <Boxes className="w-5 h-5 mr-2 text-indigo-600" />
              Institutional Module Control & Dependency Engine
            </h2>
            <p className="text-xs text-slate-500">
              Enable or disable entire functional systems across the ERP. When disabled, underlying routes, UI panels, and backend operations are blocked.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search modules..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allActive = modules.map(m => ({ ...m, status: 'active' as const }));
                onUpdateModules(allActive);
                toast.success('All institutional modules enabled');
              }}
              className="text-xs h-8"
            >
              Enable All
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase">Category:</span>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? `All Modules (${modules.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((mod) => {
          const isEnabled = mod.enabled;
          return (
            <div
              key={mod.id}
              className={`rounded-xl border p-5 transition-all bg-white flex flex-col justify-between ${
                isEnabled 
                  ? 'border-slate-200 shadow-2xs hover:border-slate-300' 
                  : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isEnabled ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">{mod.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">{mod.id}</span>
                    </div>
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => 
                      toggleModuleStatus(mod.id, checked ? 'active' : 'disabled')
                    }
                  />
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                  {mod.description}
                </p>

                {/* Dependencies Badge */}
                {mod.dependencies && mod.dependencies.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center space-x-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">Requires:</span>
                    <div className="flex flex-wrap gap-1">
                      {mod.dependencies.map(dep => (
                        <Badge key={dep} variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-600 px-1.5 py-0">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer status & access */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <Badge className={isEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}>
                  {isEnabled ? 'Active in ERP' : 'Disabled / Blocked'}
                </Badge>

                <span className="text-[11px] text-slate-400">
                  {mod.assignedRoles?.length || 0} Roles
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
