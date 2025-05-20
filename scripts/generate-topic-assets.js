#!/usr/bin/env node
/**
 * Topic Assets Generator
 * 
 * This script generates all required assets for a specific topic
 * based on a source app-icon-{topic}.png file.
 * 
 * Usage:
 *   node generate-topic-assets.js [topic]
 * 
 * Example:
 *   node generate-topic-assets.js music
 *   
 * Requirements:
 *   - Sharp image processing library (npm install sharp)
 *   - Source app-icon-{topic}.png in assets/images directory
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Default background color for transparent areas (dark theme color)
const BG_COLOR = { r: 21, g: 23, b: 24, alpha: 1 };

// Define the asset configurations to generate
const ASSETS_CONFIG = [
  {
    name: 'favicon',
    sizes: [
      { size: 32, suffix: '' },         // Main favicon
      { size: 16, suffix: '-16x16' },   // Small favicon
      { size: 32, suffix: '-32x32' },   // Medium favicon
    ],
    outputDir: '../public',
    fit: 'cover',
  },
  {
    name: 'apple-touch-icon',
    sizes: [
      { size: 180, suffix: '' },       // iOS touch icon
    ],
    outputDir: '../public',
    fit: 'cover',
  },
  {
    name: 'splash-icon',
    sizes: [
      { size: 1024, suffix: '' },      // Splash screen
    ],
    outputDir: '../assets/images',
    fit: 'contain',
    background: BG_COLOR,
  },
  {
    name: 'adaptive-icon',
    sizes: [
      { size: 1024, suffix: '' },      // Android adaptive icon
    ],
    outputDir: '../assets/images',
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
];

/**
 * Main function to generate assets for a topic
 */
async function generateTopicAssets(topic) {
  console.log(`\n🎨 Generating assets for topic: ${topic}`);
  
  // Ensure topic is provided
  if (!topic) {
    console.error('❌ No topic specified. Please provide a topic name.');
    console.error('   Usage: node generate-topic-assets.js [topic]');
    process.exit(1);
  }
  
  // Source icon path
  const sourceIcon = path.resolve(__dirname, `../assets/images/app-icon-${topic}.png`);
  
  // Check if source icon exists
  if (!fs.existsSync(sourceIcon)) {
    console.error(`❌ Source icon not found: ${sourceIcon}`);
    console.error(`   Please create an app-icon-${topic}.png file in assets/images directory`);
    process.exit(1);
  }
  
  console.log(`📂 Source icon: ${sourceIcon}`);
  
  // Process each asset configuration
  for (const assetConfig of ASSETS_CONFIG) {
    console.log(`\n📝 Processing ${assetConfig.name} assets...`);
    
    // Ensure output directory exists
    const outputDir = path.resolve(__dirname, assetConfig.outputDir);
    ensureDirectoryExists(outputDir);
    
    // Generate each size variant
    for (const sizeConfig of assetConfig.sizes) {
      const size = sizeConfig.size;
      const suffix = sizeConfig.suffix;
      
      // Determine output filename
      let outputFileName;
      if (assetConfig.name === 'splash-icon' || assetConfig.name === 'adaptive-icon') {
        // These files go in assets/images with the topic in the filename
        outputFileName = `${assetConfig.name}-${topic}${suffix}.png`;
      } else {
        // Favicon and touch icons go in public with topic in filename
        outputFileName = `${assetConfig.name}-${topic}${suffix}.png`;
      }
      
      const outputPath = path.join(outputDir, outputFileName);
      
      // Configure image processing
      let processor = sharp(sourceIcon)
        .resize(size, size, { 
          fit: assetConfig.fit || 'cover', 
          background: assetConfig.background || { r: 0, g: 0, b: 0, alpha: 0 } 
        });
      
      // Save the resized image
      await processor.toFile(outputPath);
      
      console.log(`   ✅ Generated ${outputFileName} (${size}x${size}px)`);
    }
  }
  
  // Create a special copy for the direct app icon reference
  // This keeps the original source image intact for future generation
  const targetAppIcon = path.resolve(__dirname, `../assets/images/app-icon-${topic}-processed.png`);
  await fs.promises.copyFile(sourceIcon, targetAppIcon);
  console.log(`\n✅ Created processed app icon: app-icon-${topic}-processed.png`);
  
  console.log(`\n🎉 Successfully generated all assets for topic: ${topic}`);
}

/**
 * Ensures a directory exists, creating it if necessary
 */
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`   📁 Created directory: ${directory}`);
  }
}

/**
 * Display usage instructions
 */
function showUsage() {
  console.log(`
Topic Assets Generator
======================

This script generates all required assets for a specific topic based on 
a source app-icon-{topic}.png file.

Usage:
  node generate-topic-assets.js [topic]

Example:
  node generate-topic-assets.js music

Requirements:
  - Sharp image processing library (npm install sharp)
  - Source app-icon-{topic}.png in assets/images directory
  `);
}

// Execute if run directly
if (require.main === module) {
  const topic = process.argv[2];
  
  if (topic === '--help' || topic === '-h') {
    showUsage();
  } else if (!topic) {
    console.error('❌ No topic specified. Please provide a topic name.');
    console.error('   Usage: node generate-topic-assets.js [topic]');
    console.error('   For more information: node generate-topic-assets.js --help');
    process.exit(1);
  } else {
    generateTopicAssets(topic).catch(err => {
      console.error('❌ Error generating assets:', err);
      process.exit(1);
    });
  }
}

module.exports = { generateTopicAssets }; 