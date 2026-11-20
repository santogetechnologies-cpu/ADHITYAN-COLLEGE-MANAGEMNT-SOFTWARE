import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  LayoutDashboard, 
  Plus, 
  Save, 
  Sparkles, 
  Trash2, 
  Loader2, 
  Search,
  CheckCircle2,
  BarChart3,
  Users,
  Clock,
  Layers
} from 'lucide-react';
import { 
  DashboardLayoutConfig, 
  WidgetPlacement, 
  RoleCustomConfig, 
  WidgetDefinition 
} from '@/types/superAdmin.types';
import { DEFAULT_WIDGET_CATALOG } from '@/services/superAdminDefaults';
import { DynamicWidgetRenderer, WidgetDataContext } from '@/components/widgets/DynamicWidgetRenderer';

interface DashboardBuilderSectionProps {
  roles: Record<string, RoleCustomConfig>;
  dashboards: Record<string, DashboardLayoutConfig>;
  widgetCatalog?: WidgetDefinition[];
  widgetData?: WidgetDataContext;
  onSaveDashboard?: (roleKey: string, updatedDashboard: DashboardLayoutConfig) => Promise<boolean>;
  onSaveDashboardDraft?: (roleKey: string, updatedDashboard: DashboardLayoutConfig) => Promise<boolean>;
}

export function DashboardBuilderSection({
  roles,
  dashboards,
  widgetCatalog = DEFAULT_WIDGET_CATALOG,
  widgetData,
  onSaveDashboard,
  onSaveDashboardDraft
}: DashboardBuilderSectionProps) {
  const roleKeys = Object.keys(roles);
  const [selectedRole, setSelectedRole] = useState<string>(roleKeys[0] || 'teacher');
  const [saving, setSaving] = useState(false);
  const [addWidgetModalOpen, setAddWidgetModalOpen] = useState(false);
  const [widgetSearch, setWidgetSearch] = useState('');
  const [widgetCategory, setWidgetCategory] = useState<string>('all');

  const activeDashboard: DashboardLayoutConfig = dashboards[selectedRole] || {
    role: selectedRole,
    columns: 4,
    gap: 'md',
    widgets: []
  };

  const [currentLayout, setCurrentLayout] = useState<DashboardLayoutConfig>(activeDashboard);

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setCurrentLayout(dashboards[newRole] || {
      role: newRole,
      columns: 4,
      gap: 'md',
      widgets: []
    });
  };

  const handleResize = (instanceId: string, colSpan: 1 | 2 | 3 | 4) => {
    const updated = currentLayout.widgets.map(w => 
      w.instanceId === instanceId ? { ...w, colSpan } : w
    );
    setCurrentLayout({ ...currentLayout, widgets: updated });
  };

  const handleRemove = (instanceId: string) => {
    const updated = currentLayout.widgets.filter(w => w.instanceId !== instanceId);
    updated.forEach((w, i) => { w.order = i + 1; });
    setCurrentLayout({ ...currentLayout, widgets: updated });
  };

  const handleAddWidget = (def: WidgetDefinition) => {
    const newPlacement: WidgetPlacement = {
      instanceId: `inst_${selectedRole}_${def.id}_${Date.now()}`,
      widgetId: def.id,
      title: def.title,
      colSpan: def.defaultColSpan || 1,
      order: currentLayout.widgets.length + 1
    };

    setCurrentLayout({
      ...currentLayout,
      widgets: [...currentLayout.widgets, newPlacement]
    });
    setAddWidgetModalOpen(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const saveFn = onSaveDashboard || onSaveDashboardDraft;
      if (saveFn) {
        await saveFn(selectedRole, currentLayout);
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredCatalog = widgetCatalog.filter(w => {
    const matchesCat = widgetCategory === 'all' || w.category === widgetCategory;
    const matchesSearch = !widgetSearch || 
      w.title.toLowerCase().includes(widgetSearch.toLowerCase()) ||
      w.description.toLowerCase().includes(widgetSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Dashboard Builder
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Live Database Widgets
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure real-time KPI metrics, charts, data tables, and quick action shortcuts for each user role.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="h-8 px-2.5 text-xs font-semibold border border-slate-200 rounded-md bg-white text-slate-800 shadow-2xs"
          >
            {roleKeys.map(k => (
              <option key={k} value={k}>
                {roles[k]?.label || k} ({k})
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddWidgetModalOpen(true)}
            className="h-8 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Widget
          </Button>

          <Button
            size="sm"
            disabled={saving}
            onClick={handleSaveDraft}
            className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save Dashboard Draft
          </Button>
        </div>
      </div>

      {/* 2. Visual Layout Canvas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-700">
            {roles[selectedRole]?.label} Dashboard Canvas ({currentLayout.widgets.length} Placed Widgets)
          </span>
          <span className="text-[11px] text-muted-foreground">
            Hover over widgets to resize or remove
          </span>
        </div>

        {currentLayout.widgets.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 p-12 text-center bg-slate-50/50">
            <LayoutDashboard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Canvas is Empty</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
              Add KPI cards, charts, or data tables to construct this portal's dashboard.
            </p>
            <Button size="sm" onClick={() => setAddWidgetModalOpen(true)} className="h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add First Widget
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {currentLayout.widgets.map((placement) => (
              <DynamicWidgetRenderer
                key={placement.instanceId}
                placement={placement}
                data={widgetData}
                isCustomizing={true}
                onResize={(span) => handleResize(placement.instanceId, span)}
                onRemove={() => handleRemove(placement.instanceId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. Add Widget Modal */}
      <Dialog open={addWidgetModalOpen} onOpenChange={setAddWidgetModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] bg-white p-5 rounded-xl flex flex-col">
          <DialogHeader className="border-b border-slate-100 pb-2.5">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-primary" />
              <span>Add Widget from Library</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an institutional database widget to place on {roles[selectedRole]?.label}'s dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2.5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Search widgets by title or description..."
                value={widgetSearch}
                onChange={(e) => setWidgetSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
              {['all', 'kpi', 'chart', 'table', 'list', 'action'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setWidgetCategory(cat)}
                  className={`px-2 py-1 text-[10px] font-semibold uppercase rounded-sm transition-colors ${
                    widgetCategory === cat ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-80">
            {filteredCatalog.map((def) => (
              <div
                key={def.id}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:border-primary/50 transition-all flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{def.title}</span>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono bg-slate-50">
                      {def.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{def.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Default: {def.defaultColSpan} col(s) • Formats: {def.supportedFormats.join(', ')}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleAddWidget(def)}
                  className="h-7 px-2.5 text-xs font-semibold bg-primary text-primary-foreground shrink-0"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Insert
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setAddWidgetModalOpen(false)} className="h-8 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
