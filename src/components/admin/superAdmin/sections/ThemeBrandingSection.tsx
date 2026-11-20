import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Palette, 
  Save, 
  Loader2, 
  Sparkles, 
  Check, 
  Layout, 
  Eye 
} from 'lucide-react';
import { ThemeBrandingConfig } from '@/types/superAdmin.types';
import { DEFAULT_THEME_CONFIG } from '@/services/superAdminDefaults';

interface ThemeBrandingSectionProps {
  theme?: ThemeBrandingConfig;
  onSaveThemeDraft: (updated: ThemeBrandingConfig) => Promise<boolean>;
}

export function ThemeBrandingSection({
  theme = DEFAULT_THEME_CONFIG,
  onSaveThemeDraft
}: ThemeBrandingSectionProps) {
  const [form, setForm] = useState<ThemeBrandingConfig>(theme);
  const [saving, setSaving] = useState(false);

  const palettes = [
    { id: 'blue', name: 'Paramedical Blue', hex: '#2563eb' },
    { id: 'indigo', name: 'Academic Indigo', hex: '#4f46e5' },
    { id: 'emerald', name: 'Clinical Emerald', hex: '#059669' },
    { id: 'violet', name: 'Executive Violet', hex: '#7c3aed' },
    { id: 'rose', name: 'Crimson Rose', hex: '#e11d48' },
    { id: 'slate', name: 'Professional Slate', hex: '#475569' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveThemeDraft(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Institutional Theme & Visual Branding
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Design Tokens
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure primary color palettes, border radiuses, layout densities, and sidebar styling applied across all portals.
          </p>
        </div>

        <Button
          size="sm"
          disabled={saving}
          onClick={handleSubmit}
          className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Save Theme Draft
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Color Palette Card */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Palette className="w-4 h-4 text-primary" />
              <span>Institutional Primary Color Palette</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {palettes.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm({ ...form, colorPalette: p.id as any })}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                    form.colorPalette === p.id 
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full shadow-xs flex items-center justify-center text-white" style={{ backgroundColor: p.hex }}>
                    {form.colorPalette === p.id && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800">{p.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Layout Density & Styling */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Layout className="w-4 h-4 text-primary" />
              <span>Interface Geometry & Sidebar Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Border Radius Curvature</Label>
              <select
                value={form.borderRadius}
                onChange={(e) => setForm({ ...form, borderRadius: e.target.value as any })}
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                <option value="none">Square (none)</option>
                <option value="sm">Subtle (sm)</option>
                <option value="md">Rounded (md)</option>
                <option value="lg">Curved (lg)</option>
                <option value="xl">Pill (xl)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Layout Spacing Density</Label>
              <select
                value={form.layoutDensity}
                onChange={(e) => setForm({ ...form, layoutDensity: e.target.value as any })}
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                <option value="compact">Compact (Dense Data View)</option>
                <option value="normal">Standard (Balanced Spacing)</option>
                <option value="comfortable">Comfortable (Spacious Cards)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Sidebar Theme</Label>
              <select
                value={form.sidebarStyle}
                onChange={(e) => setForm({ ...form, sidebarStyle: e.target.value as any })}
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                <option value="light">Crisp Light (White background)</option>
                <option value="dark">Executive Dark (Slate 900)</option>
                <option value="glass">Glass Acrylic (Subtle blur)</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
