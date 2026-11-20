import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Send, 
  Sparkles, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  Trash2, 
  Loader2,
  RefreshCw,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

// Attractive Teacher AI Doll Avatar Component
function TeacherDollAvatar({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 p-1 shadow-sm ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft Head */}
        <circle cx="50" cy="52" r="32" fill="#FFE0BD" />
        {/* Hair - Academic bob cut */}
        <path d="M22 45 C20 18, 80 18, 78 45 C78 28, 68 22, 50 22 C32 22, 22 28, 22 45 Z" fill="#4A2E18" />
        <path d="M20 45 C18 60, 24 68, 28 70 C24 55, 25 42, 28 35 Z" fill="#4A2E18" />
        <path d="M80 45 C82 60, 76 68, 72 70 C76 55, 75 42, 72 35 Z" fill="#4A2E18" />
        {/* Graduation Cap / Academic Mortarboard */}
        <polygon points="50,10 85,22 50,34 15,22" fill="#1D2A44" />
        <polygon points="35,27 35,38 65,38 65,27" fill="#151F33" />
        {/* Gold Tassel */}
        <path d="M50 22 Q72 26 75 42" stroke="#FFD700" strokeWidth="2.5" fill="none" />
        <circle cx="75" cy="43" r="2.5" fill="#FFB700" />
        {/* Cute Big Eyes */}
        <ellipse cx="38" cy="52" rx="4.5" ry="6" fill="#2C3E50" />
        <ellipse cx="62" cy="52" rx="4.5" ry="6" fill="#2C3E50" />
        {/* Eye Sparkles */}
        <circle cx="36.5" cy="50" r="1.8" fill="#FFFFFF" />
        <circle cx="60.5" cy="50" r="1.8" fill="#FFFFFF" />
        {/* Chic Glasses */}
        <rect x="29" y="45" width="18" height="14" rx="4" fill="none" stroke="#E67E22" strokeWidth="2" />
        <rect x="53" y="45" width="18" height="14" rx="4" fill="none" stroke="#E67E22" strokeWidth="2" />
        <path d="M47 50 L53 50" stroke="#E67E22" strokeWidth="2" />
        {/* Blush Cheeks */}
        <ellipse cx="30" cy="59" rx="4" ry="2" fill="#FF8A8A" opacity="0.6" />
        <ellipse cx="70" cy="59" rx="4" ry="2" fill="#FF8A8A" opacity="0.6" />
        {/* Happy Smile */}
        <path d="M44 63 Q50 68 56 63" stroke="#D35400" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      {/* Active Pulse Pill */}
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
    </div>
  );
}

export function TeacherAIAssistant() {
  const { user } = useAuth();
  const departmentName = user?.department || 'Paramedical Sciences';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`teacher_ai_chat_${user?.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: '1',
        sender: 'ai',
        text: `Hello Professor ${user?.name || ''}! 👋 I am your Academic AI Assistant at Adithyan College.\n\nI can generate structured 45-minute lesson plans, formulate clinical viva & examination questions, analyze student performance trends, or prepare remedial strategies for your ${departmentName} classes. How may I assist your teaching today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`teacher_ai_chat_${user.id}`, JSON.stringify(messages));
    }
  }, [messages, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleClearHistory = () => {
    const initialMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: `Chat history reset. How can I assist your lectures today, Professor ${user?.name || ''}?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialMsg]);
    if (user?.id) {
      localStorage.setItem(`teacher_ai_chat_${user.id}`, JSON.stringify([initialMsg]));
    }
  };

  // Generate intelligent pedagogical responses
  const generateResponse = async (query: string): Promise<string> => {
    const q = query.toLowerCase();

    if (q.includes('lesson plan') || q.includes('plan')) {
      return `### 📋 45-Minute Lesson Plan: ${departmentName}\n\n` +
        `**Topic:** Clinical Principles & Practical Diagnostic Applications\n` +
        `**Target Cohort:** Undergraduate Degree / Diploma Students\n\n` +
        `#### 1. Learning Objectives (Bloom's Taxonomy)\n` +
        `- Recall foundational physiological & procedural principles\n` +
        `- Apply standard diagnostic protocols in institutional laboratory scenarios\n` +
        `- Identify abnormal readings, deviations, and clinical calibration metrics\n\n` +
        `#### 2. Period Timeline Breakdown (45 Minutes)\n` +
        `| Time Slot | Phase | Faculty & Student Activity |\n` +
        `|---|---|---|\n` +
        `| **00:00 - 05:00** | Hook & Attendance | Recap prior session & present a high-stakes clinical dilemma |\n` +
        `| **05:00 - 20:00** | Direct Instruction | Core theoretical mechanics with blackboard diagrams & case study |\n` +
        `| **20:00 - 35:00** | Guided Practical | Step-by-step equipment demonstration & paired student observation |\n` +
        `| **35:00 - 40:00** | Formative Check | 3 rapid viva check questions around safety & error management |\n` +
        `| **40:00 - 45:00** | Q&A & Wrap-Up | Key takeaway summary & assignment due date announcement |\n\n` +
        `#### 3. Recommended Blackboard Equipment\n` +
        `- Digital laboratory projector & calibration simulator\n` +
        `- Institutional Standard Operating Procedure (SOP) handbook\n\n` +
        `*Would you like me to formulate homework questions or clinical case assignments based on this plan?*`;
    }

    if (q.includes('viva') || q.includes('question') || q.includes('quiz') || q.includes('exam')) {
      return `### ❓ Curated Examination & Viva Questions: ${departmentName}\n\n` +
        `**1. Objective MCQ (2 Marks)**\n` +
        `*Question:* What is the primary safety protocol when an abnormal baseline sensor calibration is detected during routine clinical operation?\n` +
        `*Answer:* Immediate suspension of the cycle, isolation of the specimen/line, recalibration with standard control serum, and logging in the equipment incident ledger.\n\n` +
        `**2. Conceptual Short Answer (5 Marks)**\n` +
        `*Question:* Differentiate between pre-analytical and analytical procedural errors in clinical paramedical diagnosis. Give two examples of each.\n` +
        `*Key Evaluation Points:* Specimen collection errors vs instrument calibration drift; proper labeling protocols vs reagent expiration checks.\n\n` +
        `**3. Long Analytical / Clinical Case Study (10 Marks)**\n` +
        `*Question:* A 48-year-old patient presents with acute diagnostic fluctuations during session monitoring. Detail the step-by-step clinical intervention protocol, equipment parameter adjustments, and immediate physician notification sequence.\n` +
        `*Evaluation Rubric:* 3 marks for parameter identification, 4 marks for intervention order, 3 marks for documentation & safety precautions.\n\n` +
        `*Would you like me to add these directly to your upcoming exam assessment?*`;
    }

    if (q.includes('attendance') || q.includes('shortage') || q.includes('remedial') || q.includes('75%')) {
      return `### 📊 Pedagogical Remedial Strategy for Attendance Shortage (<75%)\n\n` +
        `Based on university accreditation guidelines, students below the 75% attendance threshold face exam hall ticket debarment unless remediated.\n\n` +
        `#### Recommended Action Protocol:\n` +
        `1. **Parent-Faculty Academic Summons:** Issue Level 1 shortage notice via the Teacher Dashboard to apprise guardians before term examinations.\n` +
        `2. **Compensatory Zero-Hour Clinical Sessions:** Schedule 2 practical compensatory sessions on Saturday afternoons (01:30 - 03:30 PM) to allow students to complete missed lab procedures.\n` +
        `3. **Peer Mentorship Pairing:** Pair borderline attendees (70%-74%) with compliant high-achievers (>85%) for clinical notebook sign-offs and assignment completion.\n` +
        `4. **Portal Milestone Unlocking:** Grant incremental exam hall ticket eligibility upon verified completion of 3 remedial case assignments.\n\n` +
        `*You can dispatch official shortage warning notices to both student and parent portals in one click from the "75% Attendance & Detention Desk" tab.*`;
    }

    if (q.includes('rubric') || q.includes('grading') || q.includes('homework')) {
      return `### 📝 Comprehensive Grading Rubric: ${departmentName} Assignments\n\n` +
        `| Criteria | Excellent (90-100%) | Satisfactory (70-89%) | Needs Work (<70%) |\n` +
        `|---|---|---|---|\n` +
        `| **Clinical Accuracy (40%)** | Error-free procedural steps & precise parameter definitions | Minor terminology slip; principles sound | Inaccurate steps or unsafe medical logic |\n` +
        `| **Analytical Reasoning (30%)** | Exceptional diagnostic justification with case references | Basic explanation provided without deep analysis | Superficial answers or copied definitions |\n` +
        `| **Diagrams & Documentation (20%)** | Neatly labeled apparatus diagrams & verified SOP formatting | Legible diagram with partial labeling | Missing diagrams or illegible notes |\n` +
        `| **Timeliness & Neatness (10%)** | Submitted before deadline on portal in clean PDF format | Submitted on deadline | Submitted overdue or incomplete |\n\n` +
        `*You can review, apply these scores, and enter student feedback directly in the "Assignments Review Desk" on your dashboard.*`;
    }

    // Default intelligent guidance
    return `### 🎓 Academic Teaching Insight\n\n` +
      `Regarding **"${query}"** in **${departmentName}**:\n\n` +
      `As faculty, standardizing procedural precision and interactive clinical inquiry accelerates student retention.\n\n` +
      `**Suggested Next Steps:**\n` +
      `1. Check today's timetable periods to verify assigned lecture halls and student rosters.\n` +
      `2. Use the **Period Roll-Call Desk** to log student presence before 03:30 PM so notifications route to parents.\n` +
      `3. Publish upcoming assessment dates in **Examinations & Marks** so students can view their syllabus focus.\n\n` +
      `*Feel free to ask for a custom lesson plan, 5 quiz questions, or a remedial strategy!*`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    try {
      const responseText = await generateResponse(text);
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);
      }, 600);
    } catch (err) {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner with Doll Avatar */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <TeacherDollAvatar className="w-12 h-12" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Faculty AI Teaching Assistant</h3>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  Active 24/7
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Intelligent pedagogical companion for {departmentName} curriculum & classroom delivery
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleClearHistory}
            className="h-8 text-xs text-slate-600 self-end sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Chat
          </Button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleSendMessage("Generate a 45-minute lesson plan for our next clinical lecture")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#1D61E7] text-xs font-medium transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#1D61E7]" />
            Generate Lesson Plan
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Formulate 5 clinical viva and exam quiz questions")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#1D61E7] text-xs font-medium transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            Create Viva & Quiz Questions
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Remedial action plan for students below 75% attendance")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#1D61E7] text-xs font-medium transition-all"
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
            Remedial Strategy (&lt;75% Attendance)
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Create a grading rubric for clinical laboratory assignments")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#1D61E7] text-xs font-medium transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            Assignment Grading Rubric
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[520px]">
        {/* Messages Scroll Area */}
        <ScrollArea className="flex-1 p-5">
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMe = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {isMe ? (
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      P
                    </div>
                  ) : (
                    <TeacherDollAvatar className="w-8 h-8" />
                  )}

                  <div className={`space-y-1 max-w-[82%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 text-[10px] text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span>{isMe ? 'You (Faculty)' : 'Academic AI Mentor'}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        isMe
                          ? 'bg-[#1D61E7] text-white rounded-tr-xs shadow-xs'
                          : 'bg-slate-50 text-slate-900 rounded-tl-xs border border-slate-200/70 font-sans'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-start gap-3">
                <TeacherDollAvatar className="w-8 h-8" />
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1D61E7]" />
                  <span>Preparing pedagogical response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <Input
              type="text"
              placeholder="Ask for lesson plans, quiz questions, exam cases, or remedial advice..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
              className="flex-1 h-10 text-xs rounded-xl bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-[#1D61E7]"
            />
            <Button
              type="submit"
              disabled={isTyping || !inputValue.trim()}
              className="h-10 px-5 bg-[#1D61E7] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <Send className="w-4 h-4 mr-1.5" /> Send
            </Button>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            AI Assistant provides institutional curriculum assistance. Review lesson recommendations before deployment.
          </p>
        </div>
      </div>
    </div>
  );
}
