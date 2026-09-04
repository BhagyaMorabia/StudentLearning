'use client';

import DOMPurify from 'isomorphic-dompurify';
import { useEffect, useRef, useState } from 'react';

interface Props {
  code: string;
}

/**
 * DiagramRenderer — renders Mermaid.js diagrams.
 *
 * Security (FAANG-grade layered hardening):
 *  1. Mermaid `securityLevel: 'strict'` disables HTML in <foreignObject>.
 *  2. `htmlLabels: true` only renders structured <span>/<div> inside label wrappers;
 *     all user-controlled text still flows through Mermaid's sanitizer first.
 *  3. Rendered SVG is sanitized via DOMPurify (SVG + SVG Filters profile) before
 *     injection. This defeats any future Mermaid parser escape that could yield
 *     script-injectable markup.
 *  4. Post-sanitization, we explicitly stamp a text-color `fill` on every SVG
 *     <text> element that lacks one. This defends against theme-variable-based
 *     fill attributes being stripped by Purify, which was causing empty/invisible
 *     flowchart boxes.
 *  5. Layer 5 (globals.css) has a CSS fallback rule for double insurance.
 *
 * Must be a client component (Mermaid requires the DOM).
 * Dynamic import prevents SSR issues.
 */
export default function DiagramRenderer({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
          htmlLabels: true,
          themeVariables: {
            primaryTextColor: '#e5e7eb',
            lineColor: '#6b7280',
            secondaryColor: '#374151',
            tertiaryColor: '#1f2937',
            fontSize: '14px',
          },
        });

        await new Promise(r => setTimeout(r, 50));

        const id = `diagram-${Math.random().toString(36).slice(2)}`;
        const { svg: rawSvg } = await mermaid.render(id, code);
        const safeSvg = DOMPurify.sanitize(rawSvg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_ATTR: ['target'],
        });

        // Defensive: ensure every <text> element has an explicit fill.
        // DOMPurify strips CSS-custom-property-driven fills on some dark-theme
        // SVG wrapper nodes; this ensures text remains visible regardless.
        const withExplicitTextFill = safeSvg.replace(
          /<text(?![^>]*\bfill\s*=)/g,
          '<text fill="#e5e7eb"',
        );

        // Same defense for mermaid's edge labels which use <tspan> inside empty-filled <g>
        const withTspanFill = withExplicitTextFill.replace(
          /<tspan(?![^>]*\bfill\s*=)/g,
          '<tspan fill="#e5e7eb"',
        );

        if (!cancelled) setSvg(withTspanFill);
      } catch (err) {
        console.error('[DiagramRenderer] Mermaid error:', err);
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
    return <div className="min-h-[300px] w-full animate-pulse rounded bg-surface-elevated" />;
  }

  return (
    <div
      ref={ref}
      className="mermaid-diagram-wrap overflow-x-auto rounded bg-surface-elevated p-4 border border-surface-stroke"
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-label="Interactive learning diagram"
      role="img"
    />
  );
}
