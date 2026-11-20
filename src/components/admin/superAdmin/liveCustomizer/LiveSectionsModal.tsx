import React, { useState } from 'react';
import { PageSectionConfig } from '@/types/superAdmin.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sliders, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  X,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveSectionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleKey?: string | null;
  sections: PageSectionConfig[];
  onUpdateSections: (newSections: PageSectionConfig[]) => void;
}

export function LiveSectionsModal({
  open,
  onOpenChange,
  roleKey,
  sections,
  onUpdateSections
}: LiveSectionsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<PageSectionConfig['type']>('widgets');
  const [newCols, setNewCols] = useState<1 | 2 | 3 | 4>(4);

  const handleToggleVisibility = (id: string) => {
    const updated = sections.map(sec => 
      sec.id === id ? { ...sec, visible: !sec.visible } : sec
    );
    onUpdateSections(updated);
    const sec = sections.find(s => s.id === id);
    toast.success(`Section "${sec?.title}" is now ${!sec?.visible ? 'visible' : 'hidden'}`);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((sec, idx) => ({ ...sec, order: idx }));
    onUpdateSections(reordered);
  };

  const handleSaveRename = (id: string) => {
    if (!editTitle.trim()) return;
    const updated = sections.map(sec => 
      sec.id === id ? { ...sec, title: editTitle.trim() } : sec
    );
    onUpdateSections(updated);
    setEditingId(null);
    toast.success('Section renamed');
  };

  const handleDeleteSection = (id: string) => {
    const updated = sections.filter(sec => sec.id !== id);
    onUpdateSections(updated);
    toast.success('Section deleted');
  };

  const handleAddSection = () => {
    if (!newTitle.trim()) {
      toast.error('Section title is required');
      return;
    }

    const newSec: PageSectionConfig = {
      id: `sec_${Date.now()}_${newTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      title: newTitle.trim(),
      type: newType,
      visible: true,
      order: sections.length,
      columns: newCols
    };

    onUpdateSections([...sections, newSec]);
    setNewTitle('');
    setIsAddingSection(false);
    toast.success(`Section "${newTitle}" created`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Dashboard Sections & Layout: {(roleKey || 'Role').toUpperCase()}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Organize, rearrange, rename, and add sections to the {roleKey || 'role'} portal.
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setIsAddingSection(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Section
            </Button>
          </div>
        </DialogHeader>

        {isAddingSection && (
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 my-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Create New Section</span>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingSection(false)} className="h-6 w-6 p-0">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">Section Title</label>
                <Input 
                  placeholder="e.g. Clinical Telemetry, Academic Progress"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">Section Type</label>
                <Select value={newType} onValueChange={(val: any) => setNewType(val)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="widgets" className="text-xs">Executive Widgets</SelectItem>
                    <SelectItem value="stats_grid" className="text-xs">KPI Stats Grid</SelectItem>
                    <SelectItem value="main_content" className="text-xs">Main Roster / Table</SelectItem>
                    <SelectItem value="timeline" className="text-xs">Activity Timeline</SelectItem>
                    <SelectItem value="notices" className="text-xs">Announcements</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleAddSection} className="bg-indigo-600 text-white text-xs h-8">
                Confirm & Add Section
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {sections.map((sec, index) => (
            <div 
              key={sec.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                sec.visible 
                  ? 'bg-white border-slate-200' 
                  : 'bg-slate-50 border-dashed border-slate-300 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-slate-400 w-5">
                  #{index + 1}
                </span>

                {editingId === sec.id ? (
                  <div className="flex items-center space-x-1.5 flex-1">
                    <Input 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-xs max-w-xs"
                      autoFocus
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleSaveRename(sec.id)}
                      className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {sec.title}
                      </span>
                      <Badge variant="outline" className="text-[9px] font-mono capitalize">
                        {sec.type}
                      </Badge>
                      {!sec.visible && (
                        <Badge variant="secondary" className="text-[9px] text-slate-500">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {sec.id} {sec.columns ? `• ${sec.columns} Columns` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => handleMove(index, 'up')}
                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === sections.length - 1}
                  onClick={() => handleMove(index, 'down')}
                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>

                {editingId !== sec.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingId(sec.id); setEditTitle(sec.title); }}
                    className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100"
                    title="Rename Section"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleVisibility(sec.id)}
                  className={`h-7 w-7 p-0 ${sec.visible ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  title={sec.visible ? 'Hide Section' : 'Show Section'}
                >
                  {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteSection(sec.id)}
                  className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                  title="Delete Section"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100">
          <Button size="sm" onClick={() => onOpenChange(false)} className="bg-slate-900 text-white text-xs">
            Done Customizing Sections
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
