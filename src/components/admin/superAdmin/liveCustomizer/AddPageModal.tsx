import React, { useState } from 'react';
import { NavItemConfig } from '@/types/superAdmin.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Layers, 
  FilePlus, 
  BookOpen, 
  Calendar, 
  Clock, 
  CreditCard, 
  FileText, 
  Sparkles, 
  Settings, 
  Shield, 
  CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';

interface AddPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleKey?: string | null;
  onAddPage: (navItem: NavItemConfig) => void;
}

const AVAILABLE_ICONS = [
  { name: 'FileText', label: 'Document / File' },
  { name: 'BookOpen', label: 'Curriculum / Book' },
  { name: 'Calendar', label: 'Schedule / Calendar' },
  { name: 'Clock', label: 'Attendance / Clock' },
  { name: 'CreditCard', label: 'Payment / Fees' },
  { name: 'Sparkles', label: 'AI Venture / Special' },
  { name: 'Layers', label: 'Module / Section' },
  { name: 'Settings', label: 'Settings / Tool' },
  { name: 'Shield', label: 'Security / Compliance' }
];

export function AddPageModal({
  open,
  onOpenChange,
  roleKey,
  onAddPage
}: AddPageModalProps) {
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');
  const [iconName, setIconName] = useState('FileText');
  const [group, setGroup] = useState('Custom Pages');
  const [badge, setBadge] = useState('');

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!path || path.startsWith('/dashboard/') || path.startsWith('/')) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setPath(roleKey === 'student' ? slug : `/dashboard/${roleKey}/${slug}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error('Page label is required');
      return;
    }

    const newItem: NavItemConfig = {
      id: `page_${Date.now()}_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      label: label.trim(),
      path: path.trim() || `/${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      iconName,
      group: group || 'General',
      badge: badge.trim() || undefined,
      order: Date.now(),
      visible: true
    };

    onAddPage(newItem);
    toast.success(`Page "${label}" added to ${roleKey} portal navigation!`);
    setLabel('');
    setPath('');
    setBadge('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FilePlus className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Add New Page to {(roleKey || 'Role').toUpperCase()} Portal
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create a new functional page or workspace tab for this role.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Page Display Title</Label>
            <Input 
              placeholder="e.g. Clinical Logbook, Research Projects"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Route Path / Tab Identifier</Label>
            <Input 
              placeholder="e.g. clinical-logbook or /dashboard/student/clinical-log"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="text-xs font-mono h-9"
              required
            />
            <p className="text-[10px] text-slate-400">
              For student portal, use tab key (e.g. 'logbook'). For other portals, use URL path.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Navigation Icon</Label>
              <Select value={iconName} onValueChange={setIconName}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map(ic => (
                    <SelectItem key={ic.name} value={ic.name} className="text-xs">
                      {ic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Optional Badge</Label>
              <Input 
                placeholder="e.g. New, Beta, 3"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              Add Page to Portal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
