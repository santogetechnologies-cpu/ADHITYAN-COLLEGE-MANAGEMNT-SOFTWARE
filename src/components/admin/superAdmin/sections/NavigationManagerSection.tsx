import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Compass, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Loader2,
  Layers,
  Edit
} from 'lucide-react';
import { RoleNavigationConfig, NavItemConfig, RoleCustomConfig, ModuleDefinition } from '@/types/superAdmin.types';

interface NavigationManagerSectionProps {
  roles: Record<string, RoleCustomConfig>;
  navigation: Record<string, RoleNavigationConfig>;
  modules: ModuleDefinition[];
  onSaveNavigationDraft: (roleKey: string, updatedNav: RoleNavigationConfig) => Promise<boolean>;
}

export function NavigationManagerSection({
  roles,
  navigation,
  modules,
  onSaveNavigationDraft
}: NavigationManagerSectionProps) {
  const roleKeys = Object.keys(roles);
  const [selectedRole, setSelectedRole] = useState<string>(roleKeys[0] || 'teacher');
  const [saving, setSaving] = useState(false);

  const activeNav: RoleNavigationConfig = navigation[selectedRole] || {
    role: selectedRole,
    items: [],
    groups: ['Academic', 'Services', 'Administration']
  };

  const [currentNav, setCurrentNav] = useState<RoleNavigationConfig>(activeNav);

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setCurrentNav(navigation[newRole] || {
      role: newRole,
      items: [],
      groups: ['Academic', 'Services', 'Administration']
    });
  };

  const handleToggleVisible = (itemId: string) => {
    const updated = currentNav.items.map(it => 
      it.id === itemId ? { ...it, visible: !it.visible } : it
    );
    setCurrentNav({ ...currentNav, items: updated });
  };

  const handleLabelChange = (itemId: string, newLabel: string) => {
    const updated = currentNav.items.map(it => 
      it.id === itemId ? { ...it, label: newLabel } : it
    );
    setCurrentNav({ ...currentNav, items: updated });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const items = [...currentNav.items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    items.forEach((it, i) => { it.order = i + 1; });
    setCurrentNav({ ...currentNav, items });
  };

  const handleRemove = (itemId: string) => {
    const updated = currentNav.items.filter(it => it.id !== itemId);
    updated.forEach((it, i) => { it.order = i + 1; });
    setCurrentNav({ ...currentNav, items: updated });
  };

  const handleAddFromModule = (mod: ModuleDefinition) => {
    const exists = currentNav.items.some(it => it.id === mod.id);
    if (exists) return;

    const newItem: NavItemConfig = {
      id: mod.id,
      label: mod.name,
      path: mod.routePath,
      iconName: mod.iconName,
      order: currentNav.items.length + 1,
      visible: true
    };

    setCurrentNav({
      ...currentNav,
      items: [...currentNav.items, newItem]
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await onSaveNavigationDraft(selectedRole, currentNav);
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
              Role Navigation & Sidebar Manager
            </h2>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              Portal Menus
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure sidebar menu links, route destinations, display titles, and ordering for each role.
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
            Save Navigation Draft
          </Button>
        </div>
      </div>

      {/* 2. Menu Items List */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Active Navigation Items ({currentNav.items.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Configured sidebar destinations for {roles[selectedRole]?.label}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {currentNav.items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No navigation items configured. Add from available modules below.
            </p>
          ) : (
            currentNav.items.map((item, idx) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                  item.visible ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {item.order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Input
                      value={item.label}
                      onChange={(e) => handleLabelChange(item.id, e.target.value)}
                      className="h-7 text-xs font-semibold max-w-xs"
                    />
                    <span className="font-mono text-[10px] text-muted-foreground block mt-0.5">{item.path}</span>
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
                    disabled={idx === currentNav.items.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="h-7 w-7 p-0 text-slate-500"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleVisible(item.id)}
                    className={`h-7 px-2 text-[11px] ${item.visible ? 'text-slate-700' : 'text-amber-700 bg-amber-50'}`}
                  >
                    {item.visible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                    {item.visible ? 'Visible' : 'Hidden'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item.id)}
                    className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 3. Add from Modules Dock */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="py-2.5 px-4 border-b border-slate-100">
          <CardTitle className="text-xs font-bold text-slate-800">
            Available Modules to Add to Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {modules.map((m) => {
              const isAdded = currentNav.items.some(it => it.id === m.id);
              return (
                <Button
                  key={m.id}
                  variant={isAdded ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={isAdded}
                  onClick={() => handleAddFromModule(m)}
                  className="h-7 text-[11px]"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {m.name} {isAdded && '✓'}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
