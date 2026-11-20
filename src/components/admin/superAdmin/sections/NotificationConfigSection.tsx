import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bell, 
  Save, 
  Loader2, 
  Users, 
  Send, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { NotificationRuleConfig } from '@/types/superAdmin.types';
import { DEFAULT_NOTIFICATIONS } from '@/services/superAdminDefaults';

interface NotificationConfigSectionProps {
  notifications?: NotificationRuleConfig[];
  onSaveNotificationsDraft?: (updated: NotificationRuleConfig[]) => Promise<boolean>;
}

export function NotificationConfigSection({
  notifications = DEFAULT_NOTIFICATIONS,
  onSaveNotificationsDraft
}: NotificationConfigSectionProps) {
  const [currentNotifs, setCurrentNotifs] = useState<NotificationRuleConfig[]>(notifications);
  const [saving, setSaving] = useState(false);

  const handleToggle = (id: string) => {
    const updated = currentNotifs.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n);
    setCurrentNotifs(updated);
  };

  const handleSave = async () => {
    if (!onSaveNotificationsDraft) return;
    setSaving(true);
    try {
      await onSaveNotificationsDraft(currentNotifs);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Automated Notification & Event Triggers
            </h2>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              System Triggers
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure automated alerts dispatched upon institutional events (admissions, faculty leaves, attendance shortages, fee payments).
          </p>
        </div>

        {onSaveNotificationsDraft && (
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save Notification Rules
          </Button>
        )}
      </div>

      {/* 2. Notification Rules Grid */}
      <div className="space-y-3">
        {currentNotifs.map((rule) => (
          <Card key={rule.id} className="border-slate-200 shadow-2xs">
            <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-slate-900">{rule.title}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] uppercase font-bold ${
                      rule.priority === 'Emergency' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      rule.priority === 'Important' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {rule.priority}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-600 mt-1">
                  Trigger Event: <span className="font-mono text-slate-800">{rule.triggerEvent}</span> • Target: {rule.targetRoles.join(', ')}
                </CardDescription>
              </div>

              <Button
                size="sm"
                variant={rule.enabled ? 'outline' : 'default'}
                onClick={() => handleToggle(rule.id)}
                className="h-7 text-xs font-semibold"
              >
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block">
                  Template Content
                </span>
                <p className="font-semibold text-slate-800">{rule.templateSubject}</p>
                <p className="text-[11px] text-slate-600">{rule.templateBody}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Active Delivery Channels:</span>
                <span className="font-medium text-slate-800 uppercase font-mono">{rule.channels.join(' • ')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
