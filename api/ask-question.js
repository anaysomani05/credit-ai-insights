const { answerQuestion } = require('../backend/aiProcessor');

// Simple in-memory cache for vector stores (note: this resets on each function invocation)
const vectorStoreCache = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { filename, question, companyName } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!filename || !question || !companyName || !apiKey) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const vectorStore = vectorStoreCache.get(filename);
  if (!vectorStore) {
    return res.status(404).json({ error: 'Analysis context not found. Please generate a report first.' });
  }

  try {
    const answer = await answerQuestion(vectorStore, question, companyName, apiKey);
    res.status(200).json({ answer });
  } catch (error) {
    console.error('Error in Q&A:', error.message);
    res.status(500).json({ error: 'Failed to get an answer.' });
  }
} 