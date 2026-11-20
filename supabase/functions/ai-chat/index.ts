import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization token", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user: callerUser }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid session", code: "SESSION_EXPIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, course, semester, subject, mode, history } = body;
    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Save student message
    await supabaseAdmin.from("ai_chat_messages").insert({
      user_id: callerUser.id,
      role: "user",
      content: prompt.trim(),
    });

    if (!geminiApiKey && !openaiApiKey) {
      const errorMsg = "AI Provider credentials (GEMINI_API_KEY or OPENAI_API_KEY) are not configured in Supabase Edge Secrets. Please set GEMINI_API_KEY.";
      await supabaseAdmin.from("ai_chat_messages").insert({
        user_id: callerUser.id,
        role: "ai",
        content: `⚠️ [Configuration Required] ${errorMsg}`,
      });

      return new Response(
        JSON.stringify({
          error: errorMsg,
          code: "AI_PROVIDER_NOT_CONFIGURED",
          setup_required: "GEMINI_API_KEY",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are the friendly, intelligent AI Academic Study Assistant at Adithyan Institute of Paramedical.
You are helping a student enrolled in: ${course || 'Paramedical Sciences'} (${semester || 'Current Semester'}, Subject: ${subject || 'General'}).

Answer Style & Rules:
1. Use simple English suitable for beginners.
2. Avoid unnecessary technical jargon and lengthy textbook explanations.
3. Keep basic explanations to 2-5 clear sentences unless asked for a detailed step-by-step clinical procedure.
4. Use clear real-world examples or analogies where helpful.
5. If the student asks how something works or a laboratory procedure, explain step-by-step with clear numbered points.
6. Current mode is '${mode || 'ask'}':
   - If 'explain_simply': Explain in 5th-grade / beginner English using everyday relatable comparisons.
   - If 'short_notes': Provide 3-5 concise bullet points of key facts for exam revision.
   - If 'important_questions': Provide 3-4 top exam/viva questions on this topic with brief answers.
   - If 'mcq': Provide 1 multiple choice question with 4 options [A], [B], [C], [D], followed by "Correct: [Letter]" and "Explanation: ...".
   - If 'vocab': Define the medical term in very simple words with a memory aid.
   - If 'analogy': Give an intuitive real-life analogy.
7. Be encouraging, warm, and academically accurate.`;

    let generatedText = "";
    if (geminiApiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      
      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-6)) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nStudent Question:\n${prompt.trim()}` }]
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });
      const data = await res.json();
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    } else if (openaiApiKey) {
      const endpoint = "https://api.openai.com/v1/chat/completions";
      const messages = [
        { role: "system", content: systemPrompt }
      ];
      if (Array.isArray(history)) {
        for (const h of history.slice(-6)) {
          messages.push({
            role: h.role === "assistant" ? "assistant" : "user",
            content: h.content
          });
        }
      }
      messages.push({ role: "user", content: prompt.trim() });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages
        })
      });
      const data = await res.json();
      generatedText = data.choices?.[0]?.message?.content || "No response generated.";
    }

    // Save AI reply
    await supabaseAdmin.from("ai_chat_messages").insert({
      user_id: callerUser.id,
      role: "ai",
      content: generatedText,
    });

    return new Response(
      JSON.stringify({ success: true, reply: generatedText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message, code: "EDGE_FUNCTION_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
