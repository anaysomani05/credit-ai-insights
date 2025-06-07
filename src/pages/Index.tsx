import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { ReportGenerator } from '@/components/ReportGenerator';
import { ReportDisplay } from '@/components/ReportDisplay';
import { ChatInterface } from '@/components/ChatInterface';
import { answerQuestionFromReport } from '@/utils/enhancedAiProcessor';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Shield, Users, Zap } from 'lucide-react';

export interface CreditReport {
  companyName: string;
  overview: string;
  financialHighlights: string;
  keyRisks: string;
  managementCommentary: string;
  generatedAt: string;
}

const Index = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedReport, setGeneratedReport] = useState<CreditReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportContext, setReportContext] = useState<string>(''); // Store extracted text for Q&A
  const [apiKey, setApiKey] = useState<string>(''); // Store API key for chat

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setGeneratedReport(null);
    setReportContext('');
  };

  const handleReportGenerated = (report: CreditReport, extractedText?: string, userApiKey?: string) => {
    setGeneratedReport(report);
    setIsProcessing(false);
    if (extractedText) {
      setReportContext(extractedText);
    }
    if (userApiKey) {
      setApiKey(userApiKey);
    }
  };

  const handleStartProcessing = () => {
    setIsProcessing(true);
  };

  const resetApplication = () => {
    setUploadedFile(null);
    setGeneratedReport(null);
    setIsProcessing(false);
    setReportContext('');
    setApiKey('');
  };

  const handleAskQuestion = async (question: string): Promise<string> => {
    try {
      if (!reportContext || !apiKey) {
        return "I don't have enough context or API access to answer that question. Please generate a report first.";
      }

      if (!generatedReport) {
        return "Please generate a report first before asking questions.";
      }

      // Use the sophisticated Q&A system
      const answer = await answerQuestionFromReport(
        question,
        reportContext,
        generatedReport.companyName,
        apiKey
      );

      return answer;

    } catch (error) {
      console.error('Error answering question:', error);
      return "I encountered an error while processing your question. Please try again or check your API key.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">CreditAI Analyzer</h1>
                <p className="text-slate-600">AI-Powered Credit Summary Reports for BSE Companies</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Enhanced v2.0
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!uploadedFile && !generatedReport && (
          <div className="text-center space-y-8">
            {/* Hero Section */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-slate-900">
                Transform Annual Reports into 
                <span className="text-blue-600"> Actionable Insights</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Upload BSE company annual reports and get AI-generated credit summaries with 
                financial highlights, risk analysis, and management insights in minutes.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="p-6 text-center space-y-4 hover:shadow-lg transition-shadow">
                <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Advanced PDF Processing</h3>
                <p className="text-slate-600">Efficient text extraction from annual reports and regulatory filings</p>
              </Card>

              <Card className="p-6 text-center space-y-4 hover:shadow-lg transition-shadow">
                <div className="bg-green-100 p-3 rounded-full w-fit mx-auto">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">AI-Powered Analysis</h3>
                <p className="text-slate-600">Advanced RAG processing with intelligent section generation</p>
              </Card>

              <Card className="p-6 text-center space-y-4 hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Risk Assessment</h3>
                <p className="text-slate-600">Comprehensive identification of key business and financial risks</p>
              </Card>
            </div>

            {/* Upload Section */}
            <div className="max-w-2xl mx-auto">
              <FileUpload onFileUpload={handleFileUpload} />
            </div>
          </div>
        )}

        {uploadedFile && !generatedReport && !isProcessing && (
          <div className="max-w-4xl mx-auto">
            <ReportGenerator 
              file={uploadedFile} 
              onReportGenerated={handleReportGenerated}
              onStartProcessing={handleStartProcessing}
            />
          </div>
        )}

        {isProcessing && (
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="animate-pulse">
              <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Processing Your Report</h3>
              <p className="text-slate-600">Our AI is analyzing the document and generating insights...</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
            </div>
          </div>
        )}

        {generatedReport && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Generated Credit Report</h2>
              <Button onClick={resetApplication} variant="outline">
                Generate New Report
              </Button>
            </div>
            
            {/* Side by Side Layout */}
            <div className="grid xl:grid-cols-2 gap-6">
              {/* Report Display - Left Side */}
              <div className="order-1">
                <ReportDisplay report={generatedReport} />
              </div>
              
              {/* Chat Interface - Right Side */}
              <div className="order-2 xl:sticky xl:top-6 xl:h-fit">
                <ChatInterface 
                  companyName={generatedReport.companyName}
                  onAskQuestion={handleAskQuestion}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600">
            <p>&copy; 2024 CreditAI Analyzer. Built for BSE-listed company analysis.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
