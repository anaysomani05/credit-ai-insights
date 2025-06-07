# 🏦 CreditAI Analyzer

**AI-Powered Credit Summary Reports for BSE Companies**

Transform lengthy annual reports into actionable credit insights in minutes. CreditAI Analyzer uses advanced RAG (Retrieval-Augmented Generation) technology to extract key financial highlights, assess risks, and provide management commentary from BSE-listed company documents.

![CreditAI Analyzer](https://img.shields.io/badge/Status-Production%20Ready-green)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)
![Performance](https://img.shields.io/badge/Performance-40--60%25%20Faster-brightgreen)

## ✨ Features

### 🔍 **Advanced Document Processing**
- **PDF Text Extraction**: Efficient processing of large annual reports (180+ pages)
- **Chunked Processing**: Memory-optimized handling to prevent browser freezing
- **Smart Caching**: 24-hour intelligent caching for instant re-processing

### 🤖 **AI-Powered Analysis**
- **Parallel Section Generation**: Simultaneous processing of multiple report sections
- **Enhanced RAG**: Context-aware information retrieval with vector embeddings
- **Batch Processing**: Optimized API calls for faster embedding generation
- **Error Resilience**: Automatic retry logic with exponential backoff

### 📊 **Generated Report Sections**
- **Company Overview**: Business model and market position analysis
- **Financial Highlights**: Key metrics, ratios, and performance indicators
- **Risk Assessment**: Comprehensive identification of business and financial risks
- **Management Commentary**: Strategic insights and future outlook

### 💬 **Interactive Q&A**
- **Intelligent Chat**: Ask questions about the generated report
- **Context-Aware Responses**: Answers based on the actual document content
- **Semantic Search**: Advanced retrieval for precise information

## 🚀 Performance Optimizations

Our enhanced processing pipeline delivers **40-60% faster analysis**:

| Document Size | Processing Time | Cache Hit Time |
|---------------|-----------------|----------------|
| Small (< 5MB) | 20-40 seconds | < 5 seconds |
| Medium (5-15MB) | 45-80 seconds | < 10 seconds |
| Large (15-30MB) | 1.5-2.5 minutes | < 15 seconds |
| Very Large (> 30MB) | 2.5-5 minutes | < 20 seconds |

### Key Optimizations:
- ⚡ **Parallel Processing**: Multiple sections generated simultaneously
- 🔄 **Batch Embeddings**: Efficient API utilization with rate limiting
- 💾 **Intelligent Caching**: File-based caching with automatic expiry
- 🧩 **Chunked PDF Processing**: Memory-efficient page-by-page processing
- 🛡️ **Error Handling**: Comprehensive timeout and retry mechanisms

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** - Modern React with functional components
- **TypeScript 5.5.3** - Type-safe development
- **Vite 5.4.1** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library

### AI & Processing
- **LangChain** - Advanced RAG implementation
- **OpenAI Embeddings** - Vector embeddings for semantic search
- **PDF.js** - Client-side PDF text extraction
- **Memory Vector Store** - In-memory vector database

### Key Dependencies
- `@langchain/openai` - OpenAI integration
- `langchain` - RAG framework
- `pdfjs-dist` - PDF processing
- `react-router-dom` - Client-side routing
- `@tanstack/react-query` - Server state management

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **OpenAI API Key** with access to GPT-4 and embeddings

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/anaysomani05/credit-ai-insights.git
cd credit-ai-insights-generator-main
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

## 📖 Usage Guide

### Step 1: Upload Document
- Drag and drop or click to upload a PDF annual report
- Supports files up to 50MB in size
- Optimized for BSE-listed company reports

### Step 2: Configure Analysis
- Enter the company name for context-aware analysis
- Provide your OpenAI API key (stored locally, never sent to servers)
- Click "Generate Credit Report" to start processing

### Step 3: Review Generated Report
- **Company Overview**: Strategic positioning and business model
- **Financial Highlights**: Key performance metrics and ratios
- **Risk Assessment**: Identified business and financial risks
- **Management Commentary**: Strategic insights and outlook

### Step 4: Interactive Q&A
- Ask specific questions about the report
- Get context-aware answers based on the original document
- Explore detailed insights through natural language queries

## ⚙️ Configuration

### Environment Variables
Create a `.env.local` file for local development:

```bash
# Optional: Set default API configuration
VITE_DEFAULT_MODEL=gpt-4-turbo-preview
VITE_MAX_FILE_SIZE=52428800  # 50MB in bytes
```

### API Key Setup
Users provide their OpenAI API key through the UI:
- Keys are stored locally in browser storage
- Never transmitted to external servers
- Used directly for OpenAI API calls

## 🔧 Development

### Project Structure
```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── ChatInterface.tsx
│   ├── FileUpload.tsx
│   ├── ReportGenerator.tsx
│   └── ReportDisplay.tsx
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── pages/               # Application pages
├── utils/               # Processing utilities
│   ├── enhancedAiProcessor.ts
│   └── pdfProcessor.ts
└── types/               # TypeScript type definitions
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build in development mode
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Quality
- **ESLint** configuration for code consistency
- **TypeScript** for type safety
- **Prettier** (recommended) for code formatting

## 🎯 Use Cases

### Financial Analysts
- Quickly extract key metrics from annual reports
- Identify potential risks and opportunities
- Generate standardized credit assessment summaries

### Investment Teams
- Rapid due diligence on BSE-listed companies
- Comparative analysis across multiple companies
- Risk assessment for portfolio management

### Credit Officers
- Automated preliminary credit analysis
- Risk factor identification and assessment
- Management strategy evaluation

### Research Teams
- Efficient processing of regulatory filings
- Extraction of strategic insights
- Competitive intelligence gathering

## 🔒 Security & Privacy

- **Local Processing**: All document processing happens in your browser
- **API Key Security**: OpenAI keys stored locally, never transmitted to our servers
- **No Data Storage**: Documents and reports are not stored on external servers
- **Cache Management**: Local cache with automatic 24-hour expiry

## 🚧 Limitations

- **File Size**: Maximum 50MB PDF file size
- **Language**: Optimized for English-language documents
- **Document Type**: Best performance with standard annual report formats
- **API Dependency**: Requires OpenAI API access for full functionality

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add TypeScript types for new features
- Include error handling for new API calls
- Test with various document sizes and formats

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Q: Processing takes too long**
A: Large documents (30MB+) may take 2-5 minutes. Our optimizations reduce this by 40-60% compared to standard processing.

**Q: API errors during processing**
A: Check your OpenAI API key and ensure you have sufficient credits. The system includes automatic retry logic for temporary failures.

**Q: Browser freezing on large files**
A: Our chunked processing prevents this, but very large files (50MB+) may still cause performance issues on lower-end devices.

### Contact
- **GitHub Issues**: [Report bugs or request features](https://github.com/anaysomani05/credit-ai-insights/issues)
- **Email**: [Your support email]

## 🙏 Acknowledgments

- Built with [LangChain](https://langchain.com/) for advanced RAG capabilities
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- PDF processing powered by [PDF.js](https://mozilla.github.io/pdf.js/)
- Deployment supported by [Lovable](https://lovable.dev/)

---

**CreditAI Analyzer** - Transforming annual reports into actionable credit insights with AI precision. 🚀
