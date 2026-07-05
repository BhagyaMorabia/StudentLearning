'use client';

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
  loading: () => <div className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-muted border border-border flex items-center justify-center text-muted-foreground">Loading Diagram...</div>
});

interface Props {
  subtopic: Subtopic;
}

export default function StaticContentPanel({ subtopic }: Props) {
  if (!subtopic.rawContent) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No content available for this topic yet.</p>
      </Card>
    );
  }

  let theoryContent = subtopic.rawContent;
  let examplesContent = '';

  const exampleStartMatch = /(?:^|\n)##\s*(?:Worked\s+)?Examples/i.exec(theoryContent);
  if (exampleStartMatch) {
    const startIdx = exampleStartMatch.index;
    const contentAfter = theoryContent.slice(startIdx + exampleStartMatch[0].length);
    
    const exampleEndMatch = /(?:^|\n)(?:---|##\s+)/.exec(contentAfter);
    if (exampleEndMatch) {
      examplesContent = contentAfter.slice(0, exampleEndMatch.index);
      theoryContent = theoryContent.slice(0, startIdx) + contentAfter.slice(exampleEndMatch.index);
    } else {
      examplesContent = contentAfter;
      theoryContent = theoryContent.slice(0, startIdx);
    }
  }

  return (
    <Card className="p-6 md:p-8 bg-card border border-border shadow-sm">
      <div className="prose prose-invert max-w-none prose-h2:text-primary prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2 prose-h3:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground">
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
          {theoryContent}
        </ReactMarkdown>
      </div>

      {examplesContent && (
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Worked Examples
          </h2>
          <div className="p-6 rounded-xl bg-muted/30 border border-primary/20 shadow-inner">
            <div className="prose prose-invert max-w-none prose-h3:text-primary prose-h3:border-b-0 prose-h3:first:mt-0 prose-strong:text-foreground">
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
                    return <code {...rest} className={className}>{children}</code>;
                  }
                }}
              >
                {examplesContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

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
