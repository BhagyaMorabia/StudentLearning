'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  code: string;
}

/**
 * DiagramRenderer — renders Mermaid.js diagrams.
 *
 * Must be a client component (Mermaid requires the DOM).
 * Dynamic import prevents SSR issues.
 */
export default function DiagramRenderer({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (!code || !ref.current) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import — Mermaid is a large library, load on demand
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            background: 'transparent',
            primaryColor: '#6366f1',
            primaryTextColor: '#f1f5f9',
            lineColor: '#94a3b8',
          },
        });

        const id = `diagram-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);

        if (!cancelled) setSvg(svg);
      } catch (err) {
        if (!cancelled) {
          setError(`Diagram error: ${String(err)}`);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
        {error}
      </div>
    );
  }

  if (!svg) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div
      ref={ref}
      className="overflow-x-auto rounded-lg bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
