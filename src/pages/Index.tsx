import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { ReportGenerator } from '@/components/ReportGenerator';
import { ReportDisplay } from '@/components/ReportDisplay';
import { ChatInterface } from '@/components/ChatInterface';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Shield, Users, Zap, Building2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

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
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<CreditReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const [reportContext, setReportContext] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [sessionFilename, setSessionFilename] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('report', file);

    setIsProcessing(true);
    toast({ title: "Uploading file...", description: "Please wait while the document is uploaded." });
    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const result = await response.json();
      toast({ title: "File uploaded successfully!", description: `${file.name} is ready for analysis.` });
      
      setUploadedFile(file);
      setUploadedFilename(result.filename);
      setGeneratedReport(null);
      
    } catch (error) {
      toast({ title: "Error", description: "Could not upload file. Please try again.", variant: "destructive"});
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    setIsProcessing(true);
    toast({ title: "Fetching file from URL..." });
    try {
      const response = await fetch(`http://localhost:3001/fetch-pdf?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
      }
      const blob = await response.blob();
      const fileName = url.substring(url.lastIndexOf('/') + 1) || 'report.pdf';
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      await handleFileUpload(file);
    } catch (error) {
      toast({ title: "Error", description: `Could not fetch from URL: ${error.message}`, variant: "destructive"});
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartAnalysis = async (companyName: string, apiKey: string) => {
    if (!uploadedFilename) {
      toast({ title: "Error", description: "No uploaded file found to analyze.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    toast({ title: "Analysis Started", description: "The AI is now processing the document. This may take a few minutes." });

    // Store the original filename to be used for the Q&A session
    const originalFilename = uploadedFilename;

    try {
      const response = await fetch('http://localhost:3001/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: originalFilename,
          companyName,
          apiKey,
          cacheBust: new Date().getTime(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Report generation failed on the server.');
      }
      
      const reportSections = await response.json();
      
      const finalReport: CreditReport = {
        ...reportSections,
        companyName,
        generatedAt: new Date().toISOString(),
      };

      setGeneratedReport(finalReport);
      setSessionFilename(originalFilename); // Use the original filename for Q&A
      setApiKey(apiKey);

      toast({ title: "Analysis Complete!", description: "Your report has been successfully generated." });

    } catch (error) {
      toast({ title: "Analysis Failed", description: `${error.message}`, variant: "destructive"});
    } finally {
      setIsProcessing(false);
      setUploadedFile(null); // Clear the uploaded file view
      setUploadedFilename(null); // Clear the temp filename from upload state
    }
  };


  const resetApplication = () => {
    setUploadedFile(null);
    setUploadedFilename(null);
    setGeneratedReport(null);
    setIsProcessing(false);
    setReportContext('');
    setApiKey('');
    setSessionFilename(null);
  };

  const handleAskQuestion = async (question: string): Promise<string> => {
    if (!generatedReport || !apiKey || !sessionFilename) {
      return "Cannot ask questions until a report has been generated.";
    }

    try {
      const response = await fetch('http://localhost:3001/api/ask-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: sessionFilename,
          question,
          companyName: generatedReport.companyName,
          apiKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return `Error from server: ${errorText}`;
      }

      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error('Error answering question:', error);
      return "An unexpected error occurred while trying to get an answer.";
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
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Backend v3.0
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[16rem]">
        {!uploadedFile && !generatedReport && (
          <div className="text-center space-y-8">
            {/* Hero Section & Features etc. - no change here */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-slate-900">
                Transform Annual Reports into 
                <span className="text-blue-600"> Actionable Insights</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Upload or link to BSE company annual reports and get server-processed credit summaries in minutes.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
              <Card className="p-6 text-center space-y-4 hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Management Commentary</h3>
                <p className="text-slate-600">Insights into strategic direction and future outlook</p>
              </Card>
            </div>
            {/* Upload Section */}
            <div className="max-w-2xl mx-auto">
              <FileUpload onFileUpload={handleFileUpload} onUrlSubmit={handleUrlSubmit} />
            </div>
          </div>
        )}

        {uploadedFile && !generatedReport && !isProcessing && (
          <div className="max-w-4xl mx-auto">
            <ReportGenerator 
              file={uploadedFile} 
              onStartAnalysis={handleStartAnalysis}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {isProcessing && !generatedReport && (
          <div className="max-w-4xl mx-auto text-center space-y-8 py-12">
            <div className="animate-pulse">
              <div className="bg-blue-100 p-6 rounded-full w-fit mx-auto mb-6">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-4">Processing Your Report on the Server</h3>
              <p className="text-lg text-slate-600">Our AI is analyzing the document... Please be patient.</p>
            </div>
            <div className="w-full max-w-md mx-auto bg-slate-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full animate-pulse" style={{ width: '75%' }}></div>
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
            
            <div className="grid xl:grid-cols-2 gap-6">
              <div className="order-1">
                <ReportDisplay report={generatedReport} />
              </div>
              
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
            <p>&copy; 2024 CreditAI Analyzer. All processing is now performed on the server.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
