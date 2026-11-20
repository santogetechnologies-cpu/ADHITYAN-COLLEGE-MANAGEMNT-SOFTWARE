import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Lock, 
  ArrowUp, 
  ArrowDown,
  CheckCircle2,
  AlertTriangle 
} from 'lucide-react';
import { FormBuilderConfig, FormFieldConfig } from '@/types/superAdmin.types';
import { DEFAULT_FORMS } from '@/services/superAdminDefaults';

interface FormBuilderSectionProps {
  forms?: Record<string, FormBuilderConfig>;
  onSaveFormDraft?: (formId: string, updatedForm: FormBuilderConfig) => Promise<boolean>;
}

export function FormBuilderSection({
  forms = DEFAULT_FORMS,
  onSaveFormDraft
}: FormBuilderSectionProps) {
  const formKeys = Object.keys(forms);
  const [selectedFormId, setSelectedFormId] = useState<string>(formKeys[0] || 'candidate_admission');
  const [currentForm, setCurrentForm] = useState<FormBuilderConfig>(forms[selectedFormId] || DEFAULT_FORMS.candidate_admission);
  const [saving, setSaving] = useState(false);

  const handleFormChange = (id: string) => {
    setSelectedFormId(id);
    setCurrentForm(forms[id] || DEFAULT_FORMS.candidate_admission);
  };

  const handleFieldLabelChange = (fieldId: string, label: string) => {
    const updated = currentForm.fields.map(f => f.id === fieldId ? { ...f, label } : f);
    setCurrentForm({ ...currentForm, fields: updated });
  };

  const handleToggleRequired = (fieldId: string) => {
    const target = currentForm.fields.find(f => f.id === fieldId);
    if (target?.isSystemRequired) {
      alert('Security Policy: Core mandatory database fields cannot be set to optional.');
      return;
    }
    const updated = currentForm.fields.map(f => f.id === fieldId ? { ...f, required: !f.required } : f);
    setCurrentForm({ ...currentForm, fields: updated });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const fields = [...currentForm.fields];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;

    const temp = fields[index];
    fields[index] = fields[targetIdx];
    fields[targetIdx] = temp;

    fields.forEach((f, i) => { f.order = i + 1; });
    setCurrentForm({ ...currentForm, fields });
  };

  const handleRemoveField = (fieldId: string) => {
    const target = currentForm.fields.find(f => f.id === fieldId);
    if (target?.isSystemRequired) {
      alert('Security Policy: System core database fields cannot be deleted.');
      return;
    }
    const updated = currentForm.fields.filter(f => f.id !== fieldId);
    updated.forEach((f, i) => { f.order = i + 1; });
    setCurrentForm({ ...currentForm, fields: updated });
  };

  const handleAddField = () => {
    const newField: FormFieldConfig = {
      id: `field_${Date.now()}`,
      key: `custom_field_${currentForm.fields.length + 1}`,
      label: 'New Form Field',
      type: 'text',
      required: false,
      isSystemRequired: false,
      order: currentForm.fields.length + 1,
      visible: true
    };
    setCurrentForm({
      ...currentForm,
      fields: [...currentForm.fields, newField]
    });
  };

  const handleSave = async () => {
    if (!onSaveFormDraft) return;
    setSaving(true);
    try {
      await onSaveFormDraft(selectedFormId, currentForm);
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
              Form Builder & Field Schema Configuration
            </h2>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              Database Integrated
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure labels, field requirements, and dropdown choices. Mandatory database schema constraints are strictly preserved.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedFormId}
            onChange={(e) => handleFormChange(e.target.value)}
            className="h-8 px-2.5 text-xs font-semibold border border-slate-200 rounded-md bg-white text-slate-800 shadow-2xs"
          >
            {formKeys.map(k => (
              <option key={k} value={k}>
                {forms[k]?.name || k}
              </option>
            ))}
          </select>

          {onSaveFormDraft && (
            <Button
              size="sm"
              disabled={saving}
              onClick={handleSave}
              className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save Form Draft
            </Button>
          )}
        </div>
      </div>

      {/* 2. Fields Manager */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              {currentForm.name} ({currentForm.fields.length} Fields)
            </CardTitle>
            <CardDescription className="text-xs">
              Mapped to Supabase table: <span className="font-mono font-semibold text-slate-800">{currentForm.targetTable}</span>
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddField} className="h-7 text-xs font-medium">
            <Plus className="w-3 h-3 mr-1" /> Add Field
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {currentForm.fields.map((field, idx) => (
            <div
              key={field.id}
              className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {field.order}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={field.label}
                      onChange={(e) => handleFieldLabelChange(field.id, e.target.value)}
                      className="h-7 text-xs font-semibold max-w-xs"
                    />
                    <Badge variant="outline" className="text-[9px] uppercase font-mono bg-slate-50">
                      {field.type}
                    </Badge>
                    {field.isSystemRequired && (
                      <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center">
                        <Lock className="w-2.5 h-2.5 mr-0.5" /> Schema Core
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">
                    db_column: {field.key}
                  </span>
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
                  disabled={idx === currentForm.fields.length - 1}
                  onClick={() => handleMove(idx, 'down')}
                  className="h-7 w-7 p-0 text-slate-500"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleRequired(field.id)}
                  className={`h-7 px-2 text-[10px] font-semibold ${field.required ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-slate-500'}`}
                >
                  {field.required ? 'Mandatory *' : 'Optional'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={field.isSystemRequired}
                  onClick={() => handleRemoveField(field.id)}
                  className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
