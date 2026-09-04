'use client';

import { useState, useRef, useEffect } from 'react';
import MathRenderer from '@/components/learn/MathRenderer';
import { Kbd } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function DoubtPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCmd, setIsCmd] = useState(false);
  const [engineReady, setEngineReady] = useState(true);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      if (input === '') {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setIsCmd(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setIsCmd(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleExampleClick = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };
    const assistantMessageId = crypto.randomUUID();
    const requestMessages = [...messages, userMessage].map(({ role, content }) => ({
      role,
      content,
    }));
    const visibleMessages: Message[] = [
      ...messages,
      userMessage,
      { id: assistantMessageId, role: 'assistant', content: '' },
    ];

    setMessages(visibleMessages);
    setInput('');
    setIsStreaming(true);
    setEngineReady(false);

    try {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const res = await fetch('/api/ai/doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: requestMessages }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Request failed with ${res.status}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: assistantContent }
              : message
          )
        );
      }
    } catch (err) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: `*Error: ${String(err)}*` }
            : message
        )
      );
    } finally {
      setIsStreaming(false);
      setEngineReady(true);
      abortControllerRef.current = null;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full min-w-0 min-h-0 relative">
      <div className="flex-1 overflow-y-auto pb-40 md:pb-32 pt-8 md:pt-10 flex flex-col items-center w-full px-4 md:px-6">
        <div className="w-full max-w-[720px] flex flex-col gap-8 md:gap-10">
          {messages.length === 0 && (
            <div className="flex gap-4 md:gap-5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <span className="material-symbols-outlined text-[20px] text-primary filled pulse-dot">
                  psychology
                </span>
              </div>
              <div className="flex-1 pt-1.5 min-w-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="font-[Geist] text-headline-sm font-semibold text-text-primary tracking-[-0.01em]">
                    Neural Solver Initialized
                  </div>
                  <span className="px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/15 text-[9.5px] font-[JetBrains_Mono] font-bold tracking-[0.18em] uppercase text-primary">
                    Online
                  </span>
                </div>
                <p className="font-[Inter] text-[15px] leading-[28px] text-on-surface-variant">
                  I use the Socratic method to guide you through complex Physics, Chemistry, and Math problems.
                  Provide your doubt, and I will help you derive the solution step-by-step.
                </p>

                <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleExampleClick(
                        'How to resolve tension in a two-block pulley system?'
                      )
                    }
                    className="group flex flex-col items-start p-4 bg-surface-elevated border border-surface-stroke rounded-lg hover:border-primary/40 hover:bg-surface-container-lowest transition-all duration-200 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <span className="flex items-center gap-1.5 font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      Physics • Mechanics
                    </span>
                    <span className="font-[Inter] text-body-md leading-snug text-on-surface group-hover:text-text-primary transition-colors">
                      How to resolve tension in a two-block pulley system?
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExampleClick('Explain integration by parts conceptually.')}
                    className="group flex flex-col items-start p-4 bg-surface-elevated border border-surface-stroke rounded-lg hover:border-primary/40 hover:bg-surface-container-lowest transition-all duration-200 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <span className="flex items-center gap-1.5 font-[JetBrains_Mono] text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-2">
                      <span className="w-1 h-1 rounded-full bg-secondary" />
                      Math • Calculus
                    </span>
                    <span className="font-[Inter] text-body-md leading-snug text-on-surface group-hover:text-text-primary transition-colors">
                      Explain integration by parts conceptually.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-4 md:gap-5 w-full',
                msg.role === 'user' ? 'justify-end' : ''
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <span className="material-symbols-outlined text-[19px] text-primary filled">
                    psychology_alt
                  </span>
                </div>
              )}

              {msg.role === 'user' ? (
                <div className="max-w-[85%] md:max-w-[78%] flex flex-col items-end">
                  <div className="bg-gradient-to-br from-primary/[0.18] to-surface-elevated border border-primary/30 rounded-2xl rounded-tr-md p-4 md:p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.18)]">
                    <p className="font-[Inter] text-[15px] leading-[26px] text-on-surface">
                      {msg.content}
                    </p>
                  </div>
                  <span className="text-[10px] font-[JetBrains_Mono] tracking-wider text-text-secondary/60 mt-2 pr-1">
                    YOU
                  </span>
                </div>
              ) : (
                <div className="flex-1 pt-1 font-[Inter] text-body-lg leading-[28px] text-on-surface-variant min-w-0">
                  <MathRenderer
                    content={
                      msg.content ||
                      (isStreaming && idx === messages.length - 1 ? ' ' : '')
                    }
                  />
                  {isStreaming && idx === messages.length - 1 && (
                    <span className="inline-block w-[7px] h-[18px] bg-primary align-middle ml-1 mt-[-3px] rounded-sm cursor-blink" />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="sticky bottom-0 left-0 w-full px-4 md:px-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 pt-4 flex justify-center bg-gradient-to-t from-surface-base via-surface-base/97 to-transparent">
        <div className="w-full max-w-[720px]">
          <div className="relative rounded-2xl border border-surface-stroke/90 bg-surface-elevated/80 backdrop-blur-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.035)] p-2 md:p-2.5 flex items-end gap-2 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.55),0_0_0_1px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200">
            <button
              type="button"
              aria-label="Attach file"
              className="hidden sm:flex w-9 h-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:text-primary hover:bg-surface-container transition-all duration-200 mb-0.5"
            >
              <span className="material-symbols-outlined text-[20px]">attach_file</span>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                const isMac =
                  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
                const modifier = isMac ? e.metaKey : e.ctrlKey;
                if (e.key === 'Enter' && modifier && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="w-full bg-transparent border-none resize-none font-[Inter] text-[14.5px] leading-[24px] text-on-surface placeholder:text-on-surface-variant/50 max-h-48 py-2.5 px-2 md:px-2 outline-none"
              placeholder="Ask any JEE doubt… (Supports LaTeX $...$)"
              rows={1}
              disabled={isStreaming}
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className={cn(
                'relative w-9 h-9 shrink-0 rounded-md flex items-center justify-center transition-all duration-200 mb-0.5',
                isStreaming || !input.trim()
                  ? 'bg-surface-container text-text-secondary cursor-not-allowed'
                  : 'bg-primary hover:bg-[#2563EB] text-primary-foreground shadow-[0_0_18px_rgba(59,130,246,0.35)] hover:shadow-[0_0_26px_rgba(59,130,246,0.5)]'
              )}
            >
              <span className="material-symbols-outlined text-[19px] filled">
                {isStreaming ? 'stop' : 'send'}
              </span>
            </button>
          </div>

          <div className="flex justify-between items-center px-1 mt-2.5 md:px-2">
            <div className="flex items-center gap-3 md:gap-4 font-[JetBrains_Mono] text-[10.5px] text-on-surface-variant/60">
              <span className="flex items-center gap-1.5">
                {isCmd ? (
                  <>
                    <Kbd>⌘</Kbd>
                  </>
                ) : (
                  <Kbd>⌘</Kbd>
                )}
                <span>+</span>
                <Kbd>↵</Kbd>
                <span>Send</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                LaTeX:
                <Kbd>$</Kbd>
                <Kbd>$</Kbd>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  engineReady ? 'bg-primary pulse-dot' : 'bg-surface-stroke'
                )}
              />
              <span className="font-[JetBrains_Mono] text-[10px] tracking-[0.15em] uppercase text-on-surface-variant/60">
                {engineReady ? 'Neural Engine Ready' : 'Streaming…'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
