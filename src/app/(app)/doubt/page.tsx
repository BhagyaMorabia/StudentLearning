'use client';

import { useState, useRef } from 'react';
import MathRenderer from '@/components/learn/MathRenderer';
import { EmptyState, Input, Button } from '@/components/ui';
import { MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function DoubtPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    // Add placeholder for assistant response
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ai/doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });

        setMessages([
          ...newMessages,
          { role: 'assistant', content: assistantContent },
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `*Error: ${String(err)}*` },
      ]);
    } finally {
      setIsStreaming(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6 shrink-0">
        <h1 className="text-[20px] font-semibold text-foreground">Doubt Solver</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask any JEE question. I&apos;ll guide you to the answer Socratically.
        </p>
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={MessageCircle}
              title="Ask your first question"
              description="Examples: 'Why does current lag voltage in an inductor?' or 'I don't understand de Broglie wavelength'"
            />
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-5 py-4 ${
                msg.role === 'user'
                  ? 'bg-accent text-accent-foreground rounded-[var(--radius-lg)] rounded-tr-sm'
                  : 'bg-card border border-border rounded-[var(--radius-lg)] rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <MathRenderer content={msg.content || (isStreaming && idx === messages.length - 1 ? '▋' : '')} />
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-3 pt-4 border-t border-border shrink-0">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask your JEE doubt..."
          disabled={isStreaming}
          className="flex-1"
          id="doubt-input"
        />
        <Button
          variant="primary"
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          id="doubt-submit"
        >
          {isStreaming ? '...' : 'Ask'}
        </Button>
      </div>
    </div>
  );
}
