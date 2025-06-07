import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';

export interface ReportSections {
  overview: string;
  financialHighlights: string;
  keyRisks: string;
  managementCommentary: string;
}

// Cache keys for embeddings and processed results
const CACHE_PREFIX = 'creditai_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Cache utilities
const getCacheKey = (file: File): string => {
  return `${CACHE_PREFIX}${file.name}_${file.lastModified}_${file.size}`;
};

const getFromCache = (key: string): any | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const setCache = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Cache storage failed:', error);
  }
};

// Clean text by removing noise (optimized)
const cleanText = (text: string): string => {
  return text
    .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
    .replace(/^\s*[A-Z\s]+\s*$/gm, '')
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
};

// Split text into semantic chunks (optimized with better separators)
const splitTextIntoSemanticChunks = async (text: string): Promise<Document[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200, // Slightly larger chunks for better context
    chunkOverlap: 150, // Reduced overlap for faster processing
    separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ': ', ' ', ''],
  });

  const chunks = await splitter.splitText(text);
  return chunks.map((chunk, index) => new Document({
    pageContent: chunk,
    metadata: { id: `chunk_${index}`, length: chunk.length }
  }));
};

// Create vector store from chunks with batch processing
const createVectorStore = async (
  documents: Document[],
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<MemoryVectorStore> => {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: apiKey,
    batchSize: 50, // Process embeddings in batches
    stripNewLines: true,
    maxRetries: 3,
    timeout: 30000,
  });

  // Process embeddings in smaller batches to avoid rate limits
  const batchSize = 25;
  const totalBatches = Math.ceil(documents.length / batchSize);
  let processedDocs: Document[] = [];

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, documents.length);
    const batch = documents.slice(start, end);
    
    try {
      // Add small delay between batches to respect rate limits
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      processedDocs.push(...batch);
      onProgress?.(0.3 + (i / totalBatches) * 0.3); // 30-60% of total progress
    } catch (error) {
      console.warn(`Batch ${i + 1} failed, retrying...`, error);
      // Retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      processedDocs.push(...batch);
    }
  }

  const vectorStore = await MemoryVectorStore.fromDocuments(
    processedDocs,
    embeddings
  );

  return vectorStore;
};

// Query relevant chunks for each section (optimized)
const queryRelevantChunks = async (
  vectorStore: MemoryVectorStore,
  query: string,
  limit: number = 4 // Reduced from 5 for faster processing
): Promise<string[]> => {
  const results = await vectorStore.similaritySearch(query, limit);
  return results.map(doc => doc.pageContent);
};

// Generate section-specific content with timeout and retry logic
const generateSectionContent = async (
  relevantChunks: string[],
  sectionType: keyof Omit<ReportSections, 'financialMetrics'>,
  companyName: string,
  apiKey: string,
  retryCount: number = 0
): Promise<string> => {
  const sectionPrompts = {
    overview: `Provide 2-3 key highlights about ${companyName}'s business model and market position. Keep it concise and focus only on the most important points.`,
    financialHighlights: `Extract 3-4 key financial highlights for ${companyName}. Present as brief bullet points with specific numbers. Focus on the most significant metrics only.`,
    keyRisks: `Identify 3-4 primary risk factors for ${companyName}. Present as brief bullet points. Focus on the most critical risks only.`,
    managementCommentary: `Summarize 2-3 key management insights for ${companyName}. Keep it brief and focus on strategic highlights only.`
  };

  const prompt = `${sectionPrompts[sectionType]}

Relevant Information:
${relevantChunks.join('\n\n')}

CRITICAL FORMATTING REQUIREMENTS:
- Maximum 3-4 bullet points per section
- Each point should be 1-2 sentences maximum  
- Focus on KEY HIGHLIGHTS only
- ALWAYS put each bullet point (•) on its own separate line
- Do NOT combine multiple bullet points in the same paragraph
- Be concise and specific
- Include numbers where relevant

EXAMPLE OF CORRECT FORMAT:
The company is expanding operations with strong fundamentals.

• Revenue grew by 15% to ₹2,500 crores in FY24 with improved margins.
• Added 500 new beds across 2 hospitals in Q4FY25.
• EBITDA margins improved to 18% from 16% in previous year.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst. Format bullet points correctly - each bullet point MUST be on its own separate line. Never combine multiple bullet points in one paragraph.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 250, // Reduced for faster response
        temperature: 0.1, // Lower temperature for faster, more deterministic responses
        presence_penalty: 0.6,
        frequency_penalty: 0.6,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429 && retryCount < 3) {
        // Rate limit hit, wait and retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 2000));
        return generateSectionContent(relevantChunks, sectionType, companyName, apiKey, retryCount + 1);
      }
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || 'Analysis not available';
    
    // Post-process to ensure proper bullet point formatting
    content = formatBulletPoints(content);
    
    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    if (retryCount < 2) {
      console.warn(`Retry ${retryCount + 1} for section ${sectionType}:`, error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateSectionContent(relevantChunks, sectionType, companyName, apiKey, retryCount + 1);
    }
    
    console.error('Error generating section content:', error);
    throw error;
  }
};

// Helper function to format bullet points properly (optimized)
const formatBulletPoints = (text: string): string => {
  const lines = text.split('\n');
  const formattedLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.includes('•') && !trimmed.startsWith('•')) {
      const parts = trimmed.split('•');
      if (parts[0].trim()) {
        formattedLines.push(parts[0].trim());
      }
      for (let j = 1; j < parts.length; j++) {
        if (parts[j].trim()) {
          formattedLines.push('• ' + parts[j].trim());
        }
      }
    } else if (trimmed.length > 0) {
      formattedLines.push(trimmed);
    }
  }
  
  return formattedLines
    .join('\n')
    .replace(/([^\n•])\n(•)/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Main function to generate report sections with parallel processing and caching
export const generateEnhancedReportSections = async (
  extractedText: string,
  companyName: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
  file?: File
): Promise<ReportSections> => {
  try {
    // Check cache first
    const cacheKey = file ? getCacheKey(file) : null;
    if (cacheKey) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        console.log('Using cached report sections');
        onProgress?.(1.0);
        return cached;
      }
    }

    // Step 1: Clean the text
    onProgress?.(0.05);
    const cleanedText = cleanText(extractedText);

    // Step 2: Split into semantic chunks
    onProgress?.(0.1);
    const documents = await splitTextIntoSemanticChunks(cleanedText);
    console.log(`Created ${documents.length} chunks from ${cleanedText.length} characters`);

    // Step 3: Create vector store with batch processing
    onProgress?.(0.15);
    const vectorStore = await createVectorStore(documents, apiKey, onProgress);

    // Step 4: Define specific queries for each section type
    const sectionQueries = {
      overview: `company business model overview market position core strengths competitive advantages operations ${companyName}`,
      financialHighlights: `financial metrics revenue profit margin EBITDA ROE debt equity ratio growth performance numbers ${companyName}`,
      keyRisks: `risk factors operational financial market regulatory credit risk challenges threats concerns ${companyName}`,
      managementCommentary: `management discussion outlook strategy future plans capital allocation market assessment leadership ${companyName}`
    };

    // Step 5: Generate all sections in parallel (MAJOR OPTIMIZATION)
    onProgress?.(0.65);
    
    const sectionTypes: (keyof ReportSections)[] = [
      'overview',
      'financialHighlights', 
      'keyRisks',
      'managementCommentary'
    ];

    // Prepare all section generation promises
    const sectionPromises = sectionTypes.map(async (sectionType) => {
      const relevantChunks = await queryRelevantChunks(
        vectorStore,
        sectionQueries[sectionType]
      );
      
      const content = await generateSectionContent(
        relevantChunks,
        sectionType,
        companyName,
        apiKey
      );
      
      return { sectionType, content };
    });

    // Execute all sections in parallel
    const sectionResults = await Promise.all(sectionPromises);
    
    // Construct the final report
    const sections: ReportSections = {
      overview: '',
      financialHighlights: '',
      keyRisks: '',
      managementCommentary: '',
    };

    for (const { sectionType, content } of sectionResults) {
      sections[sectionType] = content;
    }

    onProgress?.(0.95);

    // Cache the results
    if (cacheKey) {
      setCache(cacheKey, sections);
    }

    onProgress?.(1.0);
    return sections;

  } catch (error) {
    console.error('Error in enhanced report generation:', error);
    throw error;
  }
};

// Question answering function using vector store with caching and optimization
export const answerQuestionFromReport = async (
  question: string,
  extractedText: string,
  companyName: string,
  apiKey: string
): Promise<string> => {
  try {
    // Create cache key for Q&A context
    const contextCacheKey = `${CACHE_PREFIX}qa_context_${companyName}_${extractedText.slice(0, 100).replace(/\W/g, '')}`;
    
    let vectorStore = getFromCache(contextCacheKey);
    
    if (!vectorStore) {
      // Clean and process the text
      const cleanedText = cleanText(extractedText);
      const documents = await splitTextIntoSemanticChunks(cleanedText);
      vectorStore = await createVectorStore(documents, apiKey);
      setCache(contextCacheKey, vectorStore);
    }

    // Find relevant chunks for the question
    const relevantChunks = await queryRelevantChunks(vectorStore, question, 3);

    // Generate answer with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const answerPrompt = `You are a financial analyst answering questions about ${companyName}'s credit report. 

Question: ${question}

Relevant Information from the Report:
${relevantChunks.join('\n\n')}

Provide a clear, concise answer (2-3 sentences maximum) based only on the information available. Use bullet points only if listing multiple items. Be specific with numbers when available. Do NOT use markdown formatting - use plain text with proper formatting.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial analyst. Provide accurate, concise answers in plain text format. No markdown. Be direct and specific.'
          },
          {
            role: 'user',
            content: answerPrompt
          }
        ],
        max_tokens: 150, // Reduced for faster response
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'I could not generate an answer based on the available information.';

    return answer;

  } catch (error) {
    if (error.name === 'AbortError') {
      return 'The request timed out. Please try asking a simpler question.';
    }
    
    console.error('Error answering question:', error);
    throw error;
  }
}; 