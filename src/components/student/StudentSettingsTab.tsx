import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  Bell, 
  Save, 
  Loader2,
  Camera,
  Upload,
  LogOut,
  CheckCircle2,
  Users,
  Bus,
  CreditCard,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { storageService } from '@/services/storageService';
import { parentLinkingService, LinkedGuardian } from '@/services/parentLinkingService';

export function StudentSettingsTab({ onLogout }: { onLogout: () => void }) {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // 5 Real Backend-Connected Notification Settings
  const userPrefs = user?.preferences || {};
  const [emailAlerts, setEmailAlerts] = useState<boolean>(userPrefs.email_notifications ?? true);
  const [smsAlerts, setSmsAlerts] = useState<boolean>(userPrefs.sms_notifications ?? true);
  const [pushAlerts, setPushAlerts] = useState<boolean>(userPrefs.push_notifications ?? true);
  const [feeReminders, setFeeReminders] = useState<boolean>(userPrefs.fee_reminders ?? true);
  const [examUpdates, setExamUpdates] = useState<boolean>(userPrefs.exam_updates ?? true);
  const [busUpdates, setBusUpdates] = useState<boolean>(userPrefs.bus_updates ?? true);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [avatarError, setAvatarError] = useState(false);
  const [linkedGuardians, setLinkedGuardians] = useState<LinkedGuardian[]>([]);
  const [loadingGuardians, setLoadingGuardians] = useState(true);

  // Clean initials avatar fallback
  const studentInitials = useMemo(() => {
    const raw = user?.name || name || 'ST';
    const parts = raw.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return raw.slice(0, 2).toUpperCase();
  }, [user?.name, name]);

  useEffect(() => {
    if (user?.id) {
      parentLinkingService.getLinkedGuardiansForStudent(user.id)
        .then(setLinkedGuardians)
        .catch(console.warn)
        .finally(() => setLoadingGuardians(false));
    }
  }, [user?.id]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Image Too Large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Unsupported Format',
        description: 'Please upload a JPEG, PNG, or WebP photo.',
        variant: 'destructive',
      });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setAvatarError(false);

    setUploadingAvatar(true);
    try {
      const uploadResult = await storageService.uploadFile('avatars', file, 'student_avatars');
      const publicUrl = uploadResult.publicUrl;

      const success = await updateUserProfile({ avatar: publicUrl });
      if (success) {
        setAvatarPreview(publicUrl);
        toast({
          title: 'Profile Picture Updated',
          description: 'Your new avatar is saved and live across the student portal.',
        });
      } else {
        throw new Error('Could not update profile record with new image URL.');
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast({
        title: 'Upload Failed',
        description: err.message || 'Unable to upload profile photo to cloud storage.',
        variant: 'destructive',
      });
      setAvatarPreview(user?.avatar || null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const updatedPrefs = {
        ...(user?.preferences || {}),
        email_notifications: emailAlerts,
        sms_notifications: smsAlerts,
        push_notifications: pushAlerts,
        fee_reminders: feeReminders,
        exam_updates: examUpdates,
        bus_updates: busUpdates,
      };

      const success = await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        preferences: updatedPrefs,
      });

      if (success) {
        toast({
          title: 'Settings Saved',
          description: 'Your student personal information and notification preferences were updated in Supabase.',
        });
      } else {
        throw new Error('Failed to update student profile.');
      }
    } catch (err: any) {
      toast({
        title: 'Error Saving Settings',
        description: err.message || 'Unable to update profile settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Profile Header Card with Avatar Upload */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        {/* Avatar Upload Container with Clean Initials Fallback */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 shadow-md flex items-center justify-center">
            {avatarPreview && !avatarError ? (
              <img 
                src={avatarPreview} 
                alt={user?.name || 'Student'} 
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#0F3774] to-[#1D61E7] text-white font-bold text-2xl flex items-center justify-center uppercase select-none">
                {studentInitials}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-[#1D61E7] text-white hover:bg-blue-700 shadow-md transition-transform hover:scale-105"
            title="Upload profile picture"
          >
            {uploadingAvatar ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarFileSelect} 
            accept="image/png,image/jpeg,image/webp" 
            className="hidden" 
          />
        </div>

        <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-slate-900">{user?.name || 'Enrolled Student'}</h2>
            <Badge className="bg-blue-50 text-[#1D61E7] border-blue-200 text-xs font-semibold">
              Verified Student
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Roll / Student ID: <strong>{user?.roll_number || user?.student_id || 'STU-PENDING'}</strong> • UID: {user?.id?.slice(0, 8)}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 pt-1">
            <span className="flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{user?.department || 'Paramedical Sciences'}</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>{user?.class_name || 'Current Term'}</span>
            </span>
          </div>

          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="text-xs h-7 rounded-lg"
            >
              <Upload className="w-3 h-3 mr-1.5" />
              {uploadingAvatar ? 'Uploading Picture...' : 'Change Profile Picture'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Card */}
        <Card className="bg-white border-slate-200/80 shadow-2xs rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center">
              <User className="w-4 h-4 mr-2 text-[#1D61E7]" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-xs">
              Official collegiate enrollment records
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your official name"
                className="text-xs h-9 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Student Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  value={user?.email || ''}
                  disabled
                  placeholder="student.email@adithyan.edu.in"
                  className="pl-9 text-xs h-9 bg-slate-100 border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400">Institutional email managed by registrar.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Primary Mobile Number</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 Phone Number"
                  className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Academic Department</Label>
              <Input
                value={user?.department || 'Paramedical Sciences'}
                disabled
                className="text-xs h-9 bg-slate-100 border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Enrolled Section / Year</Label>
              <Input
                value={user?.class_name || 'Current Term'}
                disabled
                className="text-xs h-9 bg-slate-100 border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
          </CardContent>
          <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveProfile}
              disabled={saving}
              className="text-xs bg-[#1D61E7] hover:bg-blue-700 rounded-xl font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* 5 Real Notification Settings Card */}
        <div className="space-y-6">
          <Card className="bg-white border-slate-200/80 shadow-2xs rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                <Bell className="w-4 h-4 mr-2 text-[#1D61E7]" />
                Institutional Notification Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time delivery channels and alert triggers saved to database
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              {/* 1. Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800 flex items-center">
                    <Mail className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Email Notifications
                  </div>
                  <div className="text-[11px] text-slate-500">Receive academic circulars & notices via email</div>
                </div>
                <Switch 
                  checked={emailAlerts} 
                  onCheckedChange={setEmailAlerts} 
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">Text messages (SMS)</div>
                  <div className="text-[11px] text-slate-500">Only urgent alerts, sent to the phone number on your profile</div>
                </div>
                <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
              </div>

              {/* 2. Push Notifications */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800 flex items-center">
                    <Bell className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                    Push Notifications
                  </div>
                  <div className="text-[11px] text-slate-500">Live browser & mobile app popup alerts</div>
                </div>
                <Switch 
                  checked={pushAlerts} 
                  onCheckedChange={setPushAlerts} 
                />
              </div>

              {/* 3. Fee Reminder Notifications */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800 flex items-center">
                    <CreditCard className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Fee Reminder Notifications
                  </div>
                  <div className="text-[11px] text-slate-500">Alerts for installment due dates & receipt verifications</div>
                </div>
                <Switch 
                  checked={feeReminders} 
                  onCheckedChange={setFeeReminders} 
                />
              </div>

              {/* 4. Exam Timetable Updates */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Exam Timetable Updates
                  </div>
                  <div className="text-[11px] text-slate-500">Immediate notice when dates, venues or timings change</div>
                </div>
                <Switch 
                  checked={examUpdates} 
                  onCheckedChange={setExamUpdates} 
                />
              </div>

              {/* 5. Bus/Transport Alert Updates */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800 flex items-center">
                    <Bus className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Bus / Transport Alert Updates
                  </div>
                  <div className="text-[11px] text-slate-500">Route delays, morning pickup logs, and driver updates</div>
                </div>
                <Switch 
                  checked={busUpdates} 
                  onCheckedChange={setBusUpdates} 
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={saving}
                className="text-xs bg-[#1D61E7] hover:bg-blue-700 rounded-xl font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save Preferences
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Linked Guardians & Parent Details Card */}
          <Card className="bg-white border-slate-200/80 shadow-2xs rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-[#1D61E7]" />
                  Linked Parent & Guardian Information
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  {linkedGuardians.length} Registered
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Official guardians linked to Student ID: <strong className="font-mono text-slate-900">{user?.roll_number || user?.student_id || 'STU-PENDING'}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              {loadingGuardians ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
                  <span className="text-slate-500">Retrieving official guardian records...</span>
                </div>
              ) : linkedGuardians.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 space-y-1">
                  <p className="font-medium text-slate-700">No Guardian Account Linked</p>
                  <p className="text-[11px]">Contact the Receptionist Desk to establish your parent/guardian linkage.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedGuardians.map((g) => (
                    <div key={g.link_id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{g.parent?.name || 'Registered Parent'}</span>
                          <Badge className={g.verified ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]" : "bg-amber-50 text-amber-700 border-amber-200 text-[9px]"}>{g.verified ? "Verified" : "Awaiting verification"}</Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                          <span>{g.relationship || 'Guardian'}</span>
                          {g.parent?.email && (
                            <>
                              <span>•</span>
                              <span>{g.parent.email}</span>
                            </>
                          )}
                          {g.parent?.phone && (
                            <>
                              <span>•</span>
                              <span>{g.parent.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
