'use client';

import { useState, useEffect } from 'react';
import MathRenderer from './MathRenderer';
import DiagramRenderer from './DiagramRenderer';
import type { TeachingResponse } from '@/lib/ai/schemas';
import { Card, ErrorState } from '@/components/ui';
import { Lightbulb, FlaskConical, Workflow, PencilLine, TriangleAlert, Target, X, Check } from 'lucide-react';

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
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
              {state === 'loading' ? 'Loading...' : `Teaching ${subtopicName}...`}
            </span>
          </div>
          {state === 'streaming' && rawText && (
            <div className="font-mono text-xs text-muted-foreground bg-muted rounded-[var(--radius-sm)] p-3 max-h-20 overflow-hidden opacity-50">
              {rawText.slice(-200)}
            </div>
          )}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return <ErrorState message={error ?? 'An error occurred'} onRetry={loadContent} />;
  }

  if (!content) return null;

  return (
    <div className="space-y-6">
      {/* Hook */}
      {content.hook && (
        <div className="rounded-[var(--radius-lg)] border-l-4 border-accent bg-muted p-5">
          <p className="text-sm italic text-foreground/90">&ldquo;{content.hook}&rdquo;</p>
        </div>
      )}

      {/* Intuition */}
      <Card className="space-y-4">
        <h2 className="font-semibold text-base flex items-center gap-2.5 text-foreground">
          <Lightbulb className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> Intuition
        </h2>
        <MathRenderer content={content.intuition} />
      </Card>

      {/* Core Concept */}
      <Card className="space-y-4">
        <h2 className="font-semibold text-base flex items-center gap-2.5 text-foreground">
          <FlaskConical className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> Core Concept
        </h2>
        <MathRenderer content={content.core_concept} />
      </Card>

      {/* Diagram */}
      {content.diagram_spec?.type && content.diagram_spec.type !== 'null' && content.diagram_spec.mermaid_code && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2.5 text-foreground">
            <Workflow className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> {content.diagram_spec.description}
          </h2>
          <DiagramRenderer code={content.diagram_spec.mermaid_code} />
        </Card>
      )}

      {/* Worked Example */}
      {content.worked_example && (
        <Card className="space-y-5">
          <h2 className="font-semibold text-base flex items-center gap-2.5 text-foreground">
            <PencilLine className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> Worked Example
          </h2>
          <div className="bg-muted border border-border rounded-[var(--radius-lg)] p-5">
            <MathRenderer content={content.worked_example.problem} />
          </div>
          <div className="space-y-4">
            {content.worked_example.solution.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                  {step.step}
                </div>
                <div className="flex-1 space-y-1 mt-0.5">
                  <p className="text-sm text-muted-foreground">{step.explanation}</p>
                  {step.math && <MathRenderer content={step.math} />}
                </div>
              </div>
            ))}
          </div>
          {content.worked_example.jee_tip && (
            <div className="mt-4 p-4 border-l-4 border-mastery-learning bg-mastery-learning/10 rounded-[var(--radius-lg)]">
              <p className="text-sm text-mastery-learning">
                <strong className="font-semibold">JEE Tip:</strong> {content.worked_example.jee_tip}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Common Mistakes */}
      {content.common_mistakes?.length > 0 && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2.5 text-foreground">
            <TriangleAlert className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> Common Mistakes
          </h2>
          <ul className="space-y-3">
            {content.common_mistakes.map((mistake, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                <MathRenderer content={mistake} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Key Takeaways */}
      {content.key_takeaways?.length > 0 && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2.5 text-foreground">
            <Target className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> Key Takeaways
          </h2>
          <ul className="space-y-3">
            {content.key_takeaways.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <MathRenderer content={point} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* JEE Context */}
      {content.jee_context && (
        <Card className="bg-muted p-5 border border-border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground font-semibold">JEE Context:</strong> {content.jee_context}
          </p>
        </Card>
      )}
    </div>
  );
}
