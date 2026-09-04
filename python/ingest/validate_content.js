import fs from 'node:fs';
import katex from 'katex';

const MIN_CONTENT_CHARS = 500;
const MAX_REPORTED_ERRORS = 20;
const FORBIDDEN_MARKERS = [
  /as an ai language model/i,
  /\bTODO\b/i,
  /\blorem ipsum\b/i,
  /cannot (answer|provide|help)/i,
];

function collectMathBlocks(content) {
  const blocks = [];
  const blockPattern = /\$\$([\s\S]*?)\$\$/g;
  let blockMatch;

  while ((blockMatch = blockPattern.exec(content)) !== null) {
    blocks.push({ mode: 'block', source: blockMatch[1] });
  }

  const withoutBlocks = content.replace(blockPattern, ' ');
  const inlinePattern = /(?<!\$)\$([^\n$]+?)\$(?!\$)/g;
  let inlineMatch;

  while ((inlineMatch = inlinePattern.exec(withoutBlocks)) !== null) {
    blocks.push({ mode: 'inline', source: inlineMatch[1] });
  }

  return blocks;
}

function validateMath(content, errors) {
  for (const block of collectMathBlocks(content)) {
    try {
      katex.renderToString(block.source, {
        throwOnError: true,
        displayMode: block.mode === 'block',
        strict: 'warn',
      });
    } catch (error) {
      errors.push(`KaTeX ${block.mode} error: ${error.message}`);
    }
  }
}

function validateMermaid(content, errors) {
  const mermaidPattern = /```mermaid\s*([\s\S]*?)```/g;
  let match;

  while ((match = mermaidPattern.exec(content)) !== null) {
    const diagram = match[1].trim();
    if (!diagram) {
      errors.push('Mermaid block is empty');
      continue;
    }

    if (!/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline)\b/m.test(diagram)) {
      errors.push('Mermaid block does not start with a supported diagram declaration');
    }
  }
}

function validateContent(content) {
  const errors = [];

  if (typeof content !== 'string') {
    return { valid: false, errors: ['content must be a string'] };
  }

  if (content.trim().length < MIN_CONTENT_CHARS) {
    errors.push(`content is too short: ${content.trim().length} chars`);
  }

  for (const marker of FORBIDDEN_MARKERS) {
    if (marker.test(content)) {
      errors.push(`forbidden placeholder/refusal marker matched: ${marker.source}`);
    }
  }

  validateMath(content, errors);
  validateMermaid(content, errors);

  return {
    valid: errors.length === 0,
    errors: errors.slice(0, MAX_REPORTED_ERRORS),
  };
}

try {
  const [inputPath] = process.argv.slice(2);
  if (!inputPath) {
    console.log(JSON.stringify({ valid: false, errors: ['No input file provided'] }));
    process.exit(0);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const content = data.content ?? '';
  console.log(JSON.stringify(validateContent(content)));
} catch (error) {
  console.log(JSON.stringify({ valid: false, errors: [error.message] }));
}
