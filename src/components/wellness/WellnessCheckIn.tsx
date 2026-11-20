import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sun, 
  Sunset,
  Moon, 
  CheckCircle2, 
  Clock, 
  Target, 
  Sparkles, 
  Zap, 
  Smile, 
  Meh, 
  Frown, 
  Star, 
  History, 
  Flame, 
  Check, 
  Loader2,
  CalendarCheck,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';
import { WellnessCheckin, StudentAttendance } from '@/types/database.types';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { getIndiaTimeInfo } from '@/lib/indiaTime';

const MORNING_MOODS = [
  { id: 'focused', label: 'Focused & Ready', icon: Target },
  { id: 'energized', label: 'High Energy', icon: Zap },
  { id: 'optimistic', label: 'Positive & Calm', icon: Smile },
  { id: 'neutral', label: 'Neutral / Routine', icon: Meh },
  { id: 'fatigued', label: 'Fatigued / Sleepy', icon: Frown },
];

const AFTERNOON_MOODS = [
  { id: 'energized', label: 'Active & Engaged', icon: Zap },
  { id: 'steady', label: 'Steady Focus', icon: Target },
  { id: 'optimistic', label: 'Productive', icon: Smile },
  { id: 'neutral', label: 'Routine Pace', icon: Meh },
  { id: 'tired', label: 'Post-Lunch Fatigue', icon: Frown },
];

type CheckInTab = 'morning' | 'afternoon' | 'evening' | 'attendance';

export function WellnessCheckIn({ defaultTab }: { defaultTab?: CheckInTab | 'history' }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const istInfo = useMemo(() => getIndiaTimeInfo(), []);

  const initialTab = useMemo<CheckInTab>(() => {
    if (defaultTab && defaultTab !== 'history') return defaultTab as CheckInTab;
    if (defaultTab === 'history') return 'attendance';
    return istInfo.session;
  }, [defaultTab, istInfo.session]);

  const [activeTab, setActiveTab] = useState<CheckInTab>(initialTab);

  useEffect(() => {
    if (defaultTab) {
      if (defaultTab === 'history') setActiveTab('attendance');
      else setActiveTab(defaultTab as CheckInTab);
    }
  }, [defaultTab]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Today's records
  const [todayMorning, setTodayMorning] = useState<WellnessCheckin | null>(null);
  const [todayAfternoon, setTodayAfternoon] = useState<WellnessCheckin | null>(null);
  const [todayEvening, setTodayEvening] = useState<WellnessCheckin | null>(null);
  const [history, setHistory] = useState<WellnessCheckin[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);

  // Morning Form State
  const [morningMood, setMorningMood] = useState<string>('focused');
  const [morningEnergy, setMorningEnergy] = useState<number>(4);
  const [readinessScore, setReadinessScore] = useState<number>(8);
  const [learningGoal, setLearningGoal] = useState<string>('');
  const [morningNote, setMorningNote] = useState<string>('');

  // Afternoon Form State
  const [afternoonMood, setAfternoonMood] = useState<string>('steady');
  const [afternoonEnergy, setAfternoonEnergy] = useState<number>(4);
  const [afternoonFocus, setAfternoonFocus] = useState<number>(8);
  const [afternoonGoal, setAfternoonGoal] = useState<string>('');
  const [afternoonNote, setAfternoonNote] = useState<string>('');

  // Evening Form State
  const [eveningReflection, setEveningReflection] = useState<string>('');
  const [completedTasksText, setCompletedTasksText] = useState<string>('');
  const [difficulties, setDifficulties] = useState<string>('');
  const [dayRating, setDayRating] = useState<number>(4);
  const [improvements, setImprovements] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadCheckinData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [todayList, historyList, attList] = await Promise.all([
        db.getTodayWellnessCheckins(user.id),
        db.getWellnessCheckinHistory(user.id, 25),
        db.getStudentAttendance(user.id),
      ]);

      let morningRecord: WellnessCheckin | null = null;
      let afternoonRecord: WellnessCheckin | null = null;
      let eveningRecord: WellnessCheckin | null = null;

      (todayList || []).forEach((c) => {
        const type = c.checkin_type || c.type;
        if (type === 'morning') morningRecord = c;
        if (type === 'afternoon') afternoonRecord = c;
        if (type === 'evening') eveningRecord = c;
      });

      setTodayMorning(morningRecord);
      setTodayAfternoon(afternoonRecord);
      setTodayEvening(eveningRecord);
      setHistory(historyList || []);
      setAttendanceRecords(attList || []);

      // Pre-fill morning if already submitted
      if (morningRecord) {
        setMorningMood(morningRecord.mood || 'focused');
        setMorningEnergy(morningRecord.energy_level || 4);
        setReadinessScore(morningRecord.readiness_score || 8);
        setLearningGoal(morningRecord.learning_goal || '');
        setMorningNote(morningRecord.notes || '');
      }

      // Pre-fill afternoon if already submitted
      if (afternoonRecord) {
        setAfternoonMood(afternoonRecord.mood || 'steady');
        setAfternoonEnergy(afternoonRecord.energy_level || 4);
        setAfternoonFocus(afternoonRecord.readiness_score || 8);
        setAfternoonGoal(afternoonRecord.learning_goal || '');
        setAfternoonNote(afternoonRecord.notes || '');
      }

      // Pre-fill evening if already submitted
      if (eveningRecord) {
        setEveningReflection(eveningRecord.reflection || '');
        setCompletedTasksText((eveningRecord.completed_tasks || []).join('\n'));
        setDifficulties(eveningRecord.difficulties || '');
        setDayRating(eveningRecord.day_rating || 4);
        setImprovements(eveningRecord.improvements || '');
      }
    } catch (err) {
      console.error('Failed to load check-ins & attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCheckinData();
  }, [loadCheckinData]);

  useRealtimeSubscription({
    table: 'wellness_checkins',
    onChange: loadCheckinData,
    onReconnect: loadCheckinData,
  });

  // Calculate Streak
  const checkinStreak = useMemo(() => {
    if (history.length === 0) return 0;
    const uniqueDates = Array.from(new Set(history.map(h => h.date))).sort().reverse();
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDates.length; i++) {
      const checkinDate = new Date(uniqueDates[i]);
      checkinDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - checkinDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === i || diffDays === i + 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [history]);

  // Attendance Metrics
  const attendanceMetrics = useMemo(() => {
    if (attendanceRecords.length === 0) {
      return { total: 0, present: 0, absent: 0, late: 0, percentage: null };
    }
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const percentage = Math.round(((present + (late * 0.5)) / total) * 100);
    return { total, present, absent, late, percentage };
  }, [attendanceRecords]);

  const handleMorningSubmit = async () => {
    if (!user?.id) return;
    if (todayMorning) {
      toast({
        title: 'Already Submitted',
        description: 'You have already completed your morning check-in for today.',
      });
      return;
    }

    if (!learningGoal.trim()) {
      toast({
        title: 'Goal Required',
        description: 'Please set at least one academic focus or topic for this morning.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await db.submitWellnessCheckin({
        user_id: user.id,
        checkin_type: 'morning',
        type: 'morning',
        date: todayStr,
        mood: morningMood,
        energy_level: morningEnergy,
        readiness_score: readinessScore,
        learning_goal: learningGoal.trim(),
        notes: morningNote.trim(),
        options: [morningMood, `energy_${morningEnergy}`, `readiness_${readinessScore}`],
      });

      if (res) {
        toast({
          title: 'Morning Check-In Recorded',
          description: 'Your morning attendance check-in is saved.',
        });
        setTodayMorning(res);
        setHistory(prev => [res, ...prev.filter(h => !(h.date === todayStr && (h.checkin_type === 'morning' || h.type === 'morning')))]);
      }
    } catch (err: any) {
      toast({
        title: 'Submission Error',
        description: err.message || 'Unable to record check-in.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAfternoonSubmit = async () => {
    if (!user?.id) return;
    if (todayAfternoon) {
      toast({
        title: 'Already Submitted',
        description: 'You have already completed your afternoon check-in for today.',
      });
      return;
    }

    if (!afternoonGoal.trim()) {
      toast({
        title: 'Afternoon Task Required',
        description: 'Please enter your practical lab or afternoon lecture focus.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await db.submitWellnessCheckin({
        user_id: user.id,
        checkin_type: 'afternoon',
        type: 'afternoon',
        date: todayStr,
        mood: afternoonMood,
        energy_level: afternoonEnergy,
        readiness_score: afternoonFocus,
        learning_goal: afternoonGoal.trim(),
        notes: afternoonNote.trim(),
        options: [afternoonMood, `energy_${afternoonEnergy}`, `focus_${afternoonFocus}`],
      });

      if (res) {
        toast({
          title: 'Afternoon Check-In Recorded',
          description: 'Your afternoon attendance check-in is saved.',
        });
        setTodayAfternoon(res);
        setHistory(prev => [res, ...prev.filter(h => !(h.date === todayStr && (h.checkin_type === 'afternoon' || h.type === 'afternoon')))]);
      }
    } catch (err: any) {
      toast({
        title: 'Submission Error',
        description: err.message || 'Unable to record afternoon check-in.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEveningSubmit = async () => {
    if (!user?.id) return;
    if (todayEvening) {
      toast({
        title: 'Already Submitted',
        description: 'You have already recorded your evening reflection for today.',
      });
      return;
    }

    if (!eveningReflection.trim()) {
      toast({
        title: 'Reflection Required',
        description: 'Please summarize your key takeaways or study accomplishments.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const taskList = completedTasksText
        .split('\n')
        .map(t => t.trim())
        .filter(Boolean);

      const res = await db.submitWellnessCheckin({
        user_id: user.id,
        checkin_type: 'evening',
        type: 'evening',
        date: todayStr,
        reflection: eveningReflection.trim(),
        completed_tasks: taskList,
        difficulties: difficulties.trim(),
        day_rating: dayRating,
        improvements: improvements.trim(),
        options: [`rating_${dayRating}`, ...taskList.slice(0, 3)],
      });

      if (res) {
        toast({
          title: 'Evening Reflection Recorded',
          description: 'Great work! Your evening reflection has been logged.',
        });
        setTodayEvening(res);
        setHistory(prev => [res, ...prev.filter(h => !(h.date === todayStr && (h.checkin_type === 'evening' || h.type === 'evening')))]);
      }
    } catch (err: any) {
      toast({
        title: 'Submission Error',
        description: err.message || 'Unable to record evening reflection.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-white border-border shadow-xs">
      <CardHeader className="pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Attendance & Daily Check-Ins
              </CardTitle>
              <CardDescription className="text-xs">
                IST Session check-ins ({istInfo.timeRange}) and official class attendance records
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>{checkinStreak} Day Streak</span>
            </div>

            <Tabs 
              value={activeTab} 
              onValueChange={(val) => setActiveTab(val as CheckInTab)}
            >
              <TabsList className="h-8 bg-muted/60 p-0.5 text-xs">
                <TabsTrigger value="morning" className="text-[11px] px-2.5">
                  <Sun className="w-3 h-3 mr-1 text-amber-500" />
                  Morning {todayMorning && <Check className="w-3 h-3 ml-1 text-emerald-600" />}
                </TabsTrigger>
                <TabsTrigger value="afternoon" className="text-[11px] px-2.5">
                  <Sunset className="w-3 h-3 mr-1 text-orange-500" />
                  Afternoon {todayAfternoon && <Check className="w-3 h-3 ml-1 text-emerald-600" />}
                </TabsTrigger>
                <TabsTrigger value="evening" className="text-[11px] px-2.5">
                  <Moon className="w-3 h-3 mr-1 text-indigo-500" />
                  Evening {todayEvening && <Check className="w-3 h-3 ml-1 text-emerald-600" />}
                </TabsTrigger>
                <TabsTrigger value="attendance" className="text-[11px] px-2.5">
                  <CalendarCheck className="w-3 h-3 mr-1 text-blue-600" />
                  Records
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading attendance & check-ins...</p>
          </div>
        ) : (
          <>
            {/* MORNING TAB */}
            {activeTab === 'morning' && (
              <div className="space-y-6">
                {todayMorning ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold">Morning check-in recorded for today.</span>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-white text-[11px]">
                      {todayMorning.created_at ? new Date(todayMorning.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                    </Badge>
                  </div>
                ) : (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                    <span>Morning Session Window: <strong>05:00 AM - 11:59 AM IST</strong></span>
                    <Badge className="bg-blue-600 text-white text-[10px]">Active Window</Badge>
                  </div>
                )}

                {/* Mood Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Current Morning Focus & Academic Mood
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {MORNING_MOODS.map(m => {
                      const Icon = m.icon;
                      const isSelected = morningMood === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!!todayMorning}
                          onClick={() => setMorningMood(m.id)}
                          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5 text-primary shadow-2xs font-semibold' 
                              : 'border-border/60 hover:border-border text-foreground'
                          } ${todayMorning ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                        >
                          <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-xs">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sliders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-border bg-slate-50/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-semibold text-foreground">Physical Energy Level</Label>
                      <Badge variant="outline" className="text-xs font-bold">{morningEnergy} / 5</Badge>
                    </div>
                    <Slider
                      value={[morningEnergy]}
                      onValueChange={(val) => !todayMorning && setMorningEnergy(val[0])}
                      min={1}
                      max={5}
                      step={1}
                      disabled={!!todayMorning}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Low Stamina</span>
                      <span>Peak Vitality</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-semibold text-foreground">Academic Readiness</Label>
                      <Badge variant="outline" className="text-xs font-bold">{readinessScore} / 10</Badge>
                    </div>
                    <Slider
                      value={[readinessScore]}
                      onValueChange={(val) => !todayMorning && setReadinessScore(val[0])}
                      min={1}
                      max={10}
                      step={1}
                      disabled={!!todayMorning}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Unprepared</span>
                      <span>Fully Prepared</span>
                    </div>
                  </div>
                </div>

                {/* Goals & Notes */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Primary Learning Goal for Today *
                    </Label>
                    <Input
                      placeholder="e.g. Master clinical pathology blood smear analysis and complete practical test"
                      value={learningGoal}
                      onChange={(e) => setLearningGoal(e.target.value)}
                      disabled={!!todayMorning}
                      className="text-xs h-9 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Additional Morning Notes (Optional)
                    </Label>
                    <Textarea
                      placeholder="e.g. Review anatomy diagrams before 10 AM lab session..."
                      value={morningNote}
                      onChange={(e) => setMorningNote(e.target.value)}
                      disabled={!!todayMorning}
                      className="min-h-[70px] text-xs resize-none bg-white"
                    />
                  </div>
                </div>

                {!todayMorning && (
                  <div className="flex justify-end pt-2">
                    <Button 
                      size="sm" 
                      onClick={handleMorningSubmit} 
                      disabled={submitting}
                      className="text-xs bg-[#1D61E7] hover:bg-blue-700 font-semibold"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Recording...
                        </>
                      ) : (
                        <>
                          <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Submit Morning Check-In
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* AFTERNOON TAB */}
            {activeTab === 'afternoon' && (
              <div className="space-y-6">
                {todayAfternoon ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold">Afternoon check-in recorded for today.</span>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-white text-[11px]">
                      {todayAfternoon.created_at ? new Date(todayAfternoon.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                    </Badge>
                  </div>
                ) : (
                  <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800 flex items-center justify-between">
                    <span>Afternoon Session Window: <strong>12:00 PM - 04:59 PM IST</strong></span>
                    <Badge className="bg-orange-600 text-white text-[10px]">Active Window</Badge>
                  </div>
                )}

                {/* Mood Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Afternoon Energy & Post-Lunch Focus
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {AFTERNOON_MOODS.map(m => {
                      const Icon = m.icon;
                      const isSelected = afternoonMood === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!!todayAfternoon}
                          onClick={() => setAfternoonMood(m.id)}
                          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-2xs font-semibold' 
                              : 'border-border/60 hover:border-border text-foreground'
                          } ${todayAfternoon ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                        >
                          <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-orange-600' : 'text-muted-foreground'}`} />
                          <span className="text-xs">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sliders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-border bg-slate-50/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-semibold text-foreground">Afternoon Stamina</Label>
                      <Badge variant="outline" className="text-xs font-bold">{afternoonEnergy} / 5</Badge>
                    </div>
                    <Slider
                      value={[afternoonEnergy]}
                      onValueChange={(val) => !todayAfternoon && setAfternoonEnergy(val[0])}
                      min={1}
                      max={5}
                      step={1}
                      disabled={!!todayAfternoon}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Fatigued</span>
                      <span>High Energy</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-semibold text-foreground">Lab & Clinical Focus</Label>
                      <Badge variant="outline" className="text-xs font-bold">{afternoonFocus} / 10</Badge>
                    </div>
                    <Slider
                      value={[afternoonFocus]}
                      onValueChange={(val) => !todayAfternoon && setAfternoonFocus(val[0])}
                      min={1}
                      max={10}
                      step={1}
                      disabled={!!todayAfternoon}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Distracted</span>
                      <span>Deep Focus</span>
                    </div>
                  </div>
                </div>

                {/* Goals & Notes */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Afternoon Practical / Lab Goal *
                    </Label>
                    <Input
                      placeholder="e.g. Complete biochemistry spectrophotometer calibration procedure"
                      value={afternoonGoal}
                      onChange={(e) => setAfternoonGoal(e.target.value)}
                      disabled={!!todayAfternoon}
                      className="text-xs h-9 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Lab / Clinic Observations (Optional)
                    </Label>
                    <Textarea
                      placeholder="e.g. Noted buffer solution preparation technique demonstrated by faculty..."
                      value={afternoonNote}
                      onChange={(e) => setAfternoonNote(e.target.value)}
                      disabled={!!todayAfternoon}
                      className="min-h-[70px] text-xs resize-none bg-white"
                    />
                  </div>
                </div>

                {!todayAfternoon && (
                  <div className="flex justify-end pt-2">
                    <Button 
                      size="sm" 
                      onClick={handleAfternoonSubmit} 
                      disabled={submitting}
                      className="text-xs bg-orange-600 hover:bg-orange-700 font-semibold"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Recording...
                        </>
                      ) : (
                        <>
                          <Sunset className="w-3.5 h-3.5 mr-1.5 text-white" /> Submit Afternoon Check-In
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* EVENING TAB */}
            {activeTab === 'evening' && (
              <div className="space-y-6">
                {todayEvening ? (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      <span className="font-semibold">Evening reflection recorded for today.</span>
                    </div>
                    <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-white text-[11px]">
                      {todayEvening.created_at ? new Date(todayEvening.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                    </Badge>
                  </div>
                ) : (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 flex items-center justify-between">
                    <span>Evening Session Window: <strong>05:00 PM - 11:59 PM IST</strong></span>
                    <Badge className="bg-indigo-600 text-white text-[10px]">Active Window</Badge>
                  </div>
                )}

                {/* Day Rating */}
                <div className="space-y-2 p-4 rounded-xl border border-border bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-foreground">Overall Academic Day Rating</Label>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          disabled={!!todayEvening}
                          onClick={() => setDayRating(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star 
                            className={`w-5 h-5 ${
                              star <= dayRating 
                                ? 'fill-amber-400 text-amber-400' 
                                : 'text-slate-300'
                            }`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold ml-2 text-foreground">{dayRating} / 5</span>
                    </div>
                  </div>
                </div>

                {/* Reflection Textarea */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Day Reflection & Conceptual Takeaways *
                  </Label>
                  <Textarea
                    placeholder="Summarize what you learned today, breakthroughs in practical skills, or topics revised..."
                    value={eveningReflection}
                    onChange={(e) => setEveningReflection(e.target.value)}
                    disabled={!!todayEvening}
                    className="min-h-[90px] text-xs resize-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Completed Work & Tasks (One per line)
                    </Label>
                    <Textarea
                      placeholder="Completed histology lab manual&#10;Revised chapter on renal physiology&#10;Participated in clinical case study"
                      value={completedTasksText}
                      onChange={(e) => setCompletedTasksText(e.target.value)}
                      disabled={!!todayEvening}
                      className="min-h-[85px] text-xs resize-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Difficulties Encountered / Doubts
                    </Label>
                    <Textarea
                      placeholder="e.g. Immunohematology cross-matching results were ambiguous..."
                      value={difficulties}
                      onChange={(e) => setDifficulties(e.target.value)}
                      disabled={!!todayEvening}
                      className="min-h-[85px] text-xs resize-none bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Ideas & Improvements for Tomorrow
                  </Label>
                  <Input
                    placeholder="e.g. Arrive early for microbiology streak plate practice"
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    disabled={!!todayEvening}
                    className="text-xs h-9 bg-white"
                  />
                </div>

                {!todayEvening && (
                  <div className="flex justify-end pt-2">
                    <Button 
                      size="sm" 
                      onClick={handleEveningSubmit} 
                      disabled={submitting}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Recording...
                        </>
                      ) : (
                        <>
                          <Moon className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Submit Evening Reflection
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ATTENDANCE RECORDS & CHECK-IN HISTORY TAB */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                {/* Official Attendance Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Attendance Rate</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {attendanceMetrics.percentage !== null ? `${attendanceMetrics.percentage}%` : '—'}
                    </div>
                    <div className="mt-1">
                      {attendanceMetrics.percentage !== null && attendanceMetrics.percentage >= 75 ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Above 75% Eligible
                        </span>
                      ) : attendanceMetrics.percentage !== null ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Shortage
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Awaiting Log</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Sessions</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{attendanceMetrics.total}</div>
                    <span className="text-[10px] text-slate-400">Class periods</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Present</span>
                    <div className="text-xl font-bold text-emerald-600 mt-1">{attendanceMetrics.present}</div>
                    <span className="text-[10px] text-emerald-600">Full attendance</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Absent</span>
                    <div className="text-xl font-bold text-rose-600 mt-1">{attendanceMetrics.absent}</div>
                    <span className="text-[10px] text-rose-500">{attendanceMetrics.late} late periods</span>
                  </div>
                </div>

                {/* Official Classroom Attendance Records Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-[#1D61E7]" />
                      Official Academic Attendance Records
                    </h4>
                    <span className="text-[11px] text-slate-400">Updated by Faculty</span>
                  </div>

                  {attendanceRecords.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                      No official class attendance records logged yet by faculty for your roll number.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Subject / Module</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {attendanceRecords.slice(0, 15).map((att) => (
                            <tr key={att.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-medium text-slate-900">
                                {new Date(att.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="p-3 text-slate-600">
                                {att.subject || 'Clinical Session'}
                              </td>
                              <td className="p-3">
                                <Badge 
                                  className={
                                    att.status === 'present'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                      : att.status === 'late'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]'
                                  }
                                >
                                  {att.status.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="p-3 text-slate-500 text-[11px]">
                                {att.remarks || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Session Check-in History */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    Daily Session Check-in History
                  </h4>

                  {history.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      No prior check-ins recorded.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {history.slice(0, 10).map((item) => {
                        const type = item.checkin_type || item.type;
                        const isMorning = type === 'morning';
                        const isAfternoon = type === 'afternoon';
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 border border-border rounded-xl bg-white space-y-1.5 hover:border-primary/40 transition-colors shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                {isMorning && <Sun className="w-4 h-4 text-amber-500" />}
                                {isAfternoon && <Sunset className="w-4 h-4 text-orange-500" />}
                                {!isMorning && !isAfternoon && <Moon className="w-4 h-4 text-indigo-500" />}
                                <span className="font-semibold text-foreground capitalize">
                                  {isMorning ? 'Morning Check-In' : isAfternoon ? 'Afternoon Check-In' : 'Evening Reflection'}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {new Date(item.date).toLocaleDateString()}
                                </Badge>
                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                              </div>
                            </div>

                            {item.learning_goal && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Focus: </span>
                                {item.learning_goal}
                              </div>
                            )}

                            {item.reflection && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Reflection: </span>
                                {item.reflection}
                              </div>
                            )}

                            <div className="flex items-center space-x-4 text-[11px] text-muted-foreground pt-0.5">
                              {item.mood && (
                                <span>Mood: <strong className="text-foreground capitalize">{item.mood}</strong></span>
                              )}
                              {item.energy_level && (
                                <span>Energy: <strong className="text-foreground">{item.energy_level}/5</strong></span>
                              )}
                              {item.readiness_score && (
                                <span>Focus: <strong className="text-foreground">{item.readiness_score}/10</strong></span>
                              )}
                              {item.day_rating && (
                                <span>Rating: <strong className="text-foreground">{item.day_rating}/5</strong></span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}