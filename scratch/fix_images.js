const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');

// 1x1 pixel transparent PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(pngBase64, 'base64');

function fixDummyImages() {
  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist');
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  console.log(`Checking ${files.length} files in uploads...`);

  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    
    // If the file size is very small (like our 27-byte dummy), overwrite it with a valid PNG
    if (stats.size === 27) {
      fs.writeFileSync(filePath, pngBuffer);
      console.log(`✅ Fixed dummy image: ${file}`);
    }
  });
}

fixDummyImages();
