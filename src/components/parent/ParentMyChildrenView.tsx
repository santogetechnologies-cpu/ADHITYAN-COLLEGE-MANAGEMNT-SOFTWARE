import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, BookOpen, Calendar, CheckCircle2, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { LinkedChildItem } from './ParentChildSwitcher';

interface ParentMyChildrenViewProps {
  childrenList: LinkedChildItem[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export function ParentMyChildrenView({
  childrenList,
  selectedChildId,
  onSelectChild,
  onNavigateTab,
}: ParentMyChildrenViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Enrolled Children</h2>
        <p className="text-muted-foreground text-sm">
          All verified student records linked to your Parent account ({childrenList.length} ward{childrenList.length > 1 ? 's' : ''})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {childrenList.map((item) => {
          const s = item.student;
          const isSelected = s.id === selectedChildId;

          return (
            <Card 
              key={s.id} 
              className={`rounded-2xl shadow-sm transition-all border-2 overflow-hidden ${
                isSelected ? 'border-[#1D61E7] ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-border hover:border-slate-300'
              }`}
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-20 relative p-4 flex justify-between items-start">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-xs text-xs font-mono">
                  {s.student_id || s.roll_number || 'ID Pending'}
                </Badge>
                {isSelected && (
                  <Badge className="bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active View
                  </Badge>
                )}
              </div>

              <CardContent className="pt-0 pb-6 px-6 relative">
                <div className="-mt-10 mb-4 flex items-end justify-between">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                    <AvatarImage src={s.avatar_url || s.avatar} alt={s.name} className="object-cover" />
                    <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                      {s.name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                    {item.relationship || 'Child'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{s.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium pt-0.5">
                      {s.department || 'Paramedical Sciences'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Term / Semester:</span>
                      <span className="font-semibold text-foreground">{s.class_name || 'Semester 1'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Permanent Student ID:</span>
                      <span className="font-mono font-bold text-blue-600">{s.student_id || s.roll_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verification Status:</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Official Enrolled
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    {isSelected ? (
                      <Button 
                        className="w-full bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold text-xs"
                        onClick={() => onNavigateTab('dashboard')}
                      >
                        View Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold text-xs"
                        onClick={() => {
                          onSelectChild(s.id);
                          onNavigateTab('dashboard');
                        }}
                      >
                        Switch to {s.name.split(' ')[0]}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

