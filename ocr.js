const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function processImages() {
  const dir = path.join(__dirname, 'pdf_images');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

  console.log(`Found ${files.length} images. Starting OCR...`);
  
  let fullText = '';
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing ${file} (${i+1}/${files.length})...`);
    
    try {
      const { data: { text } } = await Tesseract.recognize(
        path.join(dir, file),
        'eng'
      );
      fullText += `\n\n--- PAGE ${i} ---\n\n` + text;
    } catch (e) {
      console.error(`Error on ${file}: ${e}`);
    }
  }

  fs.writeFileSync('ocr_output.txt', fullText);
  console.log('OCR completed! Wrote to ocr_output.txt');
}

processImages();
