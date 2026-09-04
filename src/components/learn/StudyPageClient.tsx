'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import type { Subtopic } from '@/lib/db/schema';
import dynamic from 'next/dynamic';

const DiagramRenderer = dynamic(() => import('./DiagramRenderer'), {
  ssr: false,
  loading: () => (
    <div className="h-32 animate-pulse rounded bg-surface-elevated border border-surface-stroke flex items-center justify-center text-text-secondary text-[13px]">
      Loading diagram…
    </div>
  ),
});

const TABS = [
  { key: 'foundation', label: 'Foundation' },
  { key: 'concepts', label: 'Concepts' },
  { key: 'formulas', label: 'Formulas' },
  { key: 'practice', label: 'Practice' },
] as const;

type TabKey = typeof TABS[number]['key'];

export interface StudyNeighbor {
  id: string;
  name: string;
}

interface Props {
  subtopic: Subtopic;
  subjectName: string;
  chapterName: string;
  previous: StudyNeighbor | null;
  next: StudyNeighbor | null;
}

function ContentRenderer({ content }: { content: string }) {
  return (
    <div className="w-full content-markdown font-body-lg text-body-lg text-on-surface-variant max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h2(props) {
            return <h2 className="font-[Geist] text-headline-md font-semibold mt-12 mb-6 text-text-primary" {...props} />;
          },
          h3(props) {
            return <h3 className="font-[Geist] text-headline-sm font-semibold mt-8 mb-4 text-text-primary" {...props} />;
          },
          p(props) {
            return <p className="mb-6 leading-7" {...props} />;
          },
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            if (match && match[1] === 'mermaid') {
              const codeString = Array.isArray(children) ? children.join('') : String(children);
              return <DiagramRenderer code={codeString.replace(/\n$/, '')} />;
            }
            return (
              <code {...rest} className={`${className || ''} bg-surface-container font-label-mono text-primary px-1.5 py-0.5 rounded border border-surface-stroke`}>
                {children}
              </code>
            );
          },
          blockquote(props) {
            return (
              <blockquote className="bg-surface-elevated border border-surface-stroke rounded p-6 my-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="font-body-md text-body-md mb-0">{props.children}</div>
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function StudyPageClient({
  subtopic,
  subjectName,
  chapterName,
  previous,
  next,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('foundation');

  const contentMap: Record<TabKey, string | null> = {
    foundation: subtopic.contentFoundation ?? null,
    concepts: subtopic.contentDeepConcepts ?? null,
    formulas: subtopic.contentFormulas ?? null,
    practice: subtopic.contentPractice ?? null,
  };

  const hasV2Content = Object.values(contentMap).some((c) => c && c.length > 0);
  const activeContent = hasV2Content ? contentMap[activeTab] : subtopic.rawContent;

  return (
    <>
      <header className="w-full max-w-[720px] px-6 pt-12 pb-8 border-b border-surface-stroke">
        <div className="flex items-center gap-2 font-label-mono text-label-mono text-text-secondary mb-6 flex-wrap">
          <Link className="hover:text-primary transition-colors" href="/learn">Learn</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>{subjectName}</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>{chapterName}</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">{subtopic.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <h1 className="font-[Geist] text-display-lg font-bold text-text-primary mb-3 tracking-tight">
              {subtopic.name}
            </h1>
            <div className="flex items-center gap-4 font-label-mono text-label-mono flex-wrap">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                ~{subtopic.estimatedMinutes ?? 15} min read
              </span>
              {(subtopic.pyqFrequency ?? 0) > 0 && (
                <span className="flex items-center gap-1.5 text-secondary px-2 py-1 bg-secondary-fixed/10 border border-secondary/20 rounded">
                  <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  {subtopic.pyqFrequency} PYQ questions
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/learn/${subtopic.id}/quiz`}
            className="bg-primary hover:bg-primary/90 text-white font-body-md text-[14px] px-6 py-2.5 rounded transition-colors flex items-center justify-center gap-2 font-medium shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">quiz</span>
            Take Quiz
          </Link>
        </div>

        {hasV2Content && (
          <div className="flex gap-1 border-b border-surface-stroke w-full overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const hasContent = contentMap[tab.key] && contentMap[tab.key]!.length > 0;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  disabled={!hasContent}
                  className={`
                    px-4 py-3 font-label-mono text-label-mono whitespace-nowrap transition-colors
                    ${isActive
                      ? 'text-primary border-b-2 border-primary bg-surface-container-low'
                      : hasContent
                        ? 'text-text-secondary hover:text-on-surface hover:bg-surface-container-lowest'
                        : 'text-text-secondary/30 cursor-not-allowed'
                    }
                  `}
                >
                  {tab.label}
                  {!hasContent && <span className="ml-1 text-[10px] opacity-50">(soon)</span>}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <article className="w-full max-w-[720px] px-6 py-12">
        {activeContent ? (
          <ContentRenderer content={activeContent} />
        ) : (
          <div className="py-16 text-center">
            <p className="text-text-secondary font-body-md text-body-md">
              Content for this section is being generated. Check back soon.
            </p>
          </div>
        )}

        {(previous || next) && (
          <div className="mt-16 pt-8 border-t border-surface-stroke flex justify-between items-center gap-4">
            {previous ? (
              <Link
                href={`/learn/${previous.id}`}
                className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors font-label-mono text-label-mono min-w-0"
              >
                <span className="material-symbols-outlined text-lg shrink-0">arrow_back</span>
                <span className="truncate">{previous.name}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/learn/${next.id}`}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-label-mono text-label-mono min-w-0 text-right"
              >
                <span className="truncate">{next.name}</span>
                <span className="material-symbols-outlined text-lg shrink-0">arrow_forward</span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </article>
    </>
  );
}
