import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';

interface ReportGeneratorProps {
  file: File;
  onStartAnalysis: (companyName: string, apiKey: string) => void;
  isProcessing: boolean;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  file,
  onStartAnalysis,
  isProcessing,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  const handleGenerate = () => {
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

    onStartAnalysis(companyName, apiKey);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="h-6 w-6 text-blue-600" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Document Ready for Analysis</h3>
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
              disabled={isProcessing}
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
              disabled={isProcessing}
            />
            <p className="text-sm text-slate-500 mt-1">
              Your API key will be sent to the backend for processing.
            </p>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-center">
        <Button 
          onClick={handleGenerate} 
          className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto px-8 flex items-center gap-2"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Document'
          )}
        </Button>
      </div>
    </div>
  );
};
