export interface ReportSections {
  overview: string;
  financialHighlights: string;
  keyRisks: string;
  managementCommentary: string;
}

const CHUNK_SIZE = 12000; // Process 12,000 characters at a time

const chunkText = (text: string): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
};

export const generateReportSections = async (
  extractedText: string,
  companyName: string,
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<ReportSections> => {
  const chunks = chunkText(extractedText);
  const totalChunks = chunks.length;
  console.log(`Processing ${totalChunks} chunks of text (${extractedText.length} total characters)`);

  // Initialize sections with first chunk
  const basePrompt = `You are a financial analyst specializing in credit analysis. Analyze the following annual report text for ${companyName} and provide insights in the specified format. Focus on providing unique, non-repetitive insights.

Annual Report Text (Part 1 of ${totalChunks}):
${chunks[0]}...

Please provide a comprehensive analysis in the following sections. Ensure each point is unique and avoid repetition:`;

  let sections = {
    overview: await generateSection(
      `${basePrompt}

COMPANY OVERVIEW:
Provide a concise 3-4 sentence overview of the company's business model, market position, and core strengths. Focus on what makes this company unique in its sector. Avoid general statements and focus on specific, unique aspects.`,
      apiKey
    ),
    
    financialHighlights: await generateSection(
      `${basePrompt}

FINANCIAL HIGHLIGHTS:
Extract and summarize key financial metrics including revenue, profitability, margins, ROE, debt ratios, and growth trends. Present in bullet points with specific numbers where available. Focus on the most significant metrics and avoid repeating similar information.`,
      apiKey
    ),
    
    keyRisks: await generateSection(
      `${basePrompt}

KEY RISKS:
Identify and analyze the main risk factors that could impact the company's creditworthiness. Include operational, financial, market, and regulatory risks. Present as bullet points. Ensure each risk is distinct and avoid overlapping or similar risks.`,
      apiKey
    ),
    
    managementCommentary: await generateSection(
      `${basePrompt}

MANAGEMENT COMMENTARY:
Summarize key insights from management's discussion including strategic initiatives, future outlook, capital allocation plans, and management's assessment of market conditions. Focus on unique insights and avoid repeating information from other sections.`,
      apiKey
    )
  };

  // Update progress after first chunk
  onProgress?.(1 / totalChunks);

  // Process remaining chunks
  for (let i = 1; i < chunks.length; i++) {
    const additionalPrompt = `Additional context from the annual report (Part ${i + 1} of ${totalChunks}):
${chunks[i]}...

Please update your previous analysis with any new relevant information from this section. IMPORTANT: Only include new, unique information that hasn't been covered in previous sections. Avoid repeating any information that was already analyzed.`;
    
    // Update each section with additional information
    sections.overview = await generateSection(
      `${additionalPrompt}\n\nUpdate the company overview with any new, unique information. Do not repeat any points already covered.`,
      apiKey
    );
    
    sections.financialHighlights = await generateSection(
      `${additionalPrompt}\n\nUpdate the financial highlights with any new metrics or information. Only include metrics that haven't been mentioned before.`,
      apiKey
    );
    
    sections.keyRisks = await generateSection(
      `${additionalPrompt}\n\nUpdate the key risks with any new risk factors identified. Ensure each risk is distinct from previously mentioned risks.`,
      apiKey
    );
    
    sections.managementCommentary = await generateSection(
      `${additionalPrompt}\n\nUpdate the management commentary with any new insights. Avoid repeating information from previous sections.`,
      apiKey
    );

    // Update progress
    onProgress?.((i + 1) / totalChunks);
  }

  return sections;
};

const generateSection = async (prompt: string, apiKey: string): Promise<string> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${encodeURIComponent(apiKey)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial analyst with expertise in credit analysis and risk assessment. Provide clear, concise, and actionable insights. Avoid repetition and ensure each point is unique and valuable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
        presence_penalty: 0.6, // Add presence penalty to reduce repetition
        frequency_penalty: 0.6, // Add frequency penalty to reduce repetition
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Analysis not available';
    
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error; // Propagate the error instead of returning fallback content
  }
};