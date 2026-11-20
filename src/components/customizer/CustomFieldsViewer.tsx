import React from 'react';
import { Badge } from '@/components/ui/badge';

interface CustomFieldsViewerProps {
  customFields?: Record<string, any> | null;
  className?: string;
  layout?: 'grid' | 'inline' | 'table';
}

export function CustomFieldsViewer({
  customFields,
  className = '',
  layout = 'grid'
}: CustomFieldsViewerProps) {
  if (!customFields || Object.keys(customFields).length === 0) {
    return null;
  }

  const entries = Object.entries(customFields).filter(([k, v]) => v !== undefined && v !== null && v !== '');

  if (entries.length === 0) return null;

  const formatKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (layout === 'inline') {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`}>
        {entries.map(([k, v]) => (
          <Badge key={k} variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-700 py-0.5 px-2">
            <span className="font-semibold text-slate-500 mr-1">{formatKey(k)}:</span>
            <span>{formatValue(v)}</span>
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl ${className}`}>
      <div className="col-span-full text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center space-x-1">
        <span>Custom Institutional Attributes</span>
      </div>
      {entries.map(([k, v]) => (
        <div key={k} className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] text-slate-500 font-medium">{formatKey(k)}</div>
          <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">{formatValue(v)}</div>
        </div>
      ))}
    </div>
  );
}
