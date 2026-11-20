import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Send, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/supabase/database';
import { supabase } from '@/services/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function AILearningChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'ai',
      content: "Hello! I'm your AI Academic Learning Assistant. Ask me any math, science, engineering, or academic question and I'll help you understand it step-by-step.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);

  // Load chat history from Supabase
  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const history = await db.getAIChatMessages(user.id);
      if (history && history.length > 0) {
        const mapped: Message[] = history.map(h => ({
          id: h.id,
          type: h.role === 'user' ? 'user' : 'ai',
          content: h.content,
          timestamp: new Date(h.created_at || Date.now())
        }));
        setMessages(mapped);
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useRealtimeSubscription({
    table: 'ai_chat_messages',
    onChange: loadHistory,
    onReconnect: loadHistory,
  });

  const handleSendMessage = async () => {
    const query = inputValue.trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `local-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setConfigNotice(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let answer = '';
      let isConfigMissing = false;

      // 1. Try local dev endpoint /api/ai/chat
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ prompt: query })
        });

        const data = await res.json();
        if (res.status === 503 || data.code === 'AI_PROVIDER_NOT_CONFIGURED') {
          isConfigMissing = true;
          setConfigNotice(data.error || 'AI Provider credentials (GEMINI_API_KEY) are required.');
          answer = `Configuration Notice: ${data.error}`;
        } else if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        } else {
          answer = data.reply;
        }
      } catch (fetchErr: any) {
        if (isConfigMissing) throw fetchErr;

        // 2. Fallback to Supabase Edge Function
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('ai-chat', {
          body: { prompt: query }
        });

        if (edgeErr || edgeData?.code === 'AI_PROVIDER_NOT_CONFIGURED') {
          setConfigNotice(edgeData?.error || 'GEMINI_API_KEY is not yet configured in environment variables.');
          answer = `${edgeData?.error || 'AI Provider is not configured in backend.'}`;
        } else if (edgeData?.reply) {
          answer = edgeData.reply;
        } else {
          throw new Error(edgeErr?.message || 'Failed to contact AI service.');
        }
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: answer,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'ai',
          content: `Unable to get AI answer: ${err.message}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">AI Learning Venture</CardTitle>
        </div>
        <CardDescription>Doubt Solver Chat - Ask any academic question</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {configNotice && (
          <Alert variant="default" className="mb-3 py-2 text-xs bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription>
              {configNotice}
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'ai' && <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    {message.type === 'user' && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask your academic question (e.g. Calculus, Newton's laws, Algorithms)..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
