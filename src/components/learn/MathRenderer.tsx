'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface Props {
  content: string;
  className?: string;
}

/**
 * MathRenderer — renders markdown with LaTeX math support.
 * 
 * Handles:
 * - Block math: $$...$$
 * - Inline math: $...$
 * - Standard markdown (bold, italic, lists, code)
 * - HTML (via rehype-raw — safe for AI output)
 */
export default function MathRenderer({ content, className = '' }: Props) {
  if (!content) return null;

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
