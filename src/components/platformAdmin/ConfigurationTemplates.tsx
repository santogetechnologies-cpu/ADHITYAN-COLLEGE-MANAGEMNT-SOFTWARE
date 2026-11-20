import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiCollegeService, BUILTIN_TEMPLATES } from '@/services/multiCollegeService';
import { CollegeTemplate } from '@/types/multiCollege.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Layers, 
  Sparkles, 
  Boxes, 
  Shield, 
  PlusCircle, 
  Eye, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export function ConfigurationTemplates() {
  const navigate = useNavigate();
  const templates = multiCollegeService.listTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<CollegeTemplate | null>(null);

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Platform Configuration Templates
            </h1>
            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 text-xs font-semibold">
              {templates.length} Blueprints
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reusable configuration templates for rapid college onboarding. Templates copy software configurations only, never operational student records.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => navigate('/platform-admin/provision')}
          className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
          Provision with Template
        </Button>
      </div>

      {/* 2. Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((tmpl) => (
          <Card key={tmpl.id} className="border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 mb-2">
                  <Layers className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold text-slate-600">
                  {tmpl.institution_type}
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold text-slate-900">{tmpl.template_name}</CardTitle>
              <CardDescription className="text-xs line-clamp-3 mt-1">
                {tmpl.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-0 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Pre-configured Roles:</span>
                  <span className="font-bold text-slate-900">{tmpl.roles?.length || 13} Roles</span>
                </div>
                <div className="flex justify-between">
                  <span>Pre-activated Modules:</span>
                  <span className="font-bold text-indigo-700">{tmpl.modules?.filter(m => m.enabled).length || 12} Modules</span>
                </div>
                <div className="flex justify-between">
                  <span>Classification:</span>
                  <span className="font-semibold text-slate-800">{tmpl.is_builtin ? 'System Built-in' : 'Custom'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTemplate(tmpl)}
                  className="flex-1 h-8 text-xs font-medium"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Inspect
                </Button>

                <Button
                  size="sm"
                  onClick={() => navigate('/platform-admin/provision')}
                  className="flex-1 h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Apply &rarr;
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Template Inspection Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base font-bold">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{selectedTemplate?.template_name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 pt-2 text-xs">
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center">
                  <Boxes className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                  Bundled Software Modules ({selectedTemplate.modules?.length || 0})
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {selectedTemplate.modules?.map((m: any) => (
                    <div key={m.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-800">{m.name}</span>
                      <Badge variant={m.enabled ? 'default' : 'secondary'} className="text-[9px]">
                        {m.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center">
                  <Shield className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                  Default Roles ({selectedTemplate.roles?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.roles?.map((r: any) => (
                    <Badge key={r.role} variant="outline" className="text-xs py-1 px-2.5 bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold">
                      {r.label} ({r.role})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default ConfigurationTemplates;
