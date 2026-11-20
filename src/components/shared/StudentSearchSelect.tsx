import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Search, 
  GraduationCap, 
  Check, 
  X, 
  User, 
  Building2, 
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { Profile } from '@/types/database.types';

interface StudentSearchSelectProps {
  selectedStudentId?: string; // Can be UUID or human-readable Student ID
  value?: string;             // Alias for selectedStudentId
  onSelectStudent?: (student: Profile | null) => void;
  onSelect?: (student: Profile | null) => void;       // Alias for onSelectStudent
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  filterDepartment?: string;
  filterClass?: string;
}

export function StudentSearchSelect({
  selectedStudentId,
  value,
  onSelectStudent,
  onSelect,
  placeholder = 'Search by Student ID (e.g. AIP-2025-1001) or Name...',
  label,
  required = false,
  disabled = false,
  className = '',
  filterDepartment,
  filterClass,
}: StudentSearchSelectProps) {
  const effectiveStudentId = value ?? selectedStudentId;
  const handleSelectCallback = onSelect ?? onSelectStudent;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load initially selected student if ID provided
  useEffect(() => {
    let isCancelled = false;
    async function loadSelected() {
      if (!effectiveStudentId) {
        setSelectedStudent(null);
        return;
      }
      try {
        const student = await db.getStudentByStudentId(effectiveStudentId);
        if (!isCancelled && student) {
          setSelectedStudent(student);
        }
      } catch (err) {
        console.warn('StudentSearchSelect loadSelected error:', err);
      }
    }
    loadSelected();
    return () => {
      isCancelled = true;
    };
  }, [effectiveStudentId]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      // If empty query, load top active students for easy selection
      setLoading(true);
      try {
        const all = await db.getAllStudents();
        let filtered = all;
        if (filterDepartment) {
          filtered = filtered.filter(s => s.department === filterDepartment);
        }
        if (filterClass) {
          filtered = filtered.filter(s => s.class_name === filterClass);
        }
        setResults(filtered.slice(0, 10));
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const searchRes = await db.searchStudents(searchTerm);
      let filtered = searchRes;
      if (filterDepartment) {
        filtered = filtered.filter(s => s.department === filterDepartment);
      }
      if (filterClass) {
        filtered = filtered.filter(s => s.class_name === filterClass);
      }
      setResults(filtered);
    } catch (err) {
      console.warn('searchStudents failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filterDepartment, filterClass]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      handleSearch(val);
    }, 250);
  };

  const handleSelect = (student: Profile) => {
    setSelectedStudent(student);
    setIsOpen(false);
    setQuery('');
    handleSelectCallback?.(student);
  };

  const handleClear = () => {
    setSelectedStudent(null);
    setQuery('');
    setResults([]);
    handleSelectCallback?.(null);
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {selectedStudent ? (
        // Selected Student Preview Card
        <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl shadow-2xs">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-[#1D61E7] flex items-center justify-center font-bold text-xs shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-xs truncate">
                  {selectedStudent.name}
                </span>
                <Badge className="bg-[#1D61E7] text-white text-[10px] font-mono px-2 py-0 shrink-0">
                  {selectedStudent.student_id || selectedStudent.roll_number || 'ID Pending'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 truncate">
                {selectedStudent.department || 'Paramedical Sciences'} • {selectedStudent.class_name || 'Enrolled'}
              </p>
            </div>
          </div>

          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 rounded-lg shrink-0 ml-2"
              title="Change student"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ) : (
        // Search Input Field
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <Input
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setIsOpen(true);
              if (results.length === 0) handleSearch(query);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-9 pr-8 text-xs h-9 bg-white border-slate-200 rounded-xl"
          />
          {loading && (
            <Loader2 className="w-3.5 h-3.5 absolute right-3 top-3 animate-spin text-primary pointer-events-none" />
          )}

          {/* Results Dropdown */}
          {isOpen && (
            <Card className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-1">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1D61E7]" />
                  <span>Searching student records...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                  <AlertCircle className="w-5 h-5 mx-auto text-slate-300" />
                  <p className="font-medium">No matching student found</p>
                  <p className="text-[10px] text-slate-400">
                    Verify the Student ID format (e.g. AIP-2025-1001) or check spelling
                  </p>
                </div>
              ) : (
                results.map((student) => {
                  const studentCode = student.student_id || student.roll_number || 'AIP-ID';
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSelect(student)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group border border-transparent hover:border-slate-200"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-[#1D61E7] transition-colors truncate">
                            {student.name}
                          </span>
                          <Badge className="bg-blue-50 text-[#1D61E7] border-blue-200 text-[10px] font-mono font-bold px-1.5 py-0">
                            {studentCode}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center space-x-2 mt-0.5">
                          <span>{student.department || 'Paramedical Sciences'}</span>
                          <span>•</span>
                          <span>{student.class_name || 'Current Term'}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-slate-300 group-hover:text-[#1D61E7] transition-colors">
                        <Check className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

