import React, { useState } from 'react';
import { useVisualCustomizer } from '@/context/VisualCustomizerContext';
import { InjectedComponent } from '@/types/visualCustomizer.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  TrendingUp, 
  Megaphone, 
  ArrowRight, 
  Layers, 
  Edit3, 
  X,
  Bell,
  Award
} from 'lucide-react';

interface EditableZoneProps {
  zoneId: string;
  className?: string;
}

export function EditableZone({ zoneId, className = '' }: EditableZoneProps) {
  const { isCustomizerMode, getInjectedComponents, addInjectedComponent, removeInjectedComponent } = useVisualCustomizer();
  const components = getInjectedComponents(zoneId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [componentType, setComponentType] = useState<InjectedComponent['type']>('banner');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState<InjectedComponent['theme']>('indigo');
  const [statValue, setStatValue] = useState('');
  const [statChange, setStatChange] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonAction, setButtonAction] = useState('');

  const handleAddComponent = async () => {
    if (!title.trim() && !content.trim() && !statValue.trim() && !buttonLabel.trim()) {
      return;
    }

    await addInjectedComponent(zoneId, {
      type: componentType,
      title: title.trim() || undefined,
      content: content.trim() || undefined,
      theme,
      statValue: statValue.trim() || undefined,
      statChange: statChange.trim() || undefined,
      buttonLabel: buttonLabel.trim() || undefined,
      buttonAction: buttonAction.trim() || undefined
    });

    // Reset
    setTitle('');
    setContent('');
    setStatValue('');
    setStatChange('');
    setButtonLabel('');
    setButtonAction('');
    setDialogOpen(false);
  };

  const getThemeClasses = (t?: string) => {
    switch (t) {
      case 'emerald':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'amber':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'rose':
        return 'bg-rose-50 border-rose-200 text-rose-900';
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-indigo-50 border-indigo-200 text-indigo-900';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Render all injected components for this zone */}
      {components.map((comp) => (
        <div key={comp.id} className="relative group/comp transition-all">
          {/* Super Admin Contextual Delete Icon */}
          {isCustomizerMode && (
            <div className="absolute top-2 right-2 z-30 opacity-80 group-hover/comp:opacity-100 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => removeInjectedComponent(zoneId, comp.id)}
                className="w-6 h-6 rounded-md bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs text-[10px]"
                title="Delete Component"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Component Types */}
          {comp.type === 'banner' && (
            <div className={`p-4 rounded-2xl border shadow-xs flex items-start space-x-3 ${getThemeClasses(comp.theme)}`}>
              <div className="w-9 h-9 rounded-xl bg-white/80 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                <Megaphone className="w-4 h-4 text-slate-800" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                {comp.title && <h4 className="text-sm font-bold">{comp.title}</h4>}
                {comp.content && <p className="text-xs mt-0.5 opacity-90">{comp.content}</p>}
              </div>
            </div>
          )}

          {comp.type === 'stat_card' && (
            <Card className="border border-slate-200 shadow-2xs bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{comp.title}</span>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">{comp.statValue}</div>
                  {comp.statChange && <span className="text-[11px] text-emerald-600 font-medium">{comp.statChange}</span>}
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          )}

          {comp.type === 'action_button' && (
            <Button
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold h-10 shadow-sm"
              onClick={() => {
                if (comp.buttonAction) {
                  if (comp.buttonAction.startsWith('/')) {
                    window.location.href = comp.buttonAction;
                  } else {
                    const params = new URLSearchParams(window.location.search);
                    params.set('tab', comp.buttonAction);
                    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                    window.dispatchEvent(new Event('popstate'));
                  }
                }
              }}
            >
              <span>{comp.buttonLabel || comp.title}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}

          {comp.type === 'section' && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">{comp.title}</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{comp.content}</p>
            </div>
          )}
        </div>
      ))}

      {/* 2. Contextual [+] Add Component Button (Visible ONLY in Super Admin Customizer Mode) */}
      {isCustomizerMode && (
        <div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="w-full py-2.5 px-3 border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/20 hover:bg-indigo-50/60 rounded-xl text-indigo-700 hover:text-indigo-900 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer group/btn"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-100 group-hover/btn:bg-indigo-200 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-indigo-700" />
            </div>
            <span>+ Add New Banner, Card, or Content in this Zone</span>
          </button>

          {/* Modal to Configure New Component */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md p-6">
              <DialogHeader>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900">
                      Add Component to Live Portal
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Zone: {zoneId}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3.5 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Component Type</Label>
                  <Select value={componentType} onValueChange={(val: any) => setComponentType(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner" className="text-xs">Banner / Notice Alert</SelectItem>
                      <SelectItem value="stat_card" className="text-xs">Analytics Stat Card</SelectItem>
                      <SelectItem value="action_button" className="text-xs">Interactive Action Button</SelectItem>
                      <SelectItem value="section" className="text-xs">Custom Titled Section</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {componentType === 'banner' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Banner Title</Label>
                      <Input 
                        placeholder="e.g. Clinical Schedule Updates" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        className="h-8 text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Message Content</Label>
                      <Textarea 
                        placeholder="Detailed announcement text..." 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        className="text-xs min-h-[60px]" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Color Theme</Label>
                      <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="indigo" className="text-xs">Indigo / Deep Purple</SelectItem>
                          <SelectItem value="emerald" className="text-xs">Emerald / Green</SelectItem>
                          <SelectItem value="amber" className="text-xs">Amber / Warning</SelectItem>
                          <SelectItem value="rose" className="text-xs">Rose / Urgent</SelectItem>
                          <SelectItem value="blue" className="text-xs">Ocean Blue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {componentType === 'stat_card' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Stat Label</Label>
                      <Input 
                        placeholder="e.g. Practical Hours Completed" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        className="h-8 text-xs" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Metric Value</Label>
                        <Input 
                          placeholder="e.g. 180 / 240 hrs" 
                          value={statValue} 
                          onChange={(e) => setStatValue(e.target.value)} 
                          className="h-8 text-xs font-bold" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Subtitle / Change</Label>
                        <Input 
                          placeholder="e.g. +12 hrs this week" 
                          value={statChange} 
                          onChange={(e) => setStatChange(e.target.value)} 
                          className="h-8 text-xs" 
                        />
                      </div>
                    </div>
                  </>
                )}

                {componentType === 'action_button' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Button Label</Label>
                      <Input 
                        placeholder="e.g. Open Lab Booking Desk" 
                        value={buttonLabel} 
                        onChange={(e) => setButtonLabel(e.target.value)} 
                        className="h-8 text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Target Tab or Route</Label>
                      <Input 
                        placeholder="e.g. timetable, fees, or /admin/departments" 
                        value={buttonAction} 
                        onChange={(e) => setButtonAction(e.target.value)} 
                        className="h-8 text-xs font-mono" 
                      />
                    </div>
                  </>
                )}

                {componentType === 'section' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Section Title</Label>
                      <Input 
                        placeholder="e.g. Clinical Telemetry & Internships" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        className="h-8 text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Content Description</Label>
                      <Textarea 
                        placeholder="Section content or instructions..." 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        className="text-xs min-h-[70px]" 
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleAddComponent} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Insert into Live Portal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
