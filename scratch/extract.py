import pymupdf4llm
import sys
import os

pdf_path = sys.argv[1]
output_path = "scratch/gravitation.md"

md_text = pymupdf4llm.to_markdown(pdf_path)

with open(output_path, "w", encoding="utf-8") as f:
    f.write(md_text)

print(f"Extracted to {output_path}")
