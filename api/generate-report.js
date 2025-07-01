const { extractTextFromPDF } = require('../backend/pdfProcessor');
const { generateReportSections } = require('../backend/aiProcessor');

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

  console.log('=== FINANCIAL DOCUMENT ANALYSIS STARTED ===');
  
  const { filename, companyName, fileBuffer } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!filename || !companyName || !apiKey || !fileBuffer) {
    console.error('Missing required parameters');
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Convert base64 back to buffer
    const pdfBuffer = Buffer.from(fileBuffer, 'base64');
    
    // 1. Extract text from PDF buffer
    console.log('Step 1: Starting PDF text extraction...');
    const extractedText = await extractTextFromPDF(pdfBuffer);
    console.log('Text extraction completed. Length:', extractedText ? extractedText.length : 0);
    
    if (!extractedText) {
      throw new Error('Text extraction returned empty.');
    }

    // 2. Generate report sections using AI
    console.log('Step 2: Starting LLM-powered financial analysis...');
    const { sections, vectorStore } = await generateReportSections(extractedText, companyName, apiKey);
    console.log('Financial analysis completed. Sections:', Object.keys(sections));

    // Cache the vector store for Q&A (note: this is temporary in serverless)
    vectorStoreCache.set(filename, vectorStore);
    console.log(`Vector store for ${filename} cached for Q&A.`);

    // 3. Send report back to client
    console.log('Step 3: Sending financial analysis to client...');
    res.status(200).json(sections);
    console.log('=== FINANCIAL DOCUMENT ANALYSIS COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('=== ERROR DURING FINANCIAL ANALYSIS ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: `Failed to generate financial analysis: ${error.message}` });
  }
} 