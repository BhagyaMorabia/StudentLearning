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
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
        });

        // Small delay to ensure DOM is fully ready
        await new Promise(r => setTimeout(r, 50));

        const id = `diagram-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);

        if (!cancelled) setSvg(svg);
      } catch (err) {
        console.error("Mermaid error:", err);
        if (!cancelled) {
          setError(`Diagram error: ${String(err)}`);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="text-xs text-destructive bg-destructive/10 rounded-[var(--radius-sm)] p-2">
        {error}
      </div>
    );
  }

  if (!svg) {
    return <div className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-muted" />;
  }

  return (
    <div
      ref={ref}
      className="overflow-x-auto rounded-[var(--radius-lg)] bg-muted p-4 border border-border"
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-label="Interactive learning diagram"
      role="img"
    />
  );
}
