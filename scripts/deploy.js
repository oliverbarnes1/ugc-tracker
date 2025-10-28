#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 UGC Tracker Deployment Helper\n');

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'pipe' });
  console.log('✅ Vercel CLI is installed');
} catch (error) {
  console.log('❌ Vercel CLI not found. Installing...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    console.log('✅ Vercel CLI installed successfully');
  } catch (installError) {
    console.log('❌ Failed to install Vercel CLI. Please install manually:');
    console.log('   npm install -g vercel');
    process.exit(1);
  }
}

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
} else {
  console.log('❌ .env file not found. Please create one with your API keys.');
  process.exit(1);
}

console.log('\n📋 Next steps:');
console.log('1. Run: vercel login');
console.log('2. Run: vercel --prod');
console.log('3. Set environment variables in Vercel dashboard');
console.log('4. Test your deployment!');
