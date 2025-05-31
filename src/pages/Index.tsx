
import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { ReportGenerator } from '@/components/ReportGenerator';
import { ReportDisplay } from '@/components/ReportDisplay';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Shield, Users } from 'lucide-react';

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

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setGeneratedReport(null);
  };

  const handleReportGenerated = (report: CreditReport) => {
    setGeneratedReport(report);
    setIsProcessing(false);
  };

  const handleStartProcessing = () => {
    setIsProcessing(true);
  };

  const resetApplication = () => {
    setUploadedFile(null);
    setGeneratedReport(null);
    setIsProcessing(false);
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
              MVP v1.0
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
                <h3 className="text-lg font-semibold text-slate-900">PDF Processing</h3>
                <p className="text-slate-600">Advanced text extraction from annual reports and regulatory filings</p>
              </Card>

              <Card className="p-6 text-center space-y-4 hover:shadow-lg transition-shadow">
                <div className="bg-green-100 p-3 rounded-full w-fit mx-auto">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Financial Analysis</h3>
                <p className="text-slate-600">Extract key metrics: Revenue, EBITDA, ROE, Debt/Equity ratios</p>
              </Card>

              <Card className="p-6 text-center space-y-4 hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Risk Assessment</h3>
                <p className="text-slate-600">AI-powered identification of key business and financial risks</p>
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
            <ReportDisplay report={generatedReport} />
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
