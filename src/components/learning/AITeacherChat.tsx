"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { ContentRenderer } from "./ContentRenderer";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AITeacherChatProps {
  subtopicName: string;
  markdownContent: string;
  weaknessLevel: string;
  onClose: () => void;
}

export function AITeacherChat({ subtopicName, markdownContent, weaknessLevel, onClose }: AITeacherChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);

  const handleSend = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    const newMessages: Message[] = [
      ...messagesRef.current,
      { role: "user", content: userText }
    ];

    messagesRef.current = newMessages;
    setMessages(newMessages.filter((m) => m.role !== "system")); // show only non-system in UI
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/teach-interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtopicName,
          markdownContent,
          weaknessLevel,
          messages: newMessages,
        }),
      });

      const data: { text?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send message");

      const updatedMessages: Message[] = [
        ...messagesRef.current,
        { role: "assistant", content: data.text || "No response generated." },
      ];
      messagesRef.current = updatedMessages;
      setMessages(updatedMessages);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert("Failed to send message: " + message);
    } finally {
      setIsLoading(false);
    }
  }, [markdownContent, subtopicName, weaknessLevel]);

  useEffect(() => {
    // Start the chat automatically
    handleSend("Teach this subtopic to me from absolute scratch. Give me only Part 1 right now, keep it small, ask one quick check question, and wait for me to type 'yes' before moving to Part 2. If I ask a doubt, answer it and continue from the same point.");
  }, [handleSend]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-[600px] bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-border)] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--surface-border)] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Personal Tutor</h3>
            <p className="text-xs text-[var(--text-tertiary)]">Teaching: {subtopicName}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(m => m.role !== "system").map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-5 py-3 text-sm",
              msg.role === "user" 
                ? "bg-indigo-600 text-white rounded-tr-sm" 
                : "bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-tl-sm text-[var(--text-secondary)]"
            )}>
              {msg.role === "user" ? (
                <p>{msg.content}</p>
              ) : (
                <div className="prose-sm prose-invert max-w-none prose-p:my-2">
                  <ContentRenderer content={msg.content} />
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              Tutor is typing...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-[var(--surface-border)] bg-white/[0.02]">
        <form 
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type 'yes' to continue, or ask a question..."
            className="flex-1 bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="rounded-xl px-4 py-3 bg-indigo-600 hover:bg-indigo-500">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
