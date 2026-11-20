import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check, Users, GraduationCap, Building2, User } from 'lucide-react';
import { Profile } from '@/types/database.types';

export interface LinkedChildItem {
  linkId: string;
  relationship: string;
  student: Profile;
}

interface ParentChildSwitcherProps {
  childrenList: LinkedChildItem[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}

export function ParentChildSwitcher({
  childrenList,
  selectedChildId,
  onSelectChild,
}: ParentChildSwitcherProps) {
  const activeChild = childrenList.find(c => c.student.id === selectedChildId)?.student || childrenList[0]?.student;

  if (!activeChild) return null;

  // Single child display: Show child card directly without forcing a switch dropdown
  if (childrenList.length === 1) {
    return (
      <div className="flex items-center gap-3 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-xs">
        <Avatar className="h-10 w-10 border-2 border-white/60 shadow-sm shrink-0">
          <AvatarImage src={activeChild.avatar_url || activeChild.avatar} alt={activeChild.name} className="object-cover" />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {activeChild.name?.charAt(0) || 'S'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground truncate">{activeChild.name}</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200">
              {activeChild.student_id || activeChild.roll_number || 'ID Pending'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 pt-0.5">
            <span>{activeChild.department || 'Paramedical Sciences'}</span>
            <span>•</span>
            <span>{activeChild.class_name || 'Semester 1'}</span>
          </p>
        </div>
      </div>
    );
  }

  // Multiple children: Display child switcher dropdown with photo, name, Student ID, course, semester
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-auto py-2 px-3.5 bg-white/15 dark:bg-slate-900/50 hover:bg-white/25 border-white/30 dark:border-slate-700 rounded-2xl shadow-xs transition-smooth text-left flex items-center gap-3 min-w-[240px] max-w-sm"
        >
          <Avatar className="h-10 w-10 border-2 border-primary/40 shadow-sm shrink-0">
            <AvatarImage src={activeChild.avatar_url || activeChild.avatar} alt={activeChild.name} className="object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {activeChild.name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 leading-tight">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-sm text-foreground truncate">{activeChild.name}</span>
              <Badge className="text-[10px] py-0 px-1 font-mono bg-[#1D61E7] text-white">
                {activeChild.student_id || activeChild.roll_number || 'STU-ID'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate pt-0.5">
              {activeChild.department || 'Paramedical Sciences'} • {activeChild.class_name || 'Semester 1'}
            </p>
          </div>

          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-2 shadow-xl rounded-2xl border-border">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" /> Switch Linked Child ({childrenList.length})
          </span>
          <span className="text-[10px] font-normal text-muted-foreground">Admin Verified</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        {childrenList.map((item) => {
          const isSelected = item.student.id === activeChild.id;
          const s = item.student;

          return (
            <DropdownMenuItem
              key={s.id}
              onClick={() => onSelectChild(s.id)}
              className={`p-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition-colors ${
                isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
              }`}
            >
              <Avatar className="h-9 w-9 border border-border shrink-0">
                <AvatarImage src={s.avatar_url || s.avatar} alt={s.name} className="object-cover" />
                <AvatarFallback className="text-xs font-bold">
                  {s.name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground truncate">{s.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-1" />}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                  <span className="font-mono text-primary font-medium">{s.student_id || s.roll_number || 'ID'}</span>
                  <span>•</span>
                  <span className="truncate">{s.department || 'Course'}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{s.class_name || 'Semester 1'} ({item.relationship})</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

