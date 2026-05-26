import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should our family focus on this week?",
  "How are we doing on our habits this month?",
  "Where is most of our money going?",
  "Plan our meals for the next 3 days",
];

const AskAi = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || !householdId || !user || isLoading) return;
      const userMessage: Message = { role: "user", content: text.trim() };
      const next = [...messages, userMessage];
      setMessages(next);
      setInput("");
      setIsLoading(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Not authenticated");

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              messages: next.map((m) => ({ role: m.role, content: m.content })),
              householdId,
              userId: user.id,
              module: "general",
            }),
          },
        );
        if (!response.ok || !response.body) throw new Error(await response.text());

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let assistantContent = "";
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, nl);
            textBuffer = textBuffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") last.content = assistantContent;
                  return updated;
                });
              }
            } catch {
              break;
            }
          }
        }
      } catch {
        toast({
          title: "Error",
          description: "FamilyDesk AI couldn't respond. Please try again.",
          variant: "destructive",
        });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && !last.content) updated.pop();
          return [
            ...updated,
            { role: "assistant", content: "I'm having trouble connecting. Please try again in a moment." },
          ];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [householdId, user, messages, isLoading, toast],
  );

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="page-container">
      <Header />
      <main className="page-content flex flex-col min-h-0">
        <div className="mb-4">
          <h1 className="page-heading flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            FamilyDesk AI
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ask anything about your household
          </p>
        </div>

        {isEmpty ? (
          <div className="flex-1 overflow-y-auto pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="flex items-start gap-2.5 text-left rounded-2xl border border-border bg-card hover:bg-accent transition-colors px-4 py-3.5 text-sm font-medium"
                >
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "px-3 py-2.5 max-w-[85%] text-[13px] leading-[1.6]",
                    msg.role === "user"
                      ? "bg-fd-green text-white rounded-[12px] rounded-br-sm"
                      : "bg-fd-green-light text-fd-green-dark rounded-tr-[12px] rounded-br-[12px] rounded-bl-[12px]",
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-fd-green-light rounded-tr-[12px] rounded-br-[12px] rounded-bl-[12px] px-3 py-3">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 bg-fd-green/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 bg-fd-green/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 bg-fd-green/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}

        <div className="pt-3 mt-2 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask FamilyDesk AI…"
              disabled={isLoading}
              className="flex-1 rounded-full h-10 bg-fd-surface border-0"
            />
            <Button
              onClick={() => send(input)}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="rounded-full h-10 w-10 flex-shrink-0"
              aria-label="Send"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AskAi;