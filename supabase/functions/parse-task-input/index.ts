import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";

// Input validation schema
const MAX_INPUT_LENGTH = 500;

const ParseTaskInputSchema = z.object({
  input: z.string()
    .min(1, "Input text is required")
    .max(MAX_INPUT_LENGTH, `Input must be less than ${MAX_INPUT_LENGTH} characters`),
});

serve(async (req) => {
  const log = new Logger("parse-task-input");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate request
    const auth = await authenticateRequest(req);
    if (!auth) {
      log.warn("Unauthorized request");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    log.setContext({ userId: auth.user.id });

    // Rate limiting
    const rateCheck = checkRateLimit(auth.user.id, "parse-task-input", AI_RATE_LIMIT);
    if (!rateCheck.allowed) {
      log.warn("Rate limit exceeded");
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      );
    }
    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = ParseTaskInputSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input",
          details: validationResult.error.errors.map(e => e.message)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { input } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    log.info("Parsing task input");

    const today = new Date().toISOString().split("T")[0];
    
    const systemPrompt = `You are a task parser that extracts structured task information from natural language input.

Today's date is ${today}.

Priority mapping (1 is highest, 4 is lowest):
- "urgent", "critical", "asap", "immediately" -> 1
- "important", "high priority", "high" -> 2
- Normal/unspecified -> 3
- "low", "whenever", "not urgent", "someday" -> 4

Category detection:
- "work", "office", "report", "meeting", "client", "project", "deadline", "presentation" -> work
- "kid", "kids", "child", "school", "homework", "pickup", "drop off", "parent" -> kid
- "home", "house", "fix", "repair", "clean", "laundry", "grocery", "cook", "plumber", "electrician" -> home
- Otherwise -> other

Due date parsing (return ISO date format YYYY-MM-DD):
- "today" -> today's date
- "tomorrow" -> tomorrow's date
- "next week" -> 7 days from now
- "this weekend" -> this Saturday
- Day names like "Friday" -> the next occurrence of that day
- Specific dates -> parse them accordingly
- No date mentioned -> null

Status detection (only set when explicit; otherwise null):
- "today", "for today", "do today" -> today
- "right now", "starting now", "i'm doing it" -> in_progress
- "later", "someday", "backlog", "queue" -> backlog
- Anything ambiguous -> null

SCHEDULING CONTEXT (extract timing hints from natural language):
- "after my meeting", "after the 2pm call" -> dependent on a calendar event
- "before school pickup", "before 3pm" -> has a deadline constraint  
- "during lunch", "at lunchtime" -> preferred time window
- "in the morning", "this evening" -> preferred time of day
- "when I have time", "whenever" -> flexible scheduling
- "between meetings" -> needs a free slot
- "first thing" -> morning priority

Extract a clean, actionable title (remove time/priority words, keep it concise).
If there's additional context beyond the title, put it in the description.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this task: "${input}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_task",
              description: "Extract structured task data from natural language input",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Clean, actionable task title"
                  },
                  description: {
                    type: "string",
                    description: "Additional context or details, if any"
                  },
                  category: {
                    type: "string",
                    enum: ["home", "work", "kid", "other"],
                    description: "Task category based on context"
                  },
                  priority: {
                    type: "integer",
                    description: "Priority level: 1=urgent, 2=high, 3=normal, 4=low"
                  },
                  due_date: {
                    type: "string",
                    description: "Due date in YYYY-MM-DD format, or null if not specified"
                  },
                  task_status: {
                    type: "string",
                    enum: ["backlog", "today", "in_progress"],
                    description: "Task status if user explicitly indicated when to do it; omit otherwise"
                  }
                },
                required: ["title", "category", "priority"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_task" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse task input");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No valid response from AI");
    }

    const parsedTask = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        task: {
          title: parsedTask.title,
          description: parsedTask.description || null,
          task_category: parsedTask.category,
          priority_level: parsedTask.priority,
          due_date: parsedTask.due_date || null,
          scheduling_context: parsedTask.scheduling_context || null,
          task_status: parsedTask.task_status || null
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("parse-task-input error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse task";
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
