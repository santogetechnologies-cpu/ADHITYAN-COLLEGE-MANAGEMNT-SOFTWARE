import React, { useState } from 'react';
import { useVisualCustomizer } from '@/context/VisualCustomizerContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit3, Check, EyeOff, RotateCcw, X } from 'lucide-react';

interface EditableTextProps {
  id: string;
  defaultText: string;
  variables?: Record<string, string>;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  style?: React.CSSProperties;
}

export function EditableText({
  id,
  defaultText,
  variables = {},
  as = 'span',
  className = '',
  style = {}
}: EditableTextProps) {
  const { isCustomizerMode, getContent, updateContent, hideContent } = useVisualCustomizer();
  const [isOpen, setIsOpen] = useState(false);

  const content = getContent(id, defaultText);

  // If hidden and not in customizer mode, don't render
  if (content.isHidden && !isCustomizerMode) {
    return null;
  }

  // Interpolate variables (e.g. {studentName} -> "John Doe")
  let displayText = content.text;
  for (const [key, value] of Object.entries(variables)) {
    displayText = displayText.replace(new RegExp(`{${key}}`, 'g'), value);
  }

  const [editText, setEditText] = useState(content.text);
  const [color, setColor] = useState((content as any).styling?.color || '');

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateContent(id, editText, {
      ...(content as any).styling,
      color: color || undefined
    });
    setIsOpen(false);
  };

  const handleHide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await hideContent(id);
    setIsOpen(false);
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(defaultText);
    await updateContent(id, defaultText);
    setIsOpen(false);
  };

  const Component = as;
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...((content as any).styling?.color ? { color: (content as any).styling.color } : {})
  };

  // If NOT in Super Admin customizer mode, render pure text
  if (!isCustomizerMode) {
    return (
      <Component className={className} style={mergedStyle}>
        {displayText}
      </Component>
    );
  }

  // In Super Admin Customizer Mode: Render text + contextual inline edit icon
  return (
    <span className="relative inline-flex items-center group/edit">
      <Component 
        className={`${className} ${content.isHidden ? 'opacity-40 line-through' : ''} transition-all`} 
        style={mergedStyle}
      >
        {displayText}
      </Component>

      {/* Contextual Edit Pencil Icon (Visible on hover or when open) */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditText(content.text); setIsOpen(true); }}
            className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-xs cursor-pointer opacity-80 group-hover/edit:opacity-100 transition-opacity z-20 shrink-0"
            title="Edit Text & Styling"
          >
            <Edit3 className="w-2.5 h-2.5" />
          </button>
        </PopoverTrigger>

        <PopoverContent 
          className="w-80 p-3 bg-white text-slate-900 border border-slate-300 shadow-xl rounded-xl z-50 text-xs space-y-3"
          side="top"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-xs text-slate-800">Edit Contextual Text</span>
            <span className="text-[10px] font-mono text-slate-400">{id}</span>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-700">Display Text</Label>
            <Input 
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="h-8 text-xs bg-white text-slate-900"
              placeholder="Enter text..."
              autoFocus
            />
            {Object.keys(variables).length > 0 && (
              <p className="text-[10px] text-slate-500">
                Variables: {Object.keys(variables).map(k => `{${k}}`).join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-700">Custom Text Color</Label>
            <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={color || '#000000'}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border border-slate-200"
              />
              <Input 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. #ffffff, #1e40af"
                className="h-7 text-[11px] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-1">
              <Button 
                type="button"
                size="sm" 
                variant="ghost" 
                onClick={handleReset}
                className="h-7 px-2 text-[11px] text-slate-500 hover:bg-slate-100"
                title="Reset to Default"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
              <Button 
                type="button"
                size="sm" 
                variant="ghost" 
                onClick={handleHide}
                className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50"
                title="Hide Element"
              >
                <EyeOff className="w-3 h-3 mr-1" />
                Hide
              </Button>
            </div>

            <Button 
              type="button"
              size="sm" 
              onClick={handleSave}
              className="h-7 px-3 text-[11px] bg-slate-900 hover:bg-indigo-600 text-white font-semibold"
            >
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}
