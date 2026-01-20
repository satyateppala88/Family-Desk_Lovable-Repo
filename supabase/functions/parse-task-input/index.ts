import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();
    
    if (!input || typeof input !== "string") {
      return new Response(
        JSON.stringify({ error: "Input text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
                    enum: [1, 2, 3, 4],
                    description: "Priority level: 1=urgent, 2=high, 3=normal, 4=low"
                  },
                  due_date: {
                    type: "string",
                    description: "Due date in YYYY-MM-DD format, or null if not specified"
                  }
                },
                required: ["title", "category", "priority"]
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
          due_date: parsedTask.due_date || null
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("parse-task-input error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse task";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
