import React, { useState } from 'react';
import { useVisualCustomizer } from '@/context/VisualCustomizerContext';
import { FormFieldDefinition, CustomFieldType } from '@/types/visualCustomizer.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit3, Check, FileText, Calendar, Hash, CheckSquare, Upload, AlertCircle } from 'lucide-react';

interface DynamicFormFieldsProps {
  formId: string;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
  className?: string;
}

export function DynamicFormFields({
  formId,
  values,
  onChange,
  errors = {},
  className = ''
}: DynamicFormFieldsProps) {
  const { isCustomizerMode, getFormConfig, addFormField, updateFormField, removeFormField } = useVisualCustomizer();
  const formCfg = getFormConfig(formId);
  const fields = formCfg.customFields || [];

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldDefinition | null>(null);

  // Field form state
  const [label, setLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [placeholder, setPlaceholder] = useState('');
  const [optionsStr, setOptionsStr] = useState('');
  const [required, setRequired] = useState(false);
  const [helpText, setHelpText] = useState('');

  const handleOpenAdd = () => {
    setLabel('');
    setFieldKey('');
    setFieldType('text');
    setPlaceholder('');
    setOptionsStr('');
    setRequired(false);
    setHelpText('');
    setEditingField(null);
    setAddModalOpen(true);
  };

  const handleOpenEdit = (field: FormFieldDefinition) => {
    setEditingField(field);
    setLabel(field.label);
    setFieldKey(field.key);
    setFieldType(field.type);
    setPlaceholder(field.placeholder || '');
    setOptionsStr((field.options || []).join(', '));
    setRequired(field.required);
    setHelpText(field.helpText || '');
    setAddModalOpen(true);
  };

  const handleSaveField = async () => {
    if (!label.trim()) return;
    const finalKey = fieldKey.trim() || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    const options = optionsStr ? optionsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    if (editingField) {
      await updateFormField(formId, editingField.id, {
        label: label.trim(),
        key: finalKey,
        type: fieldType,
        placeholder: placeholder.trim() || undefined,
        options,
        required,
        helpText: helpText.trim() || undefined
      });
    } else {
      await addFormField(formId, {
        label: label.trim(),
        key: finalKey,
        type: fieldType,
        placeholder: placeholder.trim() || undefined,
        options,
        required,
        helpText: helpText.trim() || undefined
      });
    }

    setAddModalOpen(false);
  };

  const renderFieldInput = (field: FormFieldDefinition) => {
    const val = values[field.key] ?? field.defaultValue ?? '';
    const err = errors[field.key];

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label}...`}
            className="text-xs min-h-[60px]"
            required={field.required}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || '0'}
            className="text-xs h-9"
            required={field.required}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="text-xs h-9"
            required={field.required}
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id={`chk_${field.id}`}
              checked={Boolean(val)}
              onCheckedChange={(checked) => onChange(field.key, Boolean(checked))}
            />
            <label htmlFor={`chk_${field.id}`} className="text-xs text-slate-700 cursor-pointer select-none">
              {field.placeholder || 'Confirm / Yes'}
            </label>
          </div>
        );
      case 'dropdown':
        return (
          <Select value={val} onValueChange={(selected) => onChange(field.key, selected)}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder={field.placeholder || 'Select option...'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'file':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onChange(field.key, file.name);
                }
              }}
              className="text-xs h-9 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700"
              required={field.required}
            />
            {val && <span className="text-[11px] text-slate-500 truncate max-w-xs">{val}</span>}
          </div>
        );
      default:
        return (
          <Input
            type="text"
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label}...`}
            className="text-xs h-9"
            required={field.required}
          />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Render all dynamic custom fields */}
      {fields.map((field) => (
        <div key={field.id} className="relative group/field space-y-1.5 p-2 rounded-xl hover:bg-slate-50/60 transition-colors">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-rose-500">*</span>}
            </Label>

            {/* Contextual Edit & Delete Icons for Super Admin */}
            {isCustomizerMode && (
              <div className="flex items-center space-x-1 opacity-80 group-hover/field:opacity-100 transition-opacity">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {field.key} ({field.type})
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(field)}
                  className="p-1 rounded-md text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                  title="Edit Field Configuration"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFormField(formId, field.id)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Delete Field"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Actual Input */}
          {renderFieldInput(field)}

          {field.helpText && (
            <p className="text-[10px] text-slate-500">{field.helpText}</p>
          )}

          {errors[field.key] && (
            <p className="text-[10px] text-rose-500 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors[field.key]}</span>
            </p>
          )}
        </div>
      ))}

      {/* 2. Contextual [+ Add Field] Button for Super Admin */}
      {isCustomizerMode && (
        <div className="pt-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full py-2 px-3 border border-dashed border-indigo-400 hover:border-indigo-600 bg-indigo-50/30 hover:bg-indigo-50/70 rounded-xl text-indigo-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Field to this Form</span>
          </button>
        </div>
      )}

      {/* Field Configuration Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {editingField ? 'Edit Form Field' : 'Add New Form Field'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Form: {formId} • Value will be saved in the database when users submit.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Field Label</Label>
              <Input
                placeholder="e.g. Emergency Contact Blood Group, Aadhar Number"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  if (!editingField && !fieldKey) {
                    setFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, ''));
                  }
                }}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Database Key</Label>
                <Input
                  placeholder="e.g. aadhar_no"
                  value={fieldKey}
                  onChange={(e) => setFieldKey(e.target.value)}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Field Type</Label>
                <Select value={fieldType} onValueChange={(val: CustomFieldType) => setFieldType(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text" className="text-xs">Short Text</SelectItem>
                    <SelectItem value="textarea" className="text-xs">Multi-line Textarea</SelectItem>
                    <SelectItem value="number" className="text-xs">Number</SelectItem>
                    <SelectItem value="dropdown" className="text-xs">Dropdown / Select</SelectItem>
                    <SelectItem value="date" className="text-xs">Date Picker</SelectItem>
                    <SelectItem value="checkbox" className="text-xs">Checkbox</SelectItem>
                    <SelectItem value="file" className="text-xs">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {fieldType === 'dropdown' && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Dropdown Options (Comma-separated)</Label>
                <Input
                  placeholder="e.g. Option A, Option B, Option C"
                  value={optionsStr}
                  onChange={(e) => setOptionsStr(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Placeholder Text</Label>
              <Input
                placeholder="Optional input placeholder..."
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Help / Subtitle Note</Label>
              <Input
                placeholder="Optional guidance text below input..."
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
              <Checkbox
                id="req_field"
                checked={required}
                onCheckedChange={(checked) => setRequired(Boolean(checked))}
              />
              <label htmlFor="req_field" className="text-xs text-slate-700 font-semibold cursor-pointer">
                Mandatory / Required Field
              </label>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSaveField} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              {editingField ? 'Save Changes' : 'Add to Form Schema'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
