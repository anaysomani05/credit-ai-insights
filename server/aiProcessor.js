const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { Document } = require('langchain/document');

// Clean text by removing noise
const cleanText = (text) => {
  return text
    .replace(/Page\\s+\\d+\\s+of\\s+\\d+/gi, '')
    .replace(/^\\s*[A-Z\\s]+\\s*$/gm, '')
    .replace(/\\s+/g, ' ')
    .replace(/\\n+/g, '\\n')
    .trim();
};

// Split text into semantic chunks
const splitTextIntoSemanticChunks = async (text) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 150,
  });
  const chunks = await splitter.splitText(text);
  return chunks.map((chunk, index) => new Document({
    pageContent: chunk,
    metadata: { id: `chunk_${index}` }
  }));
};

// Create vector store from chunks
const createVectorStore = async (documents, apiKey) => {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: apiKey,
    batchSize: 50,
  });
  const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
  return vectorStore;
};

// Query relevant chunks for each section
const queryRelevantChunks = async (vectorStore, query, limit = 4) => {
  const results = await vectorStore.similaritySearch(query, limit);
  return results.map(doc => doc.pageContent);
};

// Generate section-specific content
const generateSectionContent = async (relevantChunks, sectionType, companyName, apiKey) => {
    const sectionPrompts = {
    overview: `You are an expert financial analyst. Your task is to provide a concise overview of ${companyName}'s business model and market position.
- Focus on the company's core operations, strategy, and competitive advantages.
- Each key point MUST be presented as a separate bullet point (•). THIS IS A STRICT REQUIREMENT.
- Crucially, you must EXCLUDE the following:
  - Specific financial numbers or performance metrics (e.g., revenue, EBITDA, profit).
  - Any third-party opinions, "buy/sell" ratings, or price targets.
- Format as plain text with bullet points using • symbol. Do NOT use markdown formatting.`,
    financialHighlights: `You are an expert financial analyst for the company ${companyName}.
- Your task is to extract and summarize key financial metrics from the provided text.
- Each key metric MUST be presented as a separate bullet point (•). THIS IS A STRICT REQUIREMENT.
- For each metric, write a full sentence describing the trend, for example, "Revenue increased from X to Y, representing a Z% growth."
- Do NOT combine multiple facts into one line. Each bullet point should describe one key metric.
- Focus on the most important metrics like revenue, profit, EBITDA, and key operational metrics.
- Present ONLY the key financial data points, each on its own line with a bullet point.

Correct formatting example:
• Revenue increased from INR 24,982 million in FY24 to INR 30,351 million in FY25, representing a 21.5% year-over-year growth.
• EBITDA improved from INR 6,372 million in FY24 to INR 7,959 million in FY25, showing a 24.9% increase and enhanced operational efficiency.
• Profit after tax grew from INR 3,100 million in FY24 to INR 3,861 million in FY25, marking a 24.6% increase.`,
    keyRisks: `You are a risk analysis specialist. From the provided text, identify and summarize the key business, financial, and strategic risks for ${companyName}.
- If a "Risk Factors" or "Risk Management" section exists in the text, prioritize information from there.
- Group the risks into logical categories if possible (e.g., Market Risks, Operational Risks).
- For each risk, provide a concise, one-sentence summary of the a potential negative impact.
- Exclude any information about risk mitigation strategies or management's plans to address the risks.
- Format as plain text with bullet points using • symbol. Do NOT use markdown formatting.`,
    managementCommentary: `You are an executive summary writer. Based on the provided text, summarize the forward-looking commentary and strategic priorities of ${companyName}'s management.
- Focus on direct statements regarding future plans, growth initiatives, investment strategies, and outlook.
- Each key point MUST be presented as a separate bullet point (•). THIS IS A STRICT REQUIREMENT.
- Source this information from sections like "Chairman's Letter" or "Management Discussion & Analysis".
- Crucially, you must EXCLUDE the following:
  - Any financial results or past performance metrics.
  - Any information already identified as a Key Risk.
  - Any third-party opinions, "buy/sell" ratings, or price targets.
- Format as plain text with bullet points using • symbol. Do NOT use markdown formatting.`
  };

  const prompt = `${sectionPrompts[sectionType]}

Relevant Information:
${relevantChunks.join('\\n\\n')}

CRITICAL FORMATTING REQUIREMENTS:
- Use bullet points (•) for lists where specified in the section prompt.
- Each bullet point MUST be on its own separate line.
- Do NOT use markdown formatting (like ** for bold, # for headers, etc.).
- Use plain text only with proper line breaks.`;

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
          content: "You are a helpful AI assistant tasked with analyzing financial reports. Follow the user's instructions carefully, especially the formatting requirements. Never use markdown formatting - use only plain text with bullet points and line breaks."
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices[0]?.message?.content || 'Analysis not available';

  // Post-processing fix for all sections to guarantee correct formatting
  if (content) {
    // Only replace '-' bullet points with '•' for consistency, preserve everything else
    content = content.replace(/^\s*-\s*/gm, '• ');
    // Ensure bullet points are on separate lines
    content = content.replace(/•\s*/g, '\n• ').trim();
  }

  return content;
};

// Main function to generate report sections
const generateReportSections = async (extractedText, companyName, apiKey) => {
  try {
    const cleanedText = cleanText(extractedText);
    const documents = await splitTextIntoSemanticChunks(cleanedText);
    const vectorStore = await createVectorStore(documents, apiKey);

    const sectionQueries = {
      overview: `company business model overview market position ${companyName}`,
      financialHighlights: `financial metrics revenue profit margin ${companyName}`,
      keyRisks: `risk factors operational financial market ${companyName}`,
      managementCommentary: `management discussion outlook strategy ${companyName}`
    };

    const sectionTypes = ['overview', 'financialHighlights', 'keyRisks', 'managementCommentary'];
    
    const sectionPromises = sectionTypes.map(async (sectionType) => {
      const relevantChunks = await queryRelevantChunks(vectorStore, sectionQueries[sectionType]);
      const content = await generateSectionContent(relevantChunks, sectionType, companyName, apiKey);
      return { sectionType, content };
    });

    const sectionResults = await Promise.all(sectionPromises);

    const sections = sectionResults.reduce((acc, { sectionType, content }) => {
      acc[sectionType] = content;
      return acc;
    }, {});

    return { sections, vectorStore };
  } catch (error) {
    console.error('Error in report generation:', error);
    throw error;
  }
};

const answerQuestion = async (vectorStore, question, companyName, apiKey) => {
  try {
    const relevantChunks = await queryRelevantChunks(vectorStore, question, 3);

    const answerPrompt = `You are a financial analyst answering a question about ${companyName}. 

    Question: ${question}
    
    Relevant Information from the Report:
    ${relevantChunks.join('\\n\\n')}
    
    Provide a clear, concise answer (2-3 sentences maximum) based only on the information available. Be specific with numbers when available.`;

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
            content: 'You are a professional financial analyst. Provide accurate, concise answers.'
          },
          {
            role: 'user',
            content: answerPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I could not generate an answer based on the available information.';
  } catch (error) {
    console.error('Error answering question:', error);
    throw error;
  }
};

module.exports = { generateReportSections, answerQuestion }; 