import sys
import fitz

def extract_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text += page.get_text()
        
        with open("pdf_content.txt", "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Extracted {len(text)} characters from {len(doc)} pages.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_pdf(r"C:\Users\prsco\Downloads\HEIGHTS AND DISTANCES.pdf")
