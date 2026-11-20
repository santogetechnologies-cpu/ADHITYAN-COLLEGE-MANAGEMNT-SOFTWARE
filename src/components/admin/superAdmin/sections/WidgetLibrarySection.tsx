import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, 
  Search, 
  BarChart3, 
  Layers, 
  Clock, 
  Users, 
  DollarSign, 
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Megaphone
} from 'lucide-react';
import { WidgetDefinition } from '@/types/superAdmin.types';
import { DEFAULT_WIDGET_CATALOG } from '@/services/superAdminDefaults';

interface WidgetLibrarySectionProps {
  catalog?: WidgetDefinition[];
}

export function WidgetLibrarySection({
  catalog = DEFAULT_WIDGET_CATALOG
}: WidgetLibrarySectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = catalog.filter(w => {
    const matchesCat = categoryFilter === 'all' || w.category === categoryFilter;
    const matchesSearch = !searchTerm || 
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Institutional Widget Library Catalog
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              {catalog.length} Live Database Widgets
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central catalog of real-time KPI indicators, analytical charts, data grids, and action shortcuts available for dashboard composition.
          </p>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search widgets by title, ID, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['all', 'kpi', 'chart', 'table', 'list', 'action'].map(cat => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className="h-7 text-xs px-2.5 font-medium uppercase whitespace-nowrap"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((w) => (
          <Card key={w.id} className="border-slate-200 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-slate-50">
                  {w.category}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">{w.id}</span>
              </div>
              <CardTitle className="text-sm font-bold text-slate-900 mt-2">{w.title}</CardTitle>
              <CardDescription className="text-xs text-slate-600 line-clamp-2 mt-1">
                {w.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default Span:</span>
                  <span className="font-semibold text-slate-800">{w.defaultColSpan} Column(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formats:</span>
                  <span className="font-medium text-slate-800">{w.supportedFormats.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supported Roles:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[140px]">
                    {w.supportedRoles.length > 0 ? w.supportedRoles.join(', ') : 'All Roles'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
