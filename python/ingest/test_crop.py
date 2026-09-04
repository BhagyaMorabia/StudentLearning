import fitz
import sys
from pathlib import Path

def test_crop(pdf_path, page_num, bounding_box):
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    
    # Extract Gemini 0-1000 coordinates
    ymin, xmin, ymax, xmax = bounding_box
    
    # Translate to actual page dimensions
    x0 = (xmin / 1000) * page.rect.width
    y0 = (ymin / 1000) * page.rect.height
    x1 = (xmax / 1000) * page.rect.width
    y1 = (ymax / 1000) * page.rect.height
    
    # Calculate 5% padding
    width = x1 - x0
    height = y1 - y0
    pad_x = width * 0.05
    pad_y = height * 0.05
    
    # Apply padded rect, clamping to page boundaries
    crop_rect = fitz.Rect(
        max(0, x0 - pad_x),
        max(0, y0 - pad_y),
        min(page.rect.width, x1 + pad_x),
        min(page.rect.height, y1 + pad_y)
    )
    
    # Save image
    pix = page.get_pixmap(clip=crop_rect, dpi=300)
    out_path = Path(f"crop_test_p{page_num}.png")
    pix.save(str(out_path))
    print(f"Saved cropped image to {out_path.absolute()}")

if __name__ == "__main__":
    pdf_path = Path("python/data/PYQ Questions/43_Years_Chapterwise_Topicwise_Solved_Papers_2021_1979_IIT_JEE_Physics.pdf")
    if not pdf_path.exists():
        print("PDF not found!")
        sys.exit(1)
        
    test_crop(pdf_path, 20, [100, 100, 400, 400])
