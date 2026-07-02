const katex = require('katex');
global.DOMPurify = { addHook: () => {}, sanitize: (x) => x };
const mermaid = require('mermaid').default;
const fs = require('fs');

async function validate(jsonPath) {
    try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(data);
        const content = parsed.content;
        
        const errors = [];
        
        // 1. Validate LaTeX
        const latexRegex = /\$\$([\s\S]*?)\$\$|\$([^\$]+)\$/g;
        let match;
        while ((match = latexRegex.exec(content)) !== null) {
            const formula = match[1] || match[2];
            try {
                katex.renderToString(formula);
            } catch (e) {
                errors.push(`KaTeX Error in formula '${formula}': ${e.message}`);
            }
        }
        
        // 2. Validate Mermaid
        const mermaidRegex = /```mermaid([\s\S]*?)```/g;
        while ((match = mermaidRegex.exec(content)) !== null) {
            const diagram = match[1].trim();
            if (!diagram) continue;
            try {
                await mermaid.parse(diagram);
            } catch (e) {
                errors.push(`Mermaid Error in diagram: ${e.message}`);
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
    console.error("Usage: node validate_content.js <path_to_json_file_with_content_key>");
    process.exit(1);
}

validate(args[0]);
