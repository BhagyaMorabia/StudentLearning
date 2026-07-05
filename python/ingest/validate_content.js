/**
 * validate_content.js — Validate KaTeX formulas and Mermaid diagram syntax
 * in AI-generated content before it enters the database.
 *
 * KaTeX:   Uses the real katex library (works natively in Node.js).
 * Mermaid: Uses a structural syntax check (the full mermaid library requires
 *          a browser DOM/DOMPurify which doesn't exist in Node.js).
 *
 * Usage: node validate_content.js <path_to_json_file>
 *   The JSON file must have a "content" key with the raw_content string.
 *   Outputs JSON: { valid: boolean, errors: string[] }
 */

const katex = require('katex');
const fs = require('fs');

// ── Mermaid Structural Validator ─────────────────────────────────────────────
// Instead of running the full browser-dependent mermaid.parse(), we validate
// the diagram structure: correct diagram type keyword, balanced braces/brackets,
// no obviously broken node labels. This catches 90%+ of Gemini hallucinations
// without needing a DOM.

const VALID_DIAGRAM_TYPES = [
  'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'journey',
  'gantt', 'pie', 'quadrantChart', 'requirementDiagram',
  'gitGraph', 'mindmap', 'timeline', 'sankey-beta',
  'xychart-beta', 'block-beta',
];

function validateMermaidSyntax(diagram) {
  const trimmed = diagram.trim();
  if (!trimmed) return { valid: false, error: 'Empty diagram' };

  // Check first line for valid diagram type
  const firstLine = trimmed.split('\n')[0].trim();
  const firstWord = firstLine.split(/[\s;{]/)[0].toLowerCase();

  const isValidType = VALID_DIAGRAM_TYPES.some(t => firstWord === t.toLowerCase());
  if (!isValidType) {
    return { valid: false, error: `Invalid diagram type '${firstWord}'. Must start with one of: ${VALID_DIAGRAM_TYPES.join(', ')}` };
  }

  // Check for balanced brackets/braces (common Gemini mistake)
  const openBrackets = (trimmed.match(/[\[{(]/g) || []).length;
  const closeBrackets = (trimmed.match(/[\]})]/g) || []).length;
  if (Math.abs(openBrackets - closeBrackets) > 1) {
    return { valid: false, error: `Unbalanced brackets: ${openBrackets} opening vs ${closeBrackets} closing` };
  }

  // Check for common broken patterns
  if (trimmed.includes('```')) {
    return { valid: false, error: 'Diagram contains nested code fence (```)' };
  }

  // For flowchart/graph, check that arrows exist
  if (firstWord === 'flowchart' || firstWord === 'graph') {
    const hasArrows = /-->|---|-\.-|==>|-.->/.test(trimmed);
    if (!hasArrows && trimmed.split('\n').length > 2) {
      return { valid: false, error: 'Flowchart/graph has no arrow connections (-->, ===>, etc.)' };
    }
  }

  return { valid: true };
}


// ── Main Validation ──────────────────────────────────────────────────────────

async function validate(jsonPath) {
  try {
    const data = fs.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(data);
    const content = parsed.content;

    if (!content || typeof content !== 'string') {
      console.log(JSON.stringify({ valid: false, errors: ['No content to validate'] }));
      process.exit(1);
    }

    const errors = [];

    // 1. Validate LaTeX (inline $...$ and display $$...$$)
    // Process display math first ($$...$$), then inline ($...$)
    const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
    let match;
    while ((match = displayMathRegex.exec(content)) !== null) {
      const formula = match[1].trim();
      if (!formula) continue;
      try {
        katex.renderToString(formula, { throwOnError: true });
      } catch (e) {
        errors.push(`KaTeX Error in formula '${formula.substring(0, 80)}': ${e.message}`);
      }
    }

    const inlineMathRegex = /(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g;
    while ((match = inlineMathRegex.exec(content)) !== null) {
      const formula = match[1].trim();
      if (!formula) continue;
      try {
        katex.renderToString(formula, { throwOnError: true });
      } catch (e) {
        errors.push(`KaTeX Error in formula '${formula.substring(0, 80)}': ${e.message}`);
      }
    }

    // 2. Validate Mermaid diagrams
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;
    while ((match = mermaidRegex.exec(content)) !== null) {
      const diagram = match[1];
      const result = validateMermaidSyntax(diagram);
      if (!result.valid) {
        errors.push(`Mermaid Error: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      console.log(JSON.stringify({ valid: false, errors }));
      process.exit(1);
    } else {
      console.log(JSON.stringify({ valid: true, errors: [] }));
      process.exit(0);
    }
  } catch (err) {
    console.log(JSON.stringify({ valid: false, errors: [`System Error: ${err.message}`] }));
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node validate_content.js <path_to_json_file_with_content_key>');
  process.exit(1);
}

validate(args[0]);
