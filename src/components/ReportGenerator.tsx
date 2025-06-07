import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CreditReport } from '@/pages/Index';
import { extractPDFText, estimateProcessingTime } from '@/utils/pdfProcessor';
import { generateEnhancedReportSections } from '@/utils/enhancedAiProcessor';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2, Clock } from 'lucide-react';

interface ReportGeneratorProps {
  file: File;
  onReportGenerated: (report: CreditReport, extractedText?: string, apiKey?: string) => void;
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
  const [currentStep, setCurrentStep] = useState('');
  const [timeEstimate, setTimeEstimate] = useState<{
    pdfExtractionTime: number;
    totalEstimatedTime: number;
    pages: number;
  } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();

  // Calculate time estimates when file changes
  useEffect(() => {
    const estimates = estimateProcessingTime(file);
    setTimeEstimate(estimates);
  }, [file]);

  // Update elapsed time during processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, startTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepMessage = (progress: number): string => {
    if (progress < 5) return 'Initializing processing...';
    if (progress < 20) return 'Extracting text from PDF...';
    if (progress < 30) return 'Cleaning and preprocessing text...';
    if (progress < 40) return 'Creating semantic chunks...';
    if (progress < 70) return 'Generating embeddings...';
    if (progress < 85) return 'Building vector search index...';
    if (progress < 95) return 'Generating report sections...';
    return 'Finalizing report...';
  };

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
    setStartTime(Date.now());
    onStartProcessing();
    setProgress(0);
    setElapsedTime(0);

    // Set timeout for the entire process (8 minutes for large files)
    const processingTimeout = setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Processing timeout",
        description: "The file was too large to process in time. Please try with a smaller file or contact support.",
        variant: "destructive",
      });
    }, 8 * 60 * 1000);

    try {
      // Step 1: Extract text from PDF
      setCurrentStep('Extracting text from PDF...');
      toast({
        title: "Processing document",
        description: "Extracting text from PDF...",
      });
      
      const extractedText = await extractPDFText(file, (pdfProgress) => {
        const overallProgress = pdfProgress * 0.2; // PDF extraction is 20% of total
        setProgress(overallProgress * 100);
        setCurrentStep(getStepMessage(overallProgress * 100));
      });
      
      if (!extractedText || extractedText.length < 100) {
        throw new Error("Could not extract sufficient text from the PDF");
      }

      console.log(`Extracted ${extractedText.length} characters from PDF`);

      // Step 2: Generate report sections using enhanced AI processor
      setCurrentStep('Analyzing content with AI...');
      toast({
        title: "Generating insights",
        description: "Creating AI-powered analysis...",
      });

      const reportSections = await generateEnhancedReportSections(
        extractedText, 
        companyName, 
        apiKey,
        (aiProgress) => {
          const overallProgress = 0.2 + (aiProgress * 0.8); // AI processing is 80% of total
          setProgress(overallProgress * 100);
          setCurrentStep(getStepMessage(overallProgress * 100));
        },
        file // Pass file for caching
      );

      console.log('Generated report sections:', reportSections);

      const report: CreditReport = {
        companyName: companyName.trim(),
        overview: reportSections.overview,
        financialHighlights: reportSections.financialHighlights,
        keyRisks: reportSections.keyRisks,
        managementCommentary: reportSections.managementCommentary,
        generatedAt: new Date().toISOString(),
      };

      clearTimeout(processingTimeout);
      onReportGenerated(report, extractedText, apiKey);
      
      const finalElapsed = Math.floor((Date.now() - (startTime || 0)) / 1000);
      toast({
        title: "Report generated successfully",
        description: `Analysis completed in ${formatTime(finalElapsed)}.`,
      });

    } catch (error) {
      clearTimeout(processingTimeout);
      console.error('Error generating report:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setCurrentStep('');
      setStartTime(null);
      setElapsedTime(0);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="h-6 w-6 text-blue-600" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Document Ready for Processing</h3>
            <p className="text-slate-600">{file.name}</p>
            {timeEstimate && (
              <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>~{timeEstimate.pages} pages</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Est. {formatTime(timeEstimate.totalEstimatedTime)}</span>
                </div>
              </div>
            )}
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
              disabled={isGenerating}
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
              disabled={isGenerating}
            />
            <p className="text-sm text-slate-500 mt-1">
              Your API key is stored locally and not sent to our servers
            </p>
          </div>
        </div>

        {isGenerating && (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 font-medium">{currentStep}</span>
              <div className="flex items-center space-x-4 text-slate-500">
                <span>{Math.round(progress)}%</span>
                <span>⏱️ {formatTime(elapsedTime)}</span>
                {timeEstimate && (
                  <span className="text-xs">
                    / ~{formatTime(timeEstimate.totalEstimatedTime)}
                  </span>
                )}
              </div>
            </div>
            <Progress value={progress} className="h-3" />
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
        <h4 className="font-semibold text-blue-900 mb-2">Enhanced RAG Analysis:</h4>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Semantic text chunking and preprocessing</li>
          <li>• Vector embeddings for accurate information retrieval</li>
          <li>• Context-aware section generation</li>
          <li>• Reduced repetition and improved accuracy</li>
        </ul>
      </Card>
    </div>
  );
};
