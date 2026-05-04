import sys
import fitz
import os

def extract_images(pdf_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        pix.save(os.path.join(output_dir, f"page_{page_num}.png"))
    print(f"Extracted {len(doc)} pages as images to {output_dir}")

if __name__ == "__main__":
    extract_images(r"C:\Users\prsco\Downloads\HEIGHTS AND DISTANCES.pdf", "pdf_images")
