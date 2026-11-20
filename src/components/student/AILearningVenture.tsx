import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  RotateCcw, 
  Copy, 
  Check, 
  Sparkles, 
  Bot, 
  User, 
  Loader2, 
  GraduationCap, 
  Heart,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  { label: '🩺 Clinical Vitals', query: 'What are the normal adult vital sign ranges (BP, Pulse, RR, SpO2, Temp)?' },
  { label: '🧪 Serum vs Plasma', query: 'Explain the difference between Blood Serum and Plasma simply.' },
  { label: '🩸 Dialysis Principles', query: 'How does Hemodialysis work? Explain diffusion, osmosis, and ultrafiltration.' },
  { label: '🔬 MLT Sterilization', query: 'What are the autoclave sterilization parameters for microbiology media?' },
  { label: '🎯 Exam Revision Tips', query: 'Give me effective high-yield revision tips for my upcoming paramedical exams.' },
  { label: '📝 Assignment Help', query: 'How do I structure a comprehensive clinical case report assignment?' }
];

// Academic knowledge base fallback generator for instant, intelligent student responses
function generateStudentAcademicResponse(prompt: string, department?: string): string {
  const query = prompt.toLowerCase();

  if (query.includes('vital') || query.includes('bp') || query.includes('blood pressure')) {
    return `### Standard Adult Vital Sign Reference Values 🩺

Here are the key diagnostic ranges used in clinical practice:

- **Blood Pressure (BP):** 120/80 mmHg (Normal systolic 90–120 mmHg, diastolic 60–80 mmHg)
- **Heart Rate / Pulse:** 60 – 100 beats per minute (bpm) at rest
- **Respiratory Rate (RR):** 12 – 20 breaths per minute
- **Oxygen Saturation (SpO2):** 95% – 100% on room air
- **Body Temperature:** 36.5°C – 37.5°C (97.7°F – 99.5°F)

> **Clinical Tip:** Always confirm patient baseline before charting abnormalities, and report systolic BP < 90 or > 180 mmHg immediately.`;
  }

  if (query.includes('serum') && query.includes('plasma') || query.includes('difference between serum')) {
    return `### Serum vs. Plasma Comparison 🧪

| Feature | Plasma | Serum |
| :--- | :--- | :--- |
| **Composition** | Liquid portion of unclotted blood | Liquid portion after blood clots |
| **Clotting Factors** | Contains **Fibrinogen** & clotting factors | **Fibrinogen-free** (consumed in clot) |
| **Anticoagulant** | Collected with EDTA, Heparin, or Citrate | Collected in Plain / Gel SST vial |
| **Yield** | Separated by centrifugation immediately | Requires 20–30 min clotting before spin |
| **Common Uses** | Coagulation profile (PT/INR), blood gas | Clinical biochemistry, serology, immunology |`;
  }

  if (query.includes('dialysis') || query.includes('hemodialysis') || query.includes('ultrafiltration')) {
    return `### Principles of Renal Hemodialysis 🩺

Hemodialysis removes metabolic waste and excess fluid across a semipermeable dialyzer membrane using three core mechanisms:

1. **Diffusion:** Movement of solutes (urea, creatinine, potassium) from high concentration in blood to lower concentration in dialysate bath.
2. **Ultrafiltration (UF):** Hydrostatic pressure gradient driven fluid removal across membrane pores to eliminate fluid overload.
3. **Convection (Solvent Drag):** Solutes pulled along with moving water during ultrafiltration.
4. **Osmosis:** Movement of water across the membrane driven by osmotic pressure.

> **Key Dialysis Parameters:** Dialysate flow rate ($Q_d \approx 500-800$ mL/min), Blood flow rate ($Q_b \approx 250-400$ mL/min), and Heparin anticoagulation.`;
  }

  if (query.includes('autoclave') || query.includes('sterilization')) {
    return `### Autoclave Sterilization Standards 🔬

Steam under pressure is the gold standard for clinical and laboratory media sterilization:

- **Standard Cycle:** **121°C (250°F)** at **15 psi pressure** for **15 to 20 minutes**.
- **Prion Cycle (High-temp):** **134°C (273°F)** at **30 psi** for **3 to 5 minutes**.
- **Quality Control Indicator:** *Geobacillus stearothermophilus* spores (verified incubation at 55–60°C).

Ensure loose cap closure when autoclaving screw-capped bottles to avoid pressure explosion!`;
  }

  if (query.includes('exam') || query.includes('revision') || query.includes('tips') || query.includes('study')) {
    return `### High-Yield Exam Preparation Strategies 🎯

1. **Active Recall & Feynman Technique:** Explain complex physiological cascades out loud in simple terms without looking at your notes.
2. **Focus on Diagnostic Normal Values:** Ensure complete mastery of reference ranges for electrolytes, hemogram, arterial blood gases, and vitals.
3. **Flowcharts for Clinical Pathways:** Draw step-by-step algorithms for emergency management, dialyzer setup, or specimen staining.
4. **Past University Question Review:** 70% of paramedical university exam questions follow 5-year cyclical patterns.
5. **Rest & Hydration:** Adequate sleep before exam day consolidates working memory and prevents clinical calculation errors!`;
  }

  if (query.includes('assignment') || query.includes('homework') || query.includes('case report')) {
    return `### Recommended Clinical Assignment Structure 📝

When preparing your submission for faculty review:

1. **Title & Student Identity:** Subject, Module, Student Name, Roll No, and Department.
2. **Clinical Objective / Introduction:** Brief background on the topic or physiological condition.
3. **Core Discussion & Mechanism:** Step-by-step physiological pathways or diagnostic workflow.
4. **Diagnostic Findings / Equipment:** Include equipment models, reagent specifications, and sample handling.
5. **Conclusion & Clinical Significance:** Summary of implications for patient care.
6. **References:** Cite institutional textbooks or standard WHO/ICMR clinical guidelines.`;
  }

  // General helpful academic response
  return `### Academic Explanation for "${prompt}" 📚

Thank you for your question! Here is an academic breakdown for your ${department || 'Paramedical Sciences'} studies:

- **Core Concept:** Understanding the underlying clinical physiology and diagnostic criteria is essential for accurate clinical practice.
- **Key Takeaway:** Pay close attention to standard operating procedures (SOPs), safety protocols, and calibrated diagnostic ranges.
- **Next Steps:** You can review the corresponding lecture notes in the **Timetable** section or discuss this case during your next laboratory practical.

Feel free to ask follow-up questions, request sample quiz MCQs, or ask for simple clinical case examples!`;
}

export function AILearningVenture() {
  const { user } = useAuth();
  const { toast } = useToast();

  const studentName = user?.name || 'Student';
  const studentDepartment = user?.department || 'Paramedical Sciences';

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const initialGreetingTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      sender: 'ai',
      text: `Hello ${studentName}! 👋 I'm **Adithya**, your friendly AI Academic Companion for **${studentDepartment}**.\n\nI can clarify medical and clinical doubts, explain tough concepts simply, provide revision summaries, and guide you through your coursework 24/7. How can I help you today?`,
      time: initialGreetingTime,
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isTyping) return;

    const userTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: userTime,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    // Simulate smart thinking and natural assistant response
    setTimeout(() => {
      const aiResponse = generateStudentAcademicResponse(query, studentDepartment);
      const aiTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponse,
        time: aiTime,
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied to Clipboard' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    const greetingTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    setMessages([
      {
        id: 'greeting-reset',
        sender: 'ai',
        text: `Chat restarted! Ready for your next question, ${studentName}! What would you like to explore?`,
        time: greetingTime,
      }
    ]);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      {/* 1. Header Card with Friendly AI Doll Graphic */}
      <div className="bg-gradient-to-r from-[#0F2F68] via-[#1D61E7] to-[#3B82F6] rounded-2xl p-4 sm:p-5 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          {/* Friendly AI Doll Avatar */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md p-1 border-2 border-white/30 flex items-center justify-center shadow-inner">
              {/* Cute 3D Style AI Doll SVG */}
              <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Body / Torso */}
                <rect x="18" y="40" width="28" height="20" rx="10" fill="#E0E7FF" />
                <path d="M26 44 L38 44" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
                {/* Neck */}
                <rect x="28" y="34" width="8" height="8" rx="2" fill="#C7D2FE" />
                {/* Head */}
                <rect x="12" y="10" width="40" height="30" rx="15" fill="#FFFFFF" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" />
                {/* Robot Antennas */}
                <path d="M32 10 L32 4" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
                <circle cx="32" cy="3" r="3" fill="#FACC15" />
                {/* Cute Eyes (Big friendly blinking eyes) */}
                <circle cx="24" cy="22" r="4.5" fill="#1D4ED8" />
                <circle cx="26" cy="20.5" r="1.5" fill="#FFFFFF" />
                <circle cx="40" cy="22" r="4.5" fill="#1D4ED8" />
                <circle cx="42" cy="20.5" r="1.5" fill="#FFFFFF" />
                {/* Rosy Cheeks */}
                <circle cx="19" cy="27" r="2.5" fill="#F472B6" opacity="0.6" />
                <circle cx="45" cy="27" r="2.5" fill="#F472B6" opacity="0.6" />
                {/* Smiling Mouth */}
                <path d="M28 27 Q32 32 36 27" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {/* Heart on chest */}
                <circle cx="32" cy="50" r="3" fill="#EF4444" />
              </svg>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-[#1D61E7] rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold">Adithya AI Academic Guide</h2>
              <Badge className="bg-emerald-400/20 text-emerald-200 border-emerald-300/40 text-[10px] font-semibold">
                ● 24/7 Online
              </Badge>
            </div>
            <p className="text-xs text-blue-100">
              Interactive academic assistant for {studentDepartment}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetChat}
          className="text-white hover:bg-white/20 text-xs rounded-xl h-8 px-2.5"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset Chat
        </Button>
      </div>

      {/* 2. Interactive Quick Prompt Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-[#1D61E7]" /> Quick Suggestions:
        </span>
        {QUICK_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.query)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 text-xs font-semibold whitespace-nowrap transition-colors shadow-2xs shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 3. Main Chat Conversation Area */}
      <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[520px]">
        {/* Chat Messages Log */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
              >
                {/* AI Avatar */}
                {isAi && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5 ${isAi ? '' : 'text-right'}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-2xs ${
                      isAi
                        ? 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-sm'
                        : 'bg-[#1D61E7] text-white rounded-tr-sm ml-auto text-left'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>

                  {/* Message Meta & Copy Button */}
                  <div className={`flex items-center space-x-2 text-[10px] text-slate-400 px-1 ${isAi ? '' : 'justify-end'}`}>
                    <span>{msg.time}</span>
                    {isAi && (
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="hover:text-slate-700 transition-colors flex items-center"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600 mr-0.5" />
                        ) : (
                          <Copy className="w-3 h-3 mr-0.5" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* User Avatar */}
                {!isAi && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center space-x-2 text-slate-500 text-xs py-1">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl shadow-2xs flex items-center space-x-1.5">
                <span className="text-[11px] font-medium text-slate-600">Adithya is thinking...</span>
                <span className="w-1.5 h-1.5 bg-[#1D61E7] rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-[#1D61E7] rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-[#1D61E7] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-end space-x-2">
          <Textarea
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your academic or clinical question here (e.g. 'Explain cardiac cycle step by step')..."
            className="min-h-[44px] max-h-32 text-xs resize-none bg-slate-50 border-slate-200/90 rounded-xl focus-visible:ring-1 focus-visible:ring-[#1D61E7]"
            rows={1}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isTyping}
            className="h-11 px-4 bg-[#1D61E7] hover:bg-blue-700 text-white font-bold rounded-xl shrink-0 shadow-2xs"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
