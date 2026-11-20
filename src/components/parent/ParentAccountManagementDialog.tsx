import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  UserPlus,
  Link as LinkIcon,
  Search,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parentLinkingService, ParentAccountSummary } from '@/services/parentLinkingService';
import { StudentSearchSelect } from '@/components/shared/StudentSearchSelect';
import { Profile } from '@/types/database.types';

interface ParentAccountManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStudent?: Profile | null;
  onSuccess?: () => void;
}

export function ParentAccountManagementDialog({
  open,
  onOpenChange,
  preselectedStudent,
  onSuccess
}: ParentAccountManagementDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'link'>('list');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [parents, setParents] = useState<ParentAccountSummary[]>([]);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    relationship: 'Father',
    phone: '',
    email: '',
    loginId: `PAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    temporaryPassword: 'Adithyan@2026',
  });
  const [selectedStudentForCreate, setSelectedStudentForCreate] = useState<Profile | null>(preselectedStudent || null);

  // Link existing form state
  const [selectedParentForLink, setSelectedParentForLink] = useState<ParentAccountSummary | null>(null);
  const [selectedStudentForLink, setSelectedStudentForLink] = useState<Profile | null>(preselectedStudent || null);
  const [relationshipForLink, setRelationshipForLink] = useState('Parent');

  // Success summary modal
  const [createdSummary, setCreatedSummary] = useState<{
    loginId: string;
    name: string;
    studentName?: string;
    studentId?: string;
  } | null>(null);

  // Update preselected student when prop changes
  useEffect(() => {
    if (preselectedStudent) {
      setSelectedStudentForCreate(preselectedStudent);
      setSelectedStudentForLink(preselectedStudent);
      setActiveTab('create');
    }
  }, [preselectedStudent]);

  // Load parent accounts
  const loadParents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await parentLinkingService.listParentAccounts();
      setParents(data);
    } catch (err: any) {
      console.warn('Failed to load parent accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadParents();
    }
  }, [open, loadParents]);

  // Handle Create Parent Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name.trim()) {
      toast({ title: 'Validation Error', description: 'Parent Name is required.', variant: 'destructive' });
      return;
    }
    if (!createForm.loginId.trim()) {
      toast({ title: 'Validation Error', description: 'Parent Login ID is required.', variant: 'destructive' });
      return;
    }
    if (!createForm.temporaryPassword || createForm.temporaryPassword.length < 6) {
      toast({ title: 'Validation Error', description: 'Temporary password must be at least 6 characters long.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await parentLinkingService.createParentAccount({
        name: createForm.name.trim(),
        relationship: createForm.relationship,
        phone: createForm.phone.trim(),
        email: createForm.email.trim(),
        login_id: createForm.loginId.trim(),
        password: createForm.temporaryPassword,
        student_id: selectedStudentForCreate?.id,
      });

      setCreatedSummary({
        loginId: result.login_id,
        name: result.name,
        studentName: selectedStudentForCreate?.name,
        studentId: selectedStudentForCreate?.student_id || selectedStudentForCreate?.roll_number,
      });

      toast({
        title: 'Parent Account Provisioned',
        description: `Login ID: ${result.login_id} created successfully and linked.`,
      });

      // Reset form
      setCreateForm({
        name: '',
        relationship: 'Father',
        phone: '',
        email: '',
        loginId: `PAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        temporaryPassword: 'Adithyan@2026',
      });
      setSelectedStudentForCreate(null);
      await loadParents();
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: 'Account Creation Failed',
        description: err.message || 'Unable to provision parent account.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Link Existing Parent
  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedParentForLink) {
      toast({ title: 'Validation Error', description: 'Please select an existing parent account.', variant: 'destructive' });
      return;
    }
    if (!selectedStudentForLink) {
      toast({ title: 'Validation Error', description: 'Please select an enrolled student to link.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await parentLinkingService.linkExistingParent(
        selectedParentForLink.id,
        selectedStudentForLink.id,
        relationshipForLink
      );

      toast({
        title: 'Student Linked to Parent',
        description: `${selectedStudentForLink.name} linked to parent ${selectedParentForLink.name} (${selectedParentForLink.login_id}).`,
      });

      setSelectedParentForLink(null);
      setSelectedStudentForLink(null);
      await loadParents();
      setActiveTab('list');
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: 'Linking Failed',
        description: err.message || 'Unable to link student to parent.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Unlink Child
  const handleUnlink = async (linkId: string, parentName: string, studentName: string) => {
    if (!confirm(`Are you sure you want to unlink ${studentName} from parent ${parentName}?`)) return;

    try {
      await parentLinkingService.unlinkParentStudent(linkId);
      toast({
        title: 'Link Removed',
        description: `Unlinked ${studentName} from ${parentName}.`,
      });
      await loadParents();
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: 'Unlink Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Filter parents
  const filteredParents = parents.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.login_id?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.linked_children?.some(c =>
        c.student.name?.toLowerCase().includes(q) ||
        c.student.student_id?.toLowerCase().includes(q)
      )
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[850px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-6 h-6" />
              <DialogTitle className="text-xl font-bold">Parent Account Management & Student Linking</DialogTitle>
            </div>
            <DialogDescription>
              Direct institutional parent credential provisioning. No email invitations, no OTPs, and no external activation required.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Parent Registry ({parents.length})</span>
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Create Parent Account</span>
              </TabsTrigger>
              <TabsTrigger value="link" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                <span>Link Sibling / Child</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: PARENT REGISTRY LIST */}
            <TabsContent value="list" className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by Parent Name, Login ID (e.g. PAR-...), Mobile, or Child Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={loadParents} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm">Loading parent directory...</span>
                </div>
              ) : filteredParents.length === 0 ? (
                <div className="py-12 text-center border rounded-lg bg-muted/20">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-foreground">No parent accounts found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? 'Try matching by a different name or Login ID' : 'Click "Create Parent Account" to register the first parent.'}
                  </p>
                  <Button size="sm" className="mt-4" onClick={() => setActiveTab('create')}>
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Create Parent Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredParents.map((parent) => (
                    <Card key={parent.id} className="border hover:border-primary/40 transition-colors">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-base text-foreground">{parent.name}</h4>
                              <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30">
                                ID: {parent.login_id}
                              </Badge>
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[11px]">
                                {parent.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                              {parent.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {parent.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {parent.email}
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs shrink-0"
                            onClick={() => {
                              setSelectedParentForLink(parent);
                              setActiveTab('link');
                            }}
                          >
                            <LinkIcon className="w-3.5 h-3.5 mr-1" />
                            + Link Child
                          </Button>
                        </div>

                        {/* Linked Children List */}
                        <div className="space-y-1.5">
                          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                            <span>Linked Students ({parent.linked_children.length})</span>
                            {parent.linked_children.length === 0 && (
                              <span className="text-amber-600 text-[11px] font-normal">No student linked yet</span>
                            )}
                          </div>
                          {parent.linked_children.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {parent.linked_children.map((child) => (
                                <div
                                  key={child.link_id}
                                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 border text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                                    <div className="truncate">
                                      <p className="font-medium text-foreground truncate">{child.student.name}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">
                                        {child.student.student_id || child.student.roll_number || 'No ID'} • {child.relationship}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                    title="Unlink student"
                                    onClick={() => handleUnlink(child.link_id, parent.name, child.student.name)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: CREATE PARENT ACCOUNT */}
            <TabsContent value="create" className="space-y-4 pt-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Institutional Manual Provisioning Protocol</p>
                  <p className="mt-0.5">
                    This directly creates the verified Supabase Auth account. No automated emails, invitation links, or OTP verification will be required. Receptionist sets the Login ID and temporary password.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-parent-name">Parent / Guardian Full Name *</Label>
                    <Input
                      id="create-parent-name"
                      placeholder="e.g. Ramesh Kumar"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-relationship">Relationship *</Label>
                    <Select
                      value={createForm.relationship}
                      onValueChange={(v) => setCreateForm({ ...createForm, relationship: v })}
                    >
                      <SelectTrigger id="create-relationship">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Legal Guardian</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-parent-phone">Mobile / Contact Number *</Label>
                    <Input
                      id="create-parent-phone"
                      placeholder="e.g. +91 98765 43210"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-parent-email">Email Address (Optional)</Label>
                    <Input
                      id="create-parent-email"
                      type="email"
                      placeholder="e.g. parent@example.com (blank for system email)"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    Parent Access Credentials (Configured by Receptionist)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="create-login-id" className="text-xs">
                        Parent Login ID *
                      </Label>
                      <Input
                        id="create-login-id"
                        value={createForm.loginId}
                        onChange={(e) => setCreateForm({ ...createForm, loginId: e.target.value.toUpperCase() })}
                        className="font-mono text-sm tracking-wider font-semibold"
                        required
                      />
                      <p className="text-[11px] text-muted-foreground">Unique human-readable identifier for portal login.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="create-temp-password" className="text-xs">
                        Temporary Password *
                      </Label>
                      <Input
                        id="create-temp-password"
                        type="text"
                        value={createForm.temporaryPassword}
                        onChange={(e) => setCreateForm({ ...createForm, temporaryPassword: e.target.value })}
                        className="font-mono text-sm"
                        required
                        minLength={6}
                      />
                      <p className="text-[11px] text-muted-foreground">Share securely with the parent. Can be updated after login.</p>
                    </div>
                  </div>
                </div>

                {/* Link student section */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Link Enrolled Student</Label>
                  <StudentSearchSelect
                    selectedStudentId={selectedStudentForCreate?.id}
                    onSelectStudent={(student) => setSelectedStudentForCreate(student)}
                    placeholder="Search by Student ID (AIP-...) or Name to link immediately..."
                  />
                  {selectedStudentForCreate && (
                    <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          Will link: <strong>{selectedStudentForCreate.name}</strong> ({selectedStudentForCreate.student_id || selectedStudentForCreate.roll_number})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-emerald-700 hover:text-emerald-900"
                        onClick={() => setSelectedStudentForCreate(null)}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Provisioning Parent Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account & Link Student
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* TAB 3: LINK SIBLING / EXISTING PARENT */}
            <TabsContent value="link" className="space-y-4 pt-4">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Multiple Children / Guardian Linking</p>
                  <p className="mt-0.5">
                    Connect another child to an existing parent account, or add a second guardian (Father, Mother, Local Guardian) to an enrolled student.
                  </p>
                </div>
              </div>

              <form onSubmit={handleLinkExisting} className="space-y-4">
                <div className="space-y-2">
                  <Label>1. Select Existing Parent Account *</Label>
                  <Select
                    value={selectedParentForLink?.id || ''}
                    onValueChange={(parentId) => {
                      const match = parents.find(p => p.id === parentId);
                      setSelectedParentForLink(match || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose parent by name or Login ID..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {parents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.login_id}) — {p.phone || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedParentForLink && (
                    <div className="text-xs text-muted-foreground pl-1">
                      Currently linked children: {selectedParentForLink.linked_children.map(c => c.student.name).join(', ') || 'None'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>2. Select Student to Link *</Label>
                  <StudentSearchSelect
                    selectedStudentId={selectedStudentForLink?.id}
                    onSelectStudent={(student) => setSelectedStudentForLink(student)}
                    placeholder="Search by Student ID (AIP-...) or Name..."
                  />
                  {selectedStudentForLink && (
                    <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          Target Student: <strong>{selectedStudentForLink.name}</strong> ({selectedStudentForLink.student_id || selectedStudentForLink.roll_number})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setSelectedStudentForLink(null)}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link-relationship">3. Relationship for this Link</Label>
                  <Select value={relationshipForLink} onValueChange={setRelationshipForLink}>
                    <SelectTrigger id="link-relationship">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Guardian">Legal Guardian</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !selectedParentForLink || !selectedStudentForLink}
                    className="bg-primary text-primary-foreground"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Linking Student...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Confirm & Link Student
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* SUCCESS CONFIRMATION MODAL */}
      <Dialog open={!!createdSummary} onOpenChange={(o) => !o && setCreatedSummary(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg">Parent Account Created</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Account provisioned directly in Supabase Auth. Provide credentials to the parent.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-lg bg-muted/50 border space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parent Name:</span>
              <span className="font-semibold text-foreground">{createdSummary?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Parent Login ID:</span>
              <span className="font-mono font-bold text-sm bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                {createdSummary?.loginId}
              </span>
            </div>
            {createdSummary?.studentName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Linked Student:</span>
                <span className="font-medium text-foreground">
                  {createdSummary.studentName} ({createdSummary.studentId})
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Status:</span>
              <span className="font-semibold text-emerald-600">Active (Instant Activation)</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            * The stored password is never displayed again for security. The parent can log in using their Login ID and change their temporary password at any time.
          </p>

          <DialogFooter>
            <Button className="w-full" onClick={() => setCreatedSummary(null)}>
              Done & Return to Registry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

