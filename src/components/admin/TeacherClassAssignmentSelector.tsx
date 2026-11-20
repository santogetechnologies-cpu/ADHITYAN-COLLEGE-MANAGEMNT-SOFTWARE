import React, { useState, useMemo } from 'react';
import { 
  getAllAcademicClasses, 
  getClassesGroupedByCourse, 
  AcademicClassOption 
} from '@/config/academicClassRegistry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GraduationCap, 
  Search, 
  CheckSquare, 
  X, 
  Clock, 
  BookOpen
} from 'lucide-react';

interface TeacherClassAssignmentSelectorProps {
  selectedClasses: string[]; // Array of class displayNames or ids
  onChange: (selectedClasses: string[]) => void;
  className?: string;
  maxHeight?: string;
}

export function TeacherClassAssignmentSelector({
  selectedClasses,
  onChange,
  className = '',
  maxHeight = 'max-h-[380px]'
}: TeacherClassAssignmentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  const courseGroups = useMemo(() => getClassesGroupedByCourse(), []);
  const allClasses = useMemo(() => getAllAcademicClasses(), []);

  // Filtered course groups based on search and course filter
  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return courseGroups.map(group => {
      if (selectedCourseFilter !== 'all' && group.course.id !== selectedCourseFilter) {
        return null;
      }

      // If search term is present, filter years and semesters
      if (term) {
        const matchesCourse = 
          group.course.name.toLowerCase().includes(term) ||
          group.course.code.toLowerCase().includes(term);

        const matchingYears = group.years.map(yr => {
          const matchingSemesters = yr.semesters.filter(sem => 
            matchesCourse ||
            yr.year.toLowerCase().includes(term) ||
            sem.semester.toLowerCase().includes(term) ||
            sem.displayName.toLowerCase().includes(term) ||
            sem.shortName.toLowerCase().includes(term)
          );

          if (matchingSemesters.length === 0 && !matchesCourse) return null;
          return {
            ...yr,
            semesters: matchingSemesters.length > 0 ? matchingSemesters : yr.semesters
          };
        }).filter(Boolean) as typeof group.years;

        if (matchingYears.length === 0 && !matchesCourse) return null;
        return {
          ...group,
          years: matchingYears
        };
      }

      return group;
    }).filter(Boolean) as typeof courseGroups;
  }, [courseGroups, searchTerm, selectedCourseFilter]);

  const isClassSelected = (classOption: AcademicClassOption) => {
    return selectedClasses.includes(classOption.displayName) || selectedClasses.includes(classOption.id);
  };

  const toggleClass = (classOption: AcademicClassOption) => {
    if (isClassSelected(classOption)) {
      onChange(selectedClasses.filter(c => c !== classOption.displayName && c !== classOption.id));
    } else {
      onChange([...selectedClasses, classOption.displayName]);
    }
  };

  const selectAllInCourse = (courseId: string) => {
    const courseClasses = allClasses.filter(c => c.courseId === courseId);
    const newSelections = new Set(selectedClasses);
    courseClasses.forEach(c => newSelections.add(c.displayName));
    onChange(Array.from(newSelections));
  };

  const clearCourseSelection = (courseId: string) => {
    const courseClassNames = new Set(allClasses.filter(c => c.courseId === courseId).map(c => c.displayName));
    onChange(selectedClasses.filter(c => !courseClassNames.has(c)));
  };

  const selectAllYear1 = () => {
    const year1Classes = allClasses.filter(c => c.yearNumber === 1);
    const newSelections = new Set(selectedClasses);
    year1Classes.forEach(c => newSelections.add(c.displayName));
    onChange(Array.from(newSelections));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className={`space-y-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 text-xs ${className}`}>
      {/* Header & Stats Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-900 block">
              Assign Courses & Semesters (Multi-Select)
            </Label>
            <p className="text-[11px] text-slate-500">
              Assign valid courses, academic years, and semesters to this faculty member
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant={selectedClasses.length > 0 ? "default" : "outline"} 
            className={`font-semibold text-[11px] ${
              selectedClasses.length > 0 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "border-slate-300 text-slate-600 bg-white"
            }`}
          >
            {selectedClasses.length} {selectedClasses.length === 1 ? 'Semester' : 'Semesters'} Selected
          </Badge>

          {selectedClasses.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 px-2 text-[11px] text-slate-500 hover:text-destructive"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Selected Classes Preview Chips */}
      {selectedClasses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg bg-blue-50/70 p-2 border border-blue-200/60">
          <span className="text-[10px] font-bold text-blue-900 mr-1 self-center uppercase tracking-wider">
            Active:
          </span>
          {selectedClasses.map((item) => {
            const matched = allClasses.find(c => c.displayName === item || c.id === item);
            const label = matched ? matched.shortName : item;
            return (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200 shadow-2xs"
              >
                {label}
                <button
                  type="button"
                  onClick={() => onChange(selectedClasses.filter(c => c !== item))}
                  className="text-slate-400 hover:text-destructive transition-colors ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search & Quick Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search course, year, semester..."
            className="h-8 pl-8 text-xs bg-white border-slate-200"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAllYear1}
            className="h-8 text-[11px] bg-white border-slate-200 hover:bg-slate-100 font-medium"
          >
            <CheckSquare className="h-3 w-3 mr-1 text-blue-600" />
            + All 1st Year Semesters
          </Button>
        </div>
      </div>

      {/* Grouped Courses List */}
      <ScrollArea className={`${maxHeight} pr-2`}>
        <div className="space-y-3 pt-1">
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No academic courses or semesters match your search query.
            </div>
          ) : (
            filteredGroups.map((group) => {
              const courseSelectedCount = group.classes.filter(c => isClassSelected(c)).length;
              const allCourseSelected = courseSelectedCount === group.classes.length;

              return (
                <div 
                  key={group.course.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-slate-300 transition-all"
                >
                  {/* Course Header */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200">
                        {group.course.code}
                      </Badge>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {group.course.name}
                      </h4>
                      <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-slate-100 text-slate-600">
                        {group.course.durationYears} {group.course.durationYears === 1 ? 'Year (Sem 1 & 2)' : 'Years (Sem 1 to 6)'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {courseSelectedCount > 0 && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          {courseSelectedCount}/{group.classes.length} selected
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => allCourseSelected ? clearCourseSelection(group.course.id) : selectAllInCourse(group.course.id)}
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {allCourseSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  {/* Years & Semesters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {group.years.map((yr) => (
                      <div 
                        key={`${group.course.id}-${yr.year}`}
                        className="rounded-lg bg-slate-50/70 p-2 border border-slate-200/70 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-slate-800 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {yr.year}
                          </span>
                        </div>

                        {/* Semesters Checkboxes */}
                        <div className="space-y-1">
                          {yr.semesters.map((sem) => {
                            const checked = isClassSelected(sem);
                            return (
                              <label
                                key={sem.id}
                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-all ${
                                  checked 
                                    ? 'bg-blue-100/70 text-blue-900 font-semibold border border-blue-300' 
                                    : 'hover:bg-white text-slate-700 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleClass(sem)}
                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                  />
                                  <span className="text-[11px] truncate">
                                    {sem.semester}
                                  </span>
                                </div>
                                <span className="font-mono text-[9px] text-slate-400 shrink-0">
                                  Sem {sem.semesterNumber}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
