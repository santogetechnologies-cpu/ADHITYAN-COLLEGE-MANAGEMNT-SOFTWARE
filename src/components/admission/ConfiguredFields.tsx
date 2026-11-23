import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** A form field defined in Admission setup (table admission_form_fields). */
export interface FormFieldDef {
  id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';
  required: boolean;
  options: string[] | null;
  help_text: string | null;
  section: 'student' | 'parent' | 'academic' | 'other';
  course_name: string | null;
  sort_order: number;
}

/** Renders configured fields. Values are strings (checkbox: 'true'/'false'); the server validates and types them. */
export function ConfiguredFields({ fields, values, errors, onChange }: {
  fields: FormFieldDef[]; values: Record<string, any>; errors?: Record<string, string>; onChange: (key: string, value: string) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
      {fields.map((f) => {
        const v = values[f.field_key] ?? '';
        const err = errors?.[f.field_key];
        const wide = f.field_type === 'textarea';
        return (
          <div key={f.id} className={`space-y-1.5 ${wide ? 'md:col-span-2' : ''}`}>
            {f.field_type === 'checkbox' ? (
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <Checkbox checked={v === 'true' || v === true} onCheckedChange={(c) => onChange(f.field_key, c ? 'true' : 'false')} />
                {f.label}{f.required ? ' *' : ''}
              </label>
            ) : (
              <>
                <Label className="text-xs font-semibold">{f.label}{f.required ? ' *' : ''}</Label>
                {f.field_type === 'textarea' ? (
                  <Textarea rows={2} value={v} onChange={(e) => onChange(f.field_key, e.target.value)} maxLength={2000} />
                ) : f.field_type === 'select' ? (
                  <Select value={v || undefined} onValueChange={(x) => onChange(f.field_key, x)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>{(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'} value={v}
                    onChange={(e) => onChange(f.field_key, e.target.value)} className="text-xs" maxLength={500} />
                )}
              </>
            )}
            {f.help_text && !err && <p className="text-[11px] text-muted-foreground">{f.help_text}</p>}
            {err && <p className="text-[11px] text-destructive">{err}</p>}
          </div>
        );
      })}
    </div>
  );
}
