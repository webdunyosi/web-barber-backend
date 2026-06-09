const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Key to test:', apiKey);
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found in env variables.');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Hi');
    console.log('Success! Response:', result.response.text());
  } catch (error) {
    console.error('Error during generation:', error);
  }
}

testKey();
