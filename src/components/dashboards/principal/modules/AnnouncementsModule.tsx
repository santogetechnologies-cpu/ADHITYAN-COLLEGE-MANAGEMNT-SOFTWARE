import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Megaphone, 
  Send, 
  Search, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Calendar,
  Building2,
  Bell
} from 'lucide-react';
import { InstitutionalBroadcast } from '@/types/database.types';

interface AnnouncementsModuleProps {
  broadcasts: InstitutionalBroadcast[];
  onPublishBroadcast: (form: {
    title: string;
    message: string;
    category: InstitutionalBroadcast['category'];
    target_audience: InstitutionalBroadcast['target_audience'];
    priority: InstitutionalBroadcast['priority'];
  }) => Promise<boolean>;
  publishing: boolean;
}

export function AnnouncementsModule({
  broadcasts,
  onPublishBroadcast,
  publishing
}: AnnouncementsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'Circular' as InstitutionalBroadcast['category'],
    target_audience: 'All' as InstitutionalBroadcast['target_audience'],
    priority: 'Normal' as InstitutionalBroadcast['priority']
  });

  const audiences = [
    { id: 'all', label: 'All Audiences' },
    { id: 'All', label: 'Entire Campus' },
    { id: 'Students', label: 'Students' },
    { id: 'Faculty', label: 'Faculty & Staff' },
    { id: 'Parents', label: 'Parents' }
  ];

  // Filtered Broadcasts
  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter(b => {
      const matchesAudience = audienceFilter === 'all' || b.target_audience === audienceFilter;
      const matchesPriority = priorityFilter === 'all' || b.priority === priorityFilter;
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        b.title.toLowerCase().includes(search) || 
        b.message.toLowerCase().includes(search) ||
        (b.author_name || '').toLowerCase().includes(search);
      return matchesAudience && matchesPriority && matchesSearch;
    });
  }, [broadcasts, audienceFilter, priorityFilter, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) return;

    const ok = await onPublishBroadcast({
      title: formData.title.trim(),
      message: formData.message.trim(),
      category: formData.category,
      target_audience: formData.target_audience,
      priority: formData.priority
    });

    if (ok) {
      setModalOpen(false);
      setFormData({
        title: '',
        message: '',
        category: 'Circular',
        target_audience: 'All',
        priority: 'Normal'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Dispatch Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Institutional Broadcasts & Official Circulars
            </h2>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              Principal Communiqués
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issue binding administrative notifications, clinical posting advisories, and emergency alerts across all portals.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
        >
          <Megaphone className="w-3.5 h-3.5 mr-1.5" />
          Dispatch Circular
        </Button>
      </div>

      {/* 2. Search & Filter Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search circulars by headline, content, or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent / Emergency</option>
                <option value="High">High Priority</option>
                <option value="Normal">Normal Circular</option>
              </select>

              <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
                {audiences.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAudienceFilter(a.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap ${
                      audienceFilter === a.id ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Circulars List */}
      <div className="space-y-3">
        {filteredBroadcasts.length === 0 ? (
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-12 text-center">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Institutional Circulars Found</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {searchTerm || audienceFilter !== 'all' || priorityFilter !== 'all'
                  ? 'No circulars match your current filter criteria.'
                  : 'Click "Dispatch Circular" above to post an institutional notification.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredBroadcasts.map((b) => {
              const pubDate = new Date(b.published_at || (b as any).created_at || Date.now());
              return (
                <Card key={b.id} className="border-slate-200 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-semibold ${
                            b.priority === 'Urgent' 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : b.priority === 'High' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {b.priority || 'Normal'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          {b.category}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Audience: {b.target_audience}</span>
                      </div>
                    </div>

                    <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                      {b.title}
                    </CardTitle>
                    <p className="text-xs text-slate-700 whitespace-pre-line mt-1.5 leading-relaxed">
                      {b.message}
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium text-slate-700">Issued by:</span>
                        <span>{b.author_name || 'Office of the Principal'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Dispatch Circular Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <span>Dispatch Institutional Campus Circular</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official circular dispatched across Student, Parent, and Faculty portals.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Circular Headline *</label>
              <Input
                required
                placeholder="e.g. Schedule for University Paramedical Practical Examinations"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="Circular">General Circular</option>
                  <option value="Exam">Examination</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Holiday">Holiday Notice</option>
                  <option value="Event">Campus Event</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent / Emergency</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="All">All Portals</option>
                  <option value="Students">Students Only</option>
                  <option value="Faculty">Faculty Only</option>
                  <option value="Parents">Parents Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Circular Content / Directives *</label>
              <Textarea
                rows={4}
                required
                placeholder="Type official circular text, requirements, dates, and instructions..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={publishing} className="h-8 text-xs bg-primary text-primary-foreground font-semibold">
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Dispatch Circular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
