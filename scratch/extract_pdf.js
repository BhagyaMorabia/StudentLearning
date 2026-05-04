const fs = require('fs');
const pdf = require('pdf-parse/lib/pdf-parse.js');

async function extract() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("No file path provided");
    process.exit(1);
  }
  
  const dataBuffer = fs.readFileSync(filePath);
  
  try {
    const data = await pdf(dataBuffer);
    fs.writeFileSync('scratch/gravitation_text.txt', data.text);
    console.log("Success! Text written to scratch/gravitation_text.txt");
  } catch (error) {
    console.error("Error reading PDF:", error);
  }
}

extract();
