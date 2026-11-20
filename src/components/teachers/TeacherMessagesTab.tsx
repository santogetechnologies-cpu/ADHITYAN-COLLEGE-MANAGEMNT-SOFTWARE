import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  User, 
  Clock, 
  CheckCheck, 
  Users, 
  RefreshCw, 
  Loader2,
  Search,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useAuth } from '@/context/AuthContext';
import { TeacherMessage, Profile } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface ConversationGroup {
  partnerId: string;
  partnerName: string;
  partnerRole: 'student' | 'parent';
  subject: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  messages: TeacherMessage[];
}

export function TeacherMessagesTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [allMessages, setAllMessages] = useState<TeacherMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadMessages = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const messages = await db.getTeacherMessages(user.id);
      setAllMessages(messages || []);

      // Group messages by conversation partner
      const groupsMap = new Map<string, ConversationGroup>();

      (messages || []).forEach(msg => {
        const isFromMe = msg.sender_id === user.id;
        const partnerId = isFromMe ? (msg.teacher_id || 'unknown') : msg.sender_id;
        const partnerName = isFromMe ? (msg.teacher_name || 'Student / Parent') : msg.sender_name;
        const isParent = partnerName.toLowerCase().includes('parent') || partnerName.toLowerCase().includes('guardian');

        if (!groupsMap.has(partnerId)) {
          groupsMap.set(partnerId, {
            partnerId,
            partnerName,
            partnerRole: isParent ? 'parent' : 'student',
            subject: msg.subject || 'Academic Query',
            lastMessage: msg.message,
            lastTimestamp: msg.created_at || '',
            unreadCount: (!isFromMe && !msg.is_read) ? 1 : 0,
            messages: [msg],
          });
        } else {
          const grp = groupsMap.get(partnerId)!;
          grp.messages.push(msg);
          if (!isFromMe && !msg.is_read) grp.unreadCount++;
          // Keep newest message as preview
          if (new Date(msg.created_at || 0) > new Date(grp.lastTimestamp || 0)) {
            grp.lastMessage = msg.message;
            grp.lastTimestamp = msg.created_at || '';
            grp.subject = msg.subject || grp.subject;
          }
        }
      });

      const sortedGroups = Array.from(groupsMap.values()).sort(
        (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
      );

      setConversations(sortedGroups);

      if (sortedGroups.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(sortedGroups[0].partnerId);
      }
    } catch (err) {
      console.warn('TeacherMessagesTab loadMessages warning:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedPartnerId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time synchronization for instant messaging
  useRealtimeSubscription({
    table: 'teacher_messages',
    onChange: loadMessages,
    onReconnect: loadMessages,
  });

  const activeConversation = conversations.find(c => c.partnerId === selectedPartnerId);

  // Send Teacher Reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeConversation || !user) return;

    setSendingReply(true);
    try {
      const newMsg = await db.sendTeacherMessage({
        sender_id: user.id,
        sender_name: `${user.name} (Faculty)`,
        sender_email: user.email || '',
        teacher_id: activeConversation.partnerId,
        teacher_name: activeConversation.partnerName,
        subject: `Re: ${activeConversation.subject}`,
        message: replyText.trim(),
        attachments: [],
      });

      // Dispatch notification to recipient
      db.createNotification({
        user_id: activeConversation.partnerId,
        title: `Faculty Reply from ${user.name}`,
        message: `Your faculty teacher ${user.name} replied to your message: "${replyText.slice(0, 80)}..."`,
        type: 'info',
        priority: 'high',
        is_read: false
      }).catch(console.warn);

      toast({
        title: "Reply Dispatched",
        description: `Message sent to ${activeConversation.partnerName}.`,
      });

      setReplyText('');
      await loadMessages();
    } catch (err: any) {
      toast({
        title: "Message Delivery Failed",
        description: err.message || "Could not send reply.",
        variant: "destructive"
      });
    } finally {
      setSendingReply(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D61E7] flex items-center justify-center font-bold">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Student & Parent Communication Inbox</h3>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Two-Way Verified Dispatch
                </Badge>
              </div>
              <p className="text-xs text-slate-500">Direct academic queries and notifications between faculty, enrolled students, and parents</p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadMessages}
            className="h-8 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Inbox
          </Button>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search conversations by student name, subject, or message content..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Main Inbox & Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs grid grid-cols-1 md:grid-cols-3 min-h-[560px]">
        {/* Left Conversations Sidebar */}
        <div className="border-r border-slate-200 flex flex-col bg-slate-50/40">
          <div className="p-3.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Conversations ({filteredConversations.length})</span>
            <Badge variant="secondary" className="text-[10px]">
              {conversations.reduce((acc, c) => acc + c.unreadCount, 0)} Unread
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#1D61E7] mb-2" />
                Loading messages...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1.5">
                <Users className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">No Messages Yet</p>
                <p>Incoming student queries and parent notes will appear in this thread.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredConversations.map(conv => {
                  const isSelected = conv.partnerId === selectedPartnerId;
                  return (
                    <button
                      key={conv.partnerId}
                      onClick={() => setSelectedPartnerId(conv.partnerId)}
                      className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-blue-50/80 border-l-4 border-[#1D61E7]' 
                          : 'hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs">
                        {conv.partnerRole === 'parent' ? 'P' : 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="font-bold text-xs text-slate-900 truncate">
                            {conv.partnerName}
                          </h5>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {conv.lastTimestamp ? new Date(conv.lastTimestamp).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-700 truncate mt-0.5">
                          {conv.subject}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {conv.lastMessage}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-[#1D61E7] text-white px-1.5 py-0 text-[10px]">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Active Conversation Feed & Reply Box */}
        <div className="md:col-span-2 flex flex-col bg-white">
          {activeConversation ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1D61E7]/10 text-[#1D61E7] flex items-center justify-center font-bold text-sm">
                    {activeConversation.partnerRole === 'parent' ? 'P' : 'S'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {activeConversation.partnerName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Topic: <span className="font-medium text-slate-700">{activeConversation.subject}</span>
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs capitalize">
                  {activeConversation.partnerRole} Contact
                </Badge>
              </div>

              {/* Chat Thread Messages */}
              <ScrollArea className="flex-1 p-4 max-h-[380px]">
                <div className="space-y-3.5">
                  {activeConversation.messages
                    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
                    .map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id;

                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                            <span className="font-medium text-slate-600">{msg.sender_name}</span>
                            <span>•</span>
                            <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed whitespace-pre-wrap ${
                              isMe
                                ? 'bg-[#1D61E7] text-white rounded-tr-xs shadow-xs'
                                : 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200/60'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>

              {/* Quick Suggestion Pills */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-slate-400 px-1 font-medium">Quick:</span>
                <button
                  type="button"
                  onClick={() => setReplyText("Received your query. I will review this in our next class lecture.")}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap text-[11px]"
                >
                  "Will review in next class"
                </button>
                <button
                  type="button"
                  onClick={() => setReplyText("Well done! Your assignment submission has been received and graded.")}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap text-[11px]"
                >
                  "Assignment reviewed & graded"
                </button>
                <button
                  type="button"
                  onClick={() => setReplyText("Please visit during faculty hours (03:30 - 04:30 PM) for personalized doubts clarification.")}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap text-[11px]"
                >
                  "Faculty office hours invite"
                </button>
              </div>

              {/* Reply Composer */}
              <div className="p-3.5 border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={`Reply to ${activeConversation.partnerName}...`}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    className="text-xs resize-none rounded-xl"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="h-auto px-4 bg-[#1D61E7] hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
                  >
                    {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs">
              <MessageCircle className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Select a Conversation</p>
              <p className="text-slate-500">Choose a student or parent from the left sidebar to view message history and send replies.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

