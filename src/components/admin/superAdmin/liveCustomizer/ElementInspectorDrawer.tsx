import React, { useState, useEffect } from 'react';
import { WidgetPlacement } from '@/types/superAdmin.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sliders, Check, Trash2, X } from 'lucide-react';

interface ElementInspectorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: WidgetPlacement | null;
  onSaveWidget: (updated: WidgetPlacement) => void;
  onDeleteWidget: (instanceId: string) => void;
}

export function ElementInspectorDrawer({
  open,
  onOpenChange,
  widget,
  onSaveWidget,
  onDeleteWidget
}: ElementInspectorDrawerProps) {
  const [title, setTitle] = useState('');
  const [colSpan, setColSpan] = useState<1 | 2 | 3 | 4>(1);
  const [displayFormat, setDisplayFormat] = useState<WidgetPlacement['displayFormat']>('card');

  useEffect(() => {
    if (widget) {
      setTitle(widget.title || '');
      setColSpan(widget.colSpan || 1);
      setDisplayFormat(widget.displayFormat || 'card');
    }
  }, [widget]);

  if (!widget) return null;

  const handleSave = () => {
    onSaveWidget({
      ...widget,
      title: title.trim() || undefined,
      colSpan,
      displayFormat
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDeleteWidget(widget.instanceId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Inspect Widget Properties
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                ID: {widget.widgetId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Display Title</Label>
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Custom widget title..."
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Column Width</Label>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as const).map(span => (
                <button
                  key={span}
                  type="button"
                  onClick={() => setColSpan(span)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    colSpan === span
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {span} Col
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Display Format</Label>
            <Select value={displayFormat} onValueChange={(val: any) => setDisplayFormat(val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card" className="text-xs">Stat Card (KPI)</SelectItem>
                <SelectItem value="bar" className="text-xs">Bar Chart</SelectItem>
                <SelectItem value="line" className="text-xs">Line Chart</SelectItem>
                <SelectItem value="table" className="text-xs">Data Table</SelectItem>
                <SelectItem value="list" className="text-xs">List Feed</SelectItem>
                <SelectItem value="gauge" className="text-xs">Progress Gauge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Remove from Dashboard
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              Apply Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
