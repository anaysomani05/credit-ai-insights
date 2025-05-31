import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CreditReport } from '@/pages/Index';
import { extractPDFText } from '@/utils/pdfProcessor';
import { generateReportSections } from '@/utils/aiProcessor';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';

interface ReportGeneratorProps {
  file: File;
  onReportGenerated: (report: CreditReport) => void;
  onStartProcessing: () => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  file,
  onReportGenerated,
  onStartProcessing,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter the company name to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: "API key required",
        description: "Please enter your OpenAI API key to proceed.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    onStartProcessing();
    setProgress(0);

    try {
      // Extract text from PDF
      toast({
        title: "Processing document",
        description: "Extracting text from PDF...",
      });
      
      const extractedText = await extractPDFText(file);
      
      if (!extractedText || extractedText.length < 100) {
        throw new Error("Could not extract sufficient text from the PDF");
      }

      // Generate report sections using AI
      toast({
        title: "Analyzing content",
        description: "Generating AI-powered insights...",
      });

      const reportSections = await generateReportSections(
        extractedText, 
        companyName, 
        apiKey,
        (progress) => setProgress(progress * 100)
      );

      const report: CreditReport = {
        companyName: companyName.trim(),
        overview: reportSections.overview,
        financialHighlights: reportSections.financialHighlights,
        keyRisks: reportSections.keyRisks,
        managementCommentary: reportSections.managementCommentary,
        generatedAt: new Date().toISOString(),
      };

      onReportGenerated(report);
      
      toast({
        title: "Report generated successfully",
        description: "Your credit analysis report is ready.",
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Document Ready</h3>
            <p className="text-slate-600">{file.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Reliance Industries Limited"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="mt-1"
            />
            <p className="text-sm text-slate-500 mt-1">
              Your API key is stored locally and not sent to our servers
            </p>
          </div>
        </div>

        {isGenerating && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Processing document...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200">
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              'Generate Credit Report'
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">What we'll analyze:</h4>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Company overview and business model</li>
          <li>• Financial highlights and key metrics</li>
          <li>• Risk factors and mitigation strategies</li>
          <li>• Management commentary and outlook</li>
        </ul>
      </Card>
    </div>
  );
};
