import React, { useState } from 'react';
import { WidgetDefinition, WidgetPlacement } from '@/types/superAdmin.types';
import { DEFAULT_WIDGET_CATALOG } from '@/services/superAdminDefaults';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Grid, 
  Search, 
  TrendingUp, 
  BarChart3, 
  Table as TableIcon, 
  List, 
  Sparkles, 
  Plus,
  Check,
  LayoutGrid
} from 'lucide-react';

interface WidgetSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleKey?: string | null;
  onAddWidget: (placement: WidgetPlacement) => void;
  existingWidgetIds?: string[];
}

export function WidgetSelectorModal({
  open,
  onOpenChange,
  roleKey = 'role',
  onAddWidget,
  existingWidgetIds = []
}: WidgetSelectorModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedColSpan, setSelectedColSpan] = useState<1 | 2 | 3 | 4>(1);

  const categories = [
    { id: 'all', label: 'All Widgets (22)' },
    { id: 'kpi', label: 'KPI Stat Cards' },
    { id: 'chart', label: 'Analytics Charts' },
    { id: 'table', label: 'Data Tables' },
    { id: 'list', label: 'Feeds & Notices' },
    { id: 'action', label: 'Quick Actions' }
  ];

  const filteredWidgets = DEFAULT_WIDGET_CATALOG.filter(w => {
    const matchesSearch = 
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase()) ||
      w.id.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || w.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleAdd = (widget: WidgetDefinition) => {
    const placement: WidgetPlacement = {
      instanceId: `inst_${widget.id}_${Date.now()}`,
      widgetId: widget.id,
      title: widget.title,
      colSpan: selectedColSpan,
      order: Date.now(),
      displayFormat: widget.category === 'chart' ? 'bar' : widget.category === 'table' ? 'table' : 'card'
    };
    onAddWidget(placement);
    onOpenChange(false);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'kpi': return TrendingUp;
      case 'chart': return BarChart3;
      case 'table': return TableIcon;
      case 'list': return List;
      default: return Sparkles;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Institutional Widget Library
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Select an institutional widget to embed into the live {(roleKey || 'Role').toUpperCase()} portal.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filters and ColSpan config */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-b border-slate-100">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Filter by widget name or metric..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-600">Grid Width:</span>
              <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
                {([1, 2, 3, 4] as const).map(span => (
                  <button
                    key={span}
                    type="button"
                    onClick={() => setSelectedColSpan(span)}
                    className={`px-2.5 py-1 text-xs font-semibold ${selectedColSpan === span ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'}`}
                  >
                    {span} Col
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Widget Grid Cards */}
        <div className="flex-1 overflow-y-auto pr-1 py-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredWidgets.map((widget) => {
            const Icon = getCategoryIcon(widget.category);
            const isAlreadyAdded = existingWidgetIds.includes(widget.id);

            return (
              <div 
                key={widget.id}
                className="border border-slate-200 rounded-xl p-4 bg-white hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">{widget.title}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                      {widget.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {widget.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {widget.id}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleAdd(widget)}
                    className="h-7 text-xs bg-slate-900 hover:bg-indigo-600 text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {isAlreadyAdded ? 'Add Duplicate' : 'Add to Dashboard'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
