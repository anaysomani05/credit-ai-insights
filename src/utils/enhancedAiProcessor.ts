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

// Clean text by removing noise
const cleanText = (text: string): string => {
  return text
    // Remove page numbers (e.g., "Page 1 of 100")
    .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
    // Remove headers/footers (common patterns)
    .replace(/^\s*[A-Z\s]+\s*$/gm, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove multiple newlines
    .replace(/\n+/g, '\n')
    // Trim whitespace
    .trim();
};

// Split text into semantic chunks
const splitTextIntoSemanticChunks = async (text: string): Promise<Document[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '.', '!', '?', ';', ':', ' ', ''],
  });

  const chunks = await splitter.splitText(text);
  return chunks.map((chunk, index) => new Document({
    pageContent: chunk,
    metadata: { id: `chunk_${index}` }
  }));
};

// Create vector store from chunks
const createVectorStore = async (
  documents: Document[],
  apiKey: string
): Promise<MemoryVectorStore> => {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: apiKey,
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(
    documents,
    embeddings
  );

  return vectorStore;
};

// Query relevant chunks for each section
const queryRelevantChunks = async (
  vectorStore: MemoryVectorStore,
  query: string,
  limit: number = 5
): Promise<string[]> => {
  const results = await vectorStore.similaritySearch(query, limit);
  return results.map(doc => doc.pageContent);
};

// Generate section-specific content (updated for concise highlights)
const generateSectionContent = async (
  relevantChunks: string[],
  sectionType: keyof Omit<ReportSections, 'financialMetrics'>,
  companyName: string,
  apiKey: string
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
• EBITDA margins improved to 18% from 16% in previous year.

WRONG FORMAT (DO NOT DO THIS):
The company is expanding. • Revenue grew 15%. • Added 500 beds. • EBITDA improved.`;

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
        max_tokens: 300,
        temperature: 0.2,
        presence_penalty: 0.6,
        frequency_penalty: 0.6,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || 'Analysis not available';
    
    // Post-process to ensure proper bullet point formatting
    content = formatBulletPoints(content);
    
    return content;
  } catch (error) {
    console.error('Error generating section content:', error);
    throw error;
  }
};

// Helper function to format bullet points properly
const formatBulletPoints = (text: string): string => {
  // Split text into lines and process each line
  let lines = text.split('\n');
  let formattedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // If line contains bullet points not at the start, split them
    if (line.includes('•') && !line.startsWith('•')) {
      const parts = line.split('•');
      // Add the first part (before bullet)
      if (parts[0].trim()) {
        formattedLines.push(parts[0].trim());
      }
      // Add each bullet point on a new line
      for (let j = 1; j < parts.length; j++) {
        if (parts[j].trim()) {
          formattedLines.push('• ' + parts[j].trim());
        }
      }
    } else if (line.startsWith('•')) {
      // Already a properly formatted bullet point
      formattedLines.push(line);
    } else if (line.length > 0) {
      // Regular text line
      formattedLines.push(line);
    }
  }
  
  // Join lines and clean up spacing
  let formatted = formattedLines.join('\n');
  
  // Ensure proper spacing around bullet points
  formatted = formatted
    // Add spacing before bullet points if they follow non-bullet text
    .replace(/([^\n•])\n(•)/g, '$1\n\n$2')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return formatted;
};

// Main function to generate report sections (simplified)
export const generateEnhancedReportSections = async (
  extractedText: string,
  companyName: string,
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<ReportSections> => {
  try {
    // Step 1: Clean the text
    onProgress?.(0.1);
    const cleanedText = cleanText(extractedText);

    // Step 2: Split into semantic chunks
    onProgress?.(0.2);
    const documents = await splitTextIntoSemanticChunks(cleanedText);

    // Step 3: Create vector store
    onProgress?.(0.3);
    const vectorStore = await createVectorStore(documents, apiKey);

    // Step 4: Generate each section
    const sections: ReportSections = {
      overview: '',
      financialHighlights: '',
      keyRisks: '',
      managementCommentary: '',
    };

    // Define specific queries for each section type
    const sectionQueries = {
      overview: `company business model overview market position core strengths competitive advantages ${companyName}`,
      financialHighlights: `financial metrics revenue profit margin EBITDA ROE debt equity ratio growth performance ${companyName}`,
      keyRisks: `risk factors operational financial market regulatory credit risk challenges threats ${companyName}`,
      managementCommentary: `management discussion outlook strategy future plans capital allocation market assessment ${companyName}`
    };

    // Generate each section with relevant chunks
    const sectionTypes: (keyof ReportSections)[] = [
      'overview',
      'financialHighlights',
      'keyRisks',
      'managementCommentary'
    ];

    for (let i = 0; i < sectionTypes.length; i++) {
      const sectionType = sectionTypes[i];
      const relevantChunks = await queryRelevantChunks(
        vectorStore,
        sectionQueries[sectionType]
      );
      
      sections[sectionType] = await generateSectionContent(
        relevantChunks,
        sectionType,
        companyName,
        apiKey
      );

      onProgress?.(0.4 + (i + 1) * 0.15);
    }

    return sections;
  } catch (error) {
    console.error('Error in enhanced report generation:', error);
    throw error;
  }
};

// Question answering function using vector store
export const answerQuestionFromReport = async (
  question: string,
  extractedText: string,
  companyName: string,
  apiKey: string
): Promise<string> => {
  try {
    // Clean and process the text
    const cleanedText = cleanText(extractedText);
    const documents = await splitTextIntoSemanticChunks(cleanedText);
    const vectorStore = await createVectorStore(documents, apiKey);

    // Find relevant chunks for the question
    const relevantChunks = await queryRelevantChunks(vectorStore, question, 3);

    // Generate text answer
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
        max_tokens: 200,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'I could not generate an answer based on the available information.';

    return answer;

  } catch (error) {
    console.error('Error answering question:', error);
    throw error;
  }
}; 