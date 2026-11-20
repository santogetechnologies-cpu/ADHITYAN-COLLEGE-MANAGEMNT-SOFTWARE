import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Sparkles,
  Layout,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { RolePageConfig, PageSectionConfig, RoleCustomConfig } from '@/types/superAdmin.types';

interface RolePageCustomizerSectionProps {
  roles: Record<string, RoleCustomConfig>;
  pages: Record<string, RolePageConfig>;
  onSavePageDraft: (roleKey: string, updatedPage: RolePageConfig) => Promise<boolean>;
}

export function RolePageCustomizerSection({
  roles,
  pages,
  onSavePageDraft
}: RolePageCustomizerSectionProps) {
  const roleKeys = Object.keys(roles);
  const [selectedRole, setSelectedRole] = useState<string>(roleKeys[0] || 'teacher');
  const [saving, setSaving] = useState(false);

  // Active page configuration for selected role
  const activePageConfig: RolePageConfig = pages[selectedRole] || {
    role: selectedRole,
    layout: 'grid_dashboard',
    spacing: 'normal',
    sections: [
      { id: 'sec_banner', title: 'Welcome & Directives', type: 'banner', visible: true, order: 1 },
      { id: 'sec_stats', title: 'Key Performance Indicators', type: 'stats_grid', visible: true, order: 2, columns: 4 },
      { id: 'sec_content', title: 'Operational Workspace', type: 'main_content', visible: true, order: 3 },
      { id: 'sec_notices', title: 'Circulars & Schedule', type: 'notices', visible: true, order: 4 }
    ]
  };

  const [currentConfig, setCurrentConfig] = useState<RolePageConfig>(activePageConfig);

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setCurrentConfig(pages[newRole] || {
      role: newRole,
      layout: 'grid_dashboard',
      spacing: 'normal',
      sections: [
        { id: 'sec_banner', title: 'Welcome & Directives', type: 'banner', visible: true, order: 1 },
        { id: 'sec_stats', title: 'Key Performance Indicators', type: 'stats_grid', visible: true, order: 2, columns: 4 },
        { id: 'sec_content', title: 'Operational Workspace', type: 'main_content', visible: true, order: 3 },
        { id: 'sec_notices', title: 'Circulars & Schedule', type: 'notices', visible: true, order: 4 }
      ]
    });
  };

  const handleToggleVisible = (sectionId: string) => {
    const updated = currentConfig.sections.map(s => 
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    );
    setCurrentConfig({ ...currentConfig, sections: updated });
  };

  const handleTitleChange = (sectionId: string, newTitle: string) => {
    const updated = currentConfig.sections.map(s => 
      s.id === sectionId ? { ...s, title: newTitle } : s
    );
    setCurrentConfig({ ...currentConfig, sections: updated });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const sections = [...currentConfig.sections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;

    // re-assign order numbers
    sections.forEach((s, i) => { s.order = i + 1; });
    setCurrentConfig({ ...currentConfig, sections });
  };

  const handleRemoveSection = (sectionId: string) => {
    const updated = currentConfig.sections.filter(s => s.id !== sectionId);
    updated.forEach((s, i) => { s.order = i + 1; });
    setCurrentConfig({ ...currentConfig, sections: updated });
  };

  const handleAddSection = () => {
    const newId = `sec_custom_${Date.now()}`;
    const newSec: PageSectionConfig = {
      id: newId,
      title: 'New Section Block',
      type: 'widgets',
      visible: true,
      order: currentConfig.sections.length + 1,
      columns: 4
    };
    setCurrentConfig({
      ...currentConfig,
      sections: [...currentConfig.sections, newSec]
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await onSavePageDraft(selectedRole, currentConfig);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Role Page Layout & Section Customizer
            </h2>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              Visual Structure
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure section hierarchy, column density, visibility, and titles for any role portal.
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
            size="sm"
            disabled={saving}
            onClick={handleSaveDraft}
            className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save Page Draft
          </Button>
        </div>
      </div>

      {/* 2. Global Page Settings */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Page Spacing Density</label>
            <select
              value={currentConfig.spacing}
              onChange={(e) => setCurrentConfig({ ...currentConfig, spacing: e.target.value as any })}
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
            >
              <option value="compact">Compact (High data density)</option>
              <option value="normal">Standard / Balanced</option>
              <option value="relaxed">Relaxed (Spacious layout)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Layout Canvas Archetype</label>
            <select
              value={currentConfig.layout}
              onChange={(e) => setCurrentConfig({ ...currentConfig, layout: e.target.value as any })}
              className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
            >
              <option value="grid_dashboard">Executive Grid Dashboard</option>
              <option value="sidebar_split">Sidebar & Workspace Split</option>
              <option value="single">Single Stream Feed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 3. Section Manager */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Configured Page Sections ({currentConfig.sections.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Reorder, rename, or toggle visibility for portal blocks.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddSection} className="h-7 text-xs font-medium">
            <Plus className="w-3 h-3 mr-1" />
            Add Section Block
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-2.5">
          {currentConfig.sections.map((section, idx) => (
            <div
              key={section.id}
              className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 text-xs ${
                section.visible ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {section.order}
                </span>
                
                <div className="flex-1 min-w-0">
                  <Input
                    value={section.title}
                    onChange={(e) => handleTitleChange(section.id, e.target.value)}
                    className="h-7 text-xs font-semibold max-w-sm"
                  />
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-[9px] uppercase font-mono">
                      Type: {section.type}
                    </Badge>
                    {section.columns && (
                      <span className="text-[10px] text-muted-foreground">{section.columns} Columns</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, 'up')}
                  className="h-7 w-7 p-0 text-slate-500"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={idx === currentConfig.sections.length - 1}
                  onClick={() => handleMove(idx, 'down')}
                  className="h-7 w-7 p-0 text-slate-500"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleVisible(section.id)}
                  className={`h-7 px-2 text-[11px] ${section.visible ? 'text-slate-700' : 'text-amber-700 bg-amber-50'}`}
                >
                  {section.visible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                  {section.visible ? 'Visible' : 'Hidden'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSection(section.id)}
                  className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
