'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
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
 */
export default function MathRenderer({ content, className = '' }: Props) {
  if (!content) return null;

  return (
    <div className={`content-markdown overflow-x-auto overflow-y-hidden ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
