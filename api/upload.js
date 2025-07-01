const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for memory storage (Vercel functions are stateless)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export default function handler(req, res) {
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

  upload.single('report')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: 'File upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // For Vercel, we'll use the buffer directly instead of saving to disk
    const filename = `${Date.now()}-${req.file.originalname}`;
    
    res.status(200).json({
      message: 'File uploaded successfully',
      filename: filename,
      fileBuffer: req.file.buffer.toString('base64'), // Convert to base64 for transfer
      mimetype: req.file.mimetype
    });
  });
} 