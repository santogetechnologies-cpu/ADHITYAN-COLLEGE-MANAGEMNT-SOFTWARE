import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  GraduationCap, 
  Users, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Loader2, 
  UserCheck 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StudentSearchResult {
  id: string;
  name: string;
  student_id: string;
  email: string;
  phone?: string;
  department?: string;
  class_name?: string;
  status?: string;
  guardians: Array<{
    parent_id: string;
    parent_login_id?: string;
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
    verified: boolean;
  }>;
}

interface ComprehensiveStudentSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComprehensiveStudentSearchDialog({
  open,
  onOpenChange,
}: ComprehensiveStudentSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const clean = query.trim();
    if (!clean) return;

    setLoading(true);
    setSearched(true);
    try {
      const qLower = clean.toLowerCase();
      const matchedStudentIds = new Set<string>();
      const studentMap = new Map<string, any>();

      // 1. Direct Student Profile Search (Student ID, Roll Number, Name, Phone, Email)
      const { data: stdProfiles, error: stdErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (!stdErr && stdProfiles) {
        for (const p of stdProfiles) {
          const sId = (p.student_id || p.roll_number || p.login_id || '').toLowerCase();
          const pName = (p.name || `${p.first_name || ''} ${p.last_name || ''}`).toLowerCase();
          const pPhone = (p.phone || '').toLowerCase();
          const pEmail = (p.email || '').toLowerCase();

          if (
            sId.includes(qLower) ||
            pName.includes(qLower) ||
            pPhone.includes(qLower) ||
            pEmail.includes(qLower)
          ) {
            matchedStudentIds.add(p.id);
            studentMap.set(p.id, p);
          }
        }
      }

      // 2. Parent ID & Parent Phone Search (Resolve linked students via parent_student_links)
      const { data: parentProfiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'parent');

      if (!pErr && parentProfiles) {
        const matchedParentIds = parentProfiles
          .filter(p => {
            const parLoginId = (p.login_id || '').toLowerCase();
            const parName = (p.name || '').toLowerCase();
            const parPhone = (p.phone || '').toLowerCase();
            const parEmail = (p.email || '').toLowerCase();

            return (
              parLoginId.includes(qLower) ||
              parName.includes(qLower) ||
              parPhone.includes(qLower) ||
              parEmail.includes(qLower)
            );
          })
          .map(p => p.id);

        if (matchedParentIds.length > 0) {
          const { data: links } = await supabase
            .from('parent_student_links')
            .select('student_id')
            .in('parent_id', matchedParentIds);

          if (links) {
            for (const l of links) {
              matchedStudentIds.add(l.student_id);
            }
          }
        }
      }

      // 3. For all matched student IDs, fetch full profile and all linked guardians
      const studentIdList = Array.from(matchedStudentIds);
      if (studentIdList.length === 0) {
        setResults([]);
        return;
      }

      // Ensure we have profiles for all matched IDs
      for (const sId of studentIdList) {
        if (!studentMap.has(sId)) {
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sId)
            .maybeSingle();
          if (p) studentMap.set(sId, p);
        }
      }

      // Fetch all guardian links for matched students
      const { data: allLinks } = await supabase
        .from('parent_student_links')
        .select('parent_id, student_id, relationship, verified')
        .in('student_id', studentIdList);

      const parentIds = (allLinks || []).map(l => l.parent_id);
      let parentProfileMap = new Map<string, any>();
      if (parentIds.length > 0) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('id, name, login_id, phone, email')
          .in('id', parentIds);
        if (pData) {
          pData.forEach(p => parentProfileMap.set(p.id, p));
        }
      }

      // Assemble rich results
      const finalResults: StudentSearchResult[] = [];
      for (const sId of studentIdList) {
        const p = studentMap.get(sId);
        if (!p) continue;

        const studentLinks = (allLinks || []).filter(l => l.student_id === sId);
        const guardians = studentLinks.map(l => {
          const parentProfile = parentProfileMap.get(l.parent_id);
          return {
            parent_id: l.parent_id,
            parent_login_id: parentProfile?.login_id || 'PAR-UNASSIGNED',
            name: parentProfile?.name || 'Registered Guardian',
            relationship: l.relationship || 'Guardian',
            phone: parentProfile?.phone,
            email: parentProfile?.email,
            verified: l.verified ?? true
          };
        });

        finalResults.push({
          id: p.id,
          name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Student',
          student_id: p.student_id || p.roll_number || p.login_id || 'STU-PENDING',
          email: p.email,
          phone: p.phone,
          department: p.department,
          class_name: p.class_name,
          status: p.status || 'active',
          guardians
        });
      }

      setResults(finalResults);
    } catch (err) {
      console.error('Student search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Comprehensive Student Front-Office Search</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instant search across Student ID (STU-...), Name, Mobile Phone & Parent ID (PAR-...)
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Student ID (e.g. STU-2026-1042), Name, Phone, or Parent ID (PAR-2026-1042)..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !query.trim()} className="px-5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Search className="h-4 w-4 mr-1.5" />}
              Search
            </Button>
          </div>

          {/* Results List */}
          <div className="space-y-3 pt-1">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-xs">Querying institutional database records...</p>
              </div>
            ) : searched && results.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border rounded-xl bg-muted/20">
                <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-sm">No Student Records Found</p>
                <p className="text-xs mt-1">
                  No matching student or parent records found for <span className="font-mono font-medium text-foreground">"{query}"</span>.
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Found {results.length} student record{results.length > 1 ? 's' : ''}</span>
                  <span>Institutional Database</span>
                </div>
                {results.map((student) => (
                  <Card key={student.id} className="border hover:border-primary/40 transition-colors shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      {/* Top Student Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base">{student.name}</span>
                              <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                                {student.student_id}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {student.department || 'Enrolled Student'} • {student.class_name || 'Semester 1'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize text-emerald-700 border-emerald-300 bg-emerald-50">
                            <UserCheck className="w-3 h-3 mr-1" />
                            {student.status || 'Active'}
                          </Badge>
                        </div>
                      </div>

                      {/* Contact Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{student.phone || 'Phone not registered'}</span>
                        </div>
                      </div>

                      {/* Linked Guardians Box */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>Linked Guardian & Parent Account</span>
                        </div>
                        {student.guardians.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-5">
                            No parent account linked yet. Link parent during admission confirmation.
                          </p>
                        ) : (
                          <div className="space-y-1 pl-5">
                            {student.guardians.map((g) => (
                              <div key={g.parent_id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                                <div>
                                  <span className="font-medium text-foreground">{g.name}</span>{' '}
                                  <span className="text-muted-foreground">({g.relationship})</span>
                                  {g.phone && <span className="text-muted-foreground ml-2">• 📞 {g.phone}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono text-[11px] text-blue-700 bg-blue-100">
                                    {g.parent_login_id}
                                  </Badge>
                                  {g.verified && (
                                    <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                                      <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Enter a Student ID, student name, phone number, or Parent ID above to search live database records.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

