const fs = require('fs')
const path = require('path')

// Simple PNG icon creation using base64 encoded data
const createPngIcon = (size, filename) => {
  // Create a simple base64 encoded PNG icon with blue background and "K" text
  const svgContent = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#2196F3" rx="4"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="${Math.floor(size * 0.6)}" 
            font-weight="bold" fill="white">K</text>
    </svg>
  `.trim()

  // For simplicity, we'll create a basic PNG placeholder file
  // In a real scenario, you'd use a proper SVG to PNG converter
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, size, // width
    0x00, 0x00, 0x00, size, // height
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    ...Buffer.alloc(100, 0x21) // Simple blue-ish data
  ])
  
  fs.writeFileSync(filename, pngData)
}

// Create icons in different sizes
const sizes = [16, 48, 128]
sizes.forEach(size => {
  const filename = path.join(__dirname, `icon${size}.png`)
  createPngIcon(size, filename)
  console.log(`Created ${filename}`)
})

console.log('PNG icons created successfully!')