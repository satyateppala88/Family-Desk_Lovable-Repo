import { useEffect, useRef, useState, useCallback } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
}

export const AIActionSheet = ({ isOpen, onClose, initialPrompt }: AIActionSheetProps) => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  const send = useCallback(
    async (text: string, baseHistory: Message[]) => {
      if (!text.trim() || !householdId || !user) return;
      const userMessage: Message = { role: "user", content: text.trim() };
      const next = [...baseHistory, userMessage];
      setMessages(next);
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
      } catch (err) {
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
            {
              role: "assistant",
              content: "I'm having trouble connecting. Please try again in a moment.",
            },
          ];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [householdId, user, toast],
  );

  // Auto-fire the initial prompt on open; reset state on close.
  useEffect(() => {
    if (isOpen && !firedRef.current && householdId && user) {
      firedRef.current = true;
      void send(initialPrompt, []);
    }
    if (!isOpen) {
      firedRef.current = false;
      setMessages([]);
      setInput("");
      setIsLoading(false);
    }
  }, [isOpen, householdId, user, initialPrompt, send]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    void send(text, messages);
  };

  const footer = (
    <div className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Ask a follow-up…"
        disabled={isLoading}
        className="flex-1 rounded-full h-10 bg-fd-surface border-0"
      />
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !input.trim()}
        size="icon"
        className="rounded-full h-10 w-10 flex-shrink-0"
        aria-label="Send"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          FamilyDesk AI
        </span>
      }
      footer={footer}
    >
      <div className="space-y-4 max-h-[60vh]">
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
                <div
                  className="h-1.5 w-1.5 bg-fd-green/60 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-1.5 w-1.5 bg-fd-green/60 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-1.5 w-1.5 bg-fd-green/60 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
    </BottomSheet>
  );
};

export default AIActionSheet;