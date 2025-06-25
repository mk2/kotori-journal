const sharp = require('sharp')
const path = require('path')

const createIconsFromSource = async () => {
  const sourcePath = path.join(__dirname, '../docs/images/icon.png')
  const sizes = [16, 48, 128]
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, `icon${size}.png`)
    
    await sharp(sourcePath)
      .resize(size, size)
      .png()
      .toFile(outputPath)
    
    console.log(`Created ${outputPath}`)
  }
  
  console.log('PNG icons created successfully!')
}

createIconsFromSource().catch(console.error)