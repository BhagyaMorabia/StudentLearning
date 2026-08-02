'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import type { Subtopic } from '@/lib/db/schema';
import { Card } from '@/components/ui';
import dynamic from 'next/dynamic';

const DiagramRenderer = dynamic(() => import('./DiagramRenderer'), {
  ssr: false,
  loading: () => (
    <div className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-muted border border-border flex items-center justify-center text-muted-foreground">
      Loading Diagram...
    </div>
  ),
});

// ── Tab Configuration ─────────────────────────────────────────────────────────
const TABS = [
  { key: 'foundation', label: 'Foundation', emoji: '🧱', description: 'Basics & Intuition' },
  { key: 'concepts', label: 'Concepts', emoji: '📖', description: 'Deep Theory' },
  { key: 'formulas', label: 'Formulas', emoji: '📐', description: 'Problem Solving' },
  { key: 'practice', label: 'Practice', emoji: '💡', description: 'Examples & Tests' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface Props {
  subtopic: Subtopic;
}

// ── Shared Markdown Renderer ──────────────────────────────────────────────────
function ContentRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-h2:text-primary prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2 prose-h3:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground prose-table:border-collapse prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:bg-muted/50 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            if (match && match[1] === 'mermaid') {
              const codeString = Array.isArray(children) ? children.join('') : String(children);
              return <DiagramRenderer code={codeString.replace(/\n$/, '')} />;
            }
            return (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function StaticContentPanel({ subtopic }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('foundation');

  // Map tab keys to content fields
  const contentMap: Record<TabKey, string | null> = {
    foundation: (subtopic as any).contentFoundation ?? null,
    concepts: (subtopic as any).contentDeepConcepts ?? null,
    formulas: (subtopic as any).contentFormulas ?? null,
    practice: (subtopic as any).contentPractice ?? null,
  };

  // Check if we have V2 content (any of the 4 pages populated)
  const hasV2Content = Object.values(contentMap).some(c => c && c.length > 0);

  // Fallback to legacy rawContent if no V2 content exists
  if (!hasV2Content) {
    if (!subtopic.rawContent) {
      return (
        <Card className="p-6">
          <p className="text-muted-foreground">No content available for this topic yet.</p>
        </Card>
      );
    }

    // Legacy single-page rendering
    return (
      <Card className="p-6 md:p-8 bg-card border border-border shadow-sm">
        <ContentRenderer content={subtopic.rawContent} />

        {!!subtopic.keyFormulas && Array.isArray(subtopic.keyFormulas) && subtopic.keyFormulas.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">Key Formulas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subtopic.keyFormulas.map((kf: any, i: number) => (
                <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border flex flex-col gap-3">
                  <div className="overflow-x-auto pb-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {`$$${kf.latex}$$`}
                    </ReactMarkdown>
                  </div>
                  <p className="text-sm text-muted-foreground">{kf.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // ── V2: 4-Page Tabbed UI ────────────────────────────────────────────────────
  const activeContent = contentMap[activeTab];

  return (
    <div className="space-y-0">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-border bg-card rounded-t-[var(--radius-lg)]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const hasContent = contentMap[tab.key] && contentMap[tab.key]!.length > 0;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              disabled={!hasContent}
              className={`
                relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap
                transition-all duration-200 border-b-2 min-w-0 shrink-0
                ${isActive
                  ? 'border-primary text-primary bg-primary/5'
                  : hasContent
                    ? 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    : 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                }
              `}
              aria-selected={isActive}
              role="tab"
            >
              <span className="text-base">{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="hidden md:inline text-[11px] text-muted-foreground font-normal">
                {tab.description}
              </span>
              {!hasContent && (
                <span className="hidden sm:inline text-[10px] text-muted-foreground/50 font-normal">
                  (coming soon)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <Card className="p-6 md:p-8 bg-card border border-border border-t-0 rounded-t-none shadow-sm">
        {activeContent ? (
          <ContentRenderer content={activeContent} />
        ) : (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">{TABS.find(t => t.key === activeTab)?.emoji}</p>
            <p className="text-muted-foreground">
              Content for this section is being generated. Check back soon!
            </p>
          </div>
        )}
      </Card>

      {/* Page Progress Indicator */}
      <div className="flex items-center justify-center gap-2 pt-4">
        {TABS.map((tab) => {
          const hasContent = contentMap[tab.key] && contentMap[tab.key]!.length > 0;
          return (
            <button
              key={tab.key}
              onClick={() => hasContent && setActiveTab(tab.key)}
              className={`
                w-2.5 h-2.5 rounded-full transition-all duration-200
                ${activeTab === tab.key
                  ? 'bg-primary scale-125'
                  : hasContent
                    ? 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    : 'bg-muted-foreground/10'
                }
              `}
              aria-label={`Go to ${tab.label}`}
            />
          );
        })}
      </div>
    </div>
  );
}
