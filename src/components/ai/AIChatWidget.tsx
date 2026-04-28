import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Send, Loader2, Sparkles, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { VoiceInputButton } from "@/components/voice/VoiceInputButton";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Contextual prompt chips based on current route ───
const PROMPT_CHIPS: Record<string, string[]> = {
  meals: ["Plan meals this week", "Find a vegetarian recipe", "Add meals to grocery list", "What's in my pantry?"],
  tasks: ["Add a task", "What's due today?", "Mark tasks complete", "Show overdue tasks"],
  finance: ["Show this month's spending", "Add a transaction", "How is my budget?", "Set a savings goal"],
  default: ["Plan meals this week", "Add a task", "What's due today?", "Show spending summary"],
};

const getRouteCategory = (pathname: string): string => {
  if (pathname.includes("/meals")) return "meals";
  if (pathname.includes("/tasks") || pathname.includes("/taskmaster")) return "tasks";
  if (pathname.includes("/finance")) return "finance";
  if (pathname.includes("/grocery")) return "meals";
  return "default";
};

// ─── Rotating placeholders ───
const PLACEHOLDERS = [
  "Plan this week's meals...",
  "Add a task for tomorrow...",
  "What did we spend last month?",
  "What's in my pantry?",
];

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const SESSION_KEY = "fd_ai_chat";

const loadSession = (): Message[] | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { date, messages } = JSON.parse(raw);
    if (date !== new Date().toISOString().slice(0, 10)) return null;
    return messages;
  } catch { return null; }
};

const saveSession = (messages: Message[]) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), messages }));
  } catch { /* quota */ }
};

export const AIChatWidget = () => {
  const { user, loading, isEmailVerified } = useAuth();
  const { householdId, householdName } = useHousehold();
  const { toast } = useToast();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadSession() || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } =
    useSpeechSynthesis({ language: "en-IN" });

  // Stop any ongoing speech when the widget closes
  useEffect(() => {
    if (!isOpen && isSpeaking) stopSpeaking();
  }, [isOpen, isSpeaking, stopSpeaking]);

  // Rotate placeholder
  useEffect(() => {
    const timer = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist to session
  useEffect(() => {
    if (messages.length > 0) saveSession(messages);
  }, [messages]);

  const routeCategory = getRouteCategory(location.pathname);
  const promptChips = PROMPT_CHIPS[routeCategory] || PROMPT_CHIPS.default;

  const displayName = useMemo(() => {
    return user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there";
  }, [user]);

  const houseName = householdName || "your household";

  const greeting = `${getTimeGreeting()}, ${displayName}. How can I help ${houseName} today?`;

  const clearConversation = () => {
    setMessages([]);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msgText = text || input;
    if (!msgText.trim() || !householdId || !user) return;

    // Stop any in-progress reply playback when a new message is sent
    if (isSpeaking) stopSpeaking();

    const userMessage: Message = { role: "user", content: msgText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const allMessages = [...messages, userMessage];

      // Get the user's actual JWT token for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ messages: allMessages.map(m => ({ role: m.role, content: m.content })), householdId, userId: user.id }),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") last.content = assistantContent;
                return updated;
              });
            }
          } catch { break; }
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.content) updated.pop();
        return [...updated, { role: "assistant", content: "I'm having trouble connecting. Please try again in a moment." }];
      });
    } finally {
      setIsLoading(false);
      // Speak the assistant's reply only when the user started this exchange by voice
      if (voiceReplyEnabled && ttsSupported && assistantContent.trim()) {
        speak(assistantContent);
      }
      // Reset voice-reply intent after each turn — must be re-triggered by next mic press
      setVoiceReplyEnabled(false);
    }
  }, [input, messages, householdId, user, toast, voiceReplyEnabled, ttsSupported, speak, isSpeaking, stopSpeaking]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) { e.preventDefault(); sendMessage(); }
  };

  // ─── Chat content (shared between mobile/desktop) ───
  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Family Desk AI</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearConversation}>
              <RotateCcw className="w-3 h-3 mr-1" /> Start fresh
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Greeting (always shown at top) */}
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <p className="text-sm">{greeting}</p>
                  </div>
                  {/* Capability disclosure */}
                  <p className="text-[11px] text-muted-foreground pl-1">
                    I can plan meals, manage tasks, update your grocery list, and answer questions about your household.
                  </p>
                </div>
              </div>

              {/* Prompt chips */}
              <div className="flex flex-wrap gap-1.5 pl-10">
                {promptChips.map(chip => (
                  <Badge
                    key={chip}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors py-1 px-2.5"
                    onClick={() => sendMessage(chip)}
                  >
                    {chip}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[85%]",
                msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
              )}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3 bg-background">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            disabled={isLoading}
            className="flex-1 rounded-full h-10"
          />
          <VoiceInputButton
            onTranscript={(text) =>
              setInput((prev) => (prev ? prev + " " + text : text))
            }
            onVoiceStart={() => setVoiceReplyEnabled(true)}
            language="en-IN"
            continuous={true}
            disabled={isLoading}
            variant="outline"
            className="rounded-full h-10 w-10"
            title="Speak (AI will reply aloud)"
          />
          {isSpeaking && (
            <Button
              type="button"
              onClick={stopSpeaking}
              size="icon"
              variant="outline"
              className="flex-shrink-0 rounded-full h-10 w-10"
              title="Stop speaking"
              aria-label="Stop speaking"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="flex-shrink-0 rounded-full h-10 w-10"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Trigger button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-[60] bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Mobile: bottom drawer ~65% */}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[65vh] max-h-[65vh]">
            {chatContent}
          </DrawerContent>
        </Drawer>
      ) : (
        /* Desktop: right-side panel */
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="w-[420px] sm:w-[460px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>AI Assistant</SheetTitle>
            </SheetHeader>
            {chatContent}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
