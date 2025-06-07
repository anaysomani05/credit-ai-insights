import * as pdfjsLib from 'pdfjs-dist';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Cache for processed PDFs
const PDF_CACHE_PREFIX = 'creditai_pdf_cache_';
const PDF_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const getPdfCacheKey = (file: File): string => {
  return `${PDF_CACHE_PREFIX}${file.name}_${file.lastModified}_${file.size}`;
};

const getPdfFromCache = (key: string): string | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > PDF_CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const setPdfCache = (key: string, data: string): void => {
  try {
    // Only cache if data is reasonable size (< 5MB in localStorage)
    if (data.length < 5 * 1024 * 1024) {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }
  } catch (error) {
    console.warn('PDF cache storage failed:', error);
  }
};

// Optimized PDF text extraction with chunked processing and progress tracking
export const extractPDFText = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Check cache first
  const cacheKey = getPdfCacheKey(file);
  const cached = getPdfFromCache(cacheKey);
  if (cached) {
    console.log('Using cached PDF text extraction');
    onProgress?.(1.0);
    return cached;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    // Optimize PDF.js settings for performance
    useSystemFonts: true,
    disableFontFace: true,
    cMapPacked: true,
  }).promise;

  const totalPages = pdf.numPages;
  console.log(`Processing PDF with ${totalPages} pages`);
  
  let extractedText = '';
  const CHUNK_SIZE = 10; // Process 10 pages at a time to avoid memory issues
  
  // Process pages in chunks
  for (let startPage = 1; startPage <= totalPages; startPage += CHUNK_SIZE) {
    const endPage = Math.min(startPage + CHUNK_SIZE - 1, totalPages);
    
    // Process chunk of pages in parallel
    const chunkPromises = [];
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      chunkPromises.push(
        pdf.getPage(pageNum).then(async (page) => {
          try {
            const content = await page.getTextContent({
              includeMarkedContent: false, // Skip marked content for faster processing
            });
            
            // Clean up the page after processing to free memory
            page.cleanup();
            
            return {
              pageNum,
              text: content.items
                .map((item: any) => item.str)
                .join(' ')
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim()
            };
          } catch (error) {
            console.warn(`Error processing page ${pageNum}:`, error);
            return { pageNum, text: '' };
          }
        })
      );
    }
    
    // Wait for chunk to complete
    const chunkResults = await Promise.all(chunkPromises);
    
    // Sort by page number and combine text
    chunkResults
      .sort((a, b) => a.pageNum - b.pageNum)
      .forEach(({ text }) => {
        if (text.trim()) {
          extractedText += text + '\n';
        }
      });
    
    // Update progress
    const progress = endPage / totalPages;
    onProgress?.(progress * 0.9); // Reserve 10% for post-processing
    
    // Small delay to prevent browser freeze on large documents
    if (endPage < totalPages) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Post-process the text
  const cleanedText = extractedText
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .replace(/(.)\n([a-z])/g, '$1 $2') // Join broken sentences
    .trim();

  onProgress?.(1.0);

  // Cache the result
  setPdfCache(cacheKey, cleanedText);

  console.log(`Extracted ${cleanedText.length} characters from ${totalPages} pages`);
  return cleanedText;
};

// Enhanced function for batch PDF processing (for future use)
export const extractMultiplePDFTexts = async (
  files: File[],
  onProgress?: (fileIndex: number, fileProgress: number, fileName: string) => void
): Promise<{ fileName: string; text: string; error?: string }[]> => {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const text = await extractPDFText(file, (progress) => {
        onProgress?.(i, progress, file.name);
      });
      results.push({ fileName: file.name, text });
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      results.push({ 
        fileName: file.name, 
        text: '', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
};

// Utility function to estimate processing time
export const estimateProcessingTime = (file: File): { 
  pdfExtractionTime: number; 
  totalEstimatedTime: number; 
  pages: number;
} => {
  // Rough estimates based on file size
  const sizeInMB = file.size / (1024 * 1024);
  const estimatedPages = Math.round(sizeInMB * 10); // Rough estimate: 100KB per page
  
  // Time estimates in seconds
  const pdfExtractionTime = Math.max(10, estimatedPages * 0.3); // 0.3 seconds per page minimum
  const aiProcessingTime = Math.max(30, estimatedPages * 0.4); // AI processing time
  const totalEstimatedTime = pdfExtractionTime + aiProcessingTime;
  
  return {
    pdfExtractionTime,
    totalEstimatedTime,
    pages: estimatedPages
  };
};
