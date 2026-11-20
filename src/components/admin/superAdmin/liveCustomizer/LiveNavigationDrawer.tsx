import React, { useState } from 'react';
import { NavItemConfig } from '@/types/superAdmin.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Compass, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  X,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveNavigationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleKey?: string | null;
  items: NavItemConfig[];
  onUpdateItems: (newItems: NavItemConfig[]) => void;
  onOpenAddPage: () => void;
}

export function LiveNavigationDrawer({
  open,
  onOpenChange,
  roleKey,
  items,
  onUpdateItems,
  onOpenAddPage
}: LiveNavigationDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleToggleVisibility = (id: string) => {
    const updated = items.map(item => 
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    onUpdateItems(updated);
    const item = items.find(i => i.id === id);
    toast.success(`"${item?.label}" is now ${!item?.visible ? 'visible' : 'hidden'} on portal`);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // re-assign order numbers
    const reordered = copy.map((it, idx) => ({ ...it, order: idx }));
    onUpdateItems(reordered);
  };

  const handleStartRename = (item: NavItemConfig) => {
    setEditingId(item.id);
    setEditLabel(item.label);
  };

  const handleSaveRename = (id: string) => {
    if (!editLabel.trim()) return;
    const updated = items.map(item => 
      item.id === id ? { ...item, label: editLabel.trim() } : item
    );
    onUpdateItems(updated);
    setEditingId(null);
    toast.success(`Renamed to "${editLabel.trim()}"`);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    onUpdateItems(updated);
    toast.success('Navigation item removed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Manage Sidebar & Navigation: {(roleKey || 'Role').toUpperCase()}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Rename, hide, reorder, or delete navigation items for this role.
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={onOpenAddPage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Page / Menu
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {items.map((item, index) => (
            <div 
              key={item.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                item.visible 
                  ? 'bg-white border-slate-200' 
                  : 'bg-slate-50 border-dashed border-slate-300 opacity-60'
              }`}
            >
              {/* Left Details / Inline Edit */}
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-slate-400 w-5">
                  #{index + 1}
                </span>

                {editingId === item.id ? (
                  <div className="flex items-center space-x-1.5 flex-1">
                    <Input 
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-8 text-xs max-w-xs"
                      autoFocus
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleSaveRename(item.id)}
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
                        {item.label}
                      </span>
                      {item.badge && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200">
                          {item.badge}
                        </Badge>
                      )}
                      {!item.visible && (
                        <Badge variant="secondary" className="text-[9px] text-slate-500">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block truncate">
                      {item.path}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-1 shrink-0">
                {/* Reorder Up / Down */}
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
                  disabled={index === items.length - 1}
                  onClick={() => handleMove(index, 'down')}
                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>

                {/* Rename */}
                {editingId !== item.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartRename(item)}
                    className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100"
                    title="Rename Item"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                )}

                {/* Toggle Visibility */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleVisibility(item.id)}
                  className={`h-7 w-7 p-0 ${item.visible ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  title={item.visible ? 'Hide from Sidebar' : 'Show on Sidebar'}
                >
                  {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>

                {/* Delete */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteItem(item.id)}
                  className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                  title="Delete Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100">
          <Button size="sm" onClick={() => onOpenChange(false)} className="bg-slate-900 text-white text-xs">
            Done Customizing Navigation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
