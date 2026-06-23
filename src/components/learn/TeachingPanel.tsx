'use client';

import { useState, useEffect } from 'react';
import MathRenderer from './MathRenderer';
import DiagramRenderer from './DiagramRenderer';
import type { TeachingResponse } from '@/lib/ai/schemas';

interface Props {
  subtopicId: string;
  subtopicName: string;
}

type LoadingState = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export default function TeachingPanel({ subtopicId, subtopicName }: Props) {
  const [state, setState] = useState<LoadingState>('idle');
  const [content, setContent] = useState<TeachingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtopicId]);

  async function loadContent() {
    setState('loading');
    setError(null);
    setRawText('');
    setContent(null);

    try {
      const res = await fetch('/api/ai/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtopicId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      // Check if it's a cached response (non-streaming)
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.data) {
          setContent(data.data);
          setState('done');
          return;
        }
      }

      // Streaming response
      setState('streaming');
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setRawText(accumulated);
      }

      // Parse the complete JSON
      try {
        const parsed = JSON.parse(accumulated) as TeachingResponse;
        setContent(parsed);
        setState('done');
      } catch {
        throw new Error('AI returned malformed content. Please try again.');
      }
    } catch (err) {
      setError(String(err));
      setState('error');
    }
  }

  // Loading skeleton
  if (state === 'loading' || state === 'streaming') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
              {state === 'loading' ? 'Loading...' : `Teaching ${subtopicName}...`}
            </span>
          </div>
          {state === 'streaming' && rawText && (
            <div className="font-mono text-xs text-muted-foreground bg-muted rounded p-3 max-h-20 overflow-hidden opacity-50">
              {rawText.slice(-200)}
            </div>
          )}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <button
          onClick={loadContent}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="space-y-6">
      {/* Hook */}
      {content.hook && (
        <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
          <p className="text-base italic text-foreground/90">&ldquo;{content.hook}&rdquo;</p>
        </div>
      )}

      {/* Intuition */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <span className="text-xl">💡</span> Intuition
        </h2>
        <MathRenderer content={content.intuition} />
      </section>

      {/* Core Concept */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <span className="text-xl">🔬</span> Core Concept
        </h2>
        <MathRenderer content={content.core_concept} />
      </section>

      {/* Diagram */}
      {content.diagram_spec?.type && content.diagram_spec.type !== 'null' && content.diagram_spec.mermaid_code && (
        <section className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span className="text-xl">📊</span> {content.diagram_spec.description}
          </h2>
          <DiagramRenderer code={content.diagram_spec.mermaid_code} />
        </section>
      )}

      {/* Worked Example */}
      {content.worked_example && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span className="text-xl">✏️</span> Worked Example
          </h2>
          <div className="bg-muted/50 rounded-lg p-4">
            <MathRenderer content={content.worked_example.problem} />
          </div>
          <div className="space-y-3">
            {content.worked_example.solution.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                  {step.step}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-muted-foreground">{step.explanation}</p>
                  {step.math && <MathRenderer content={step.math} />}
                </div>
              </div>
            ))}
          </div>
          {content.worked_example.jee_tip && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>JEE Tip:</strong> {content.worked_example.jee_tip}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Common Mistakes */}
      {content.common_mistakes?.length > 0 && (
        <section className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span className="text-xl">⚠️</span> Common Mistakes
          </h2>
          <ul className="space-y-2">
            {content.common_mistakes.map((mistake, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-destructive mt-0.5">✗</span>
                <MathRenderer content={mistake} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Key Takeaways */}
      {content.key_takeaways?.length > 0 && (
        <section className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span className="text-xl">🎯</span> Key Takeaways
          </h2>
          <ul className="space-y-2">
            {content.key_takeaways.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary mt-0.5">✓</span>
                <MathRenderer content={point} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* JEE Context */}
      {content.jee_context && (
        <section className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">JEE Context:</strong> {content.jee_context}
          </p>
        </section>
      )}
    </div>
  );
}
