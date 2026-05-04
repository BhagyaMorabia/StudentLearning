"use client";

import React, { useEffect, useId, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { Lightbulb } from "lucide-react";

interface ContentRendererProps {
  content: string;
  className?: string;
}

export function ContentRenderer({ content, className }: ContentRendererProps) {
  return (
    <div className={`content-markdown ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId().replace(/:/g, "");
  const diagramId = id || `mermaid-${generatedId}`;

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      if (!containerRef.current || cancelled) return;

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#0c0c14",
            primaryColor: "#6366f1",
            primaryTextColor: "#eeeef3",
            primaryBorderColor: "#4f46e5",
            lineColor: "#5c5d72",
            secondaryColor: "#1c1c2e",
            tertiaryColor: "#13131f",
            fontSize: "14px",
          },
          flowchart: { htmlLabels: true, curve: "basis" },
        });

        const { svg } = await mermaid.render(diagramId, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<p style="color: var(--text-tertiary); font-style: italic; text-align: center; padding: 2rem;">Diagram rendering...</p>`;
        }
      }
    }

    renderDiagram();
    return () => { cancelled = true; };
  }, [chart, diagramId]);

  return (
    <div
      ref={containerRef}
      className="flex justify-center py-4"
      role="img"
      aria-label="Concept diagram"
    />
  );
}

interface FormulaCardProps {
  formulas: string[];
  title?: string;
}

export function FormulaCard({ formulas, title = "Key Formulas" }: FormulaCardProps) {
  if (!formulas.length) return null;

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-indigo-950/30 via-transparent to-transparent rounded-2xl border border-indigo-500/10">
      <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-5 flex items-center gap-2">
        <span className="text-base">∑</span> {title}
      </h4>
      <div className="space-y-2">
        {formulas.map((formula, i) => (
          <div key={i} className="katex-display !m-0">
            <ContentRenderer content={`$$${formula}$$`} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface KeyPointsProps {
  points: string[];
  title?: string;
  icon?: React.ReactNode;
  variant?: "info" | "warning" | "danger";
}

export function KeyPoints({ points, title = "Key Points", icon, variant = "info" }: KeyPointsProps) {
  if (!points.length) return null;

  const colors = {
    info: "from-blue-950/30 via-transparent to-transparent border-blue-500/10",
    warning: "from-amber-950/30 via-transparent to-transparent border-amber-500/10",
    danger: "from-red-950/30 via-transparent to-transparent border-red-500/10",
  };

  const textColors = {
    info: "text-blue-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  };

  const dotColors = {
    info: "bg-blue-400",
    warning: "bg-amber-400",
    danger: "bg-red-400",
  };

  return (
    <div className={`mt-8 p-6 bg-gradient-to-br ${colors[variant]} rounded-2xl border`}>
      <h4 className={`text-xs font-semibold ${textColors[variant]} uppercase tracking-widest mb-4 flex items-center gap-2`}>
        {icon || <Lightbulb className="w-4 h-4" />} {title}
      </h4>
      <ul className="space-y-2.5">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)] leading-relaxed">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} flex-shrink-0 mt-2`} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
