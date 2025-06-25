// Simple script to create basic icons
const fs = require('fs');
const path = require('path');

function createIcon(size, filename) {
  const canvas = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2196F3" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.6}" 
        fill="white" text-anchor="middle" dominant-baseline="central" font-weight="bold">K</text>
</svg>`;
  
  fs.writeFileSync(path.join(__dirname, filename), canvas);
}

// Create different sized icons
createIcon(16, 'icon16.svg');
createIcon(48, 'icon48.svg');  
createIcon(128, 'icon128.svg');

console.log('SVG icons created. You can convert them to PNG if needed.');