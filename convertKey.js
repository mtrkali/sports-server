
const fs = require('fs');

// Read and parse the JSON first to ensure it's valid
const key = fs.readFileSync('./firebase-admin-key.json', 'utf8');

// Validate it's actually JSON
try {
  JSON.parse(key); // This will throw if invalid JSON
} catch (error) {
  throw new Error('File does not contain valid JSON: ' + error.message);
}

// Convert to Base64
const base64 = Buffer.from(key).toString('base64');
console.log('Base64 string:');
console.log(base64);