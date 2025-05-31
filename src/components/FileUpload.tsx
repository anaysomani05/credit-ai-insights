
import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      validateAndSetFile(pdfFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: "File uploaded successfully",
      description: `${file.name} is ready for processing.`,
    });
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <Card 
        className={`p-8 border-2 border-dashed transition-colors cursor-pointer hover:bg-slate-50 ${
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="text-center space-y-4">
          <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Upload Annual Report
            </h3>
            <p className="text-slate-600 mb-4">
              Drag and drop your PDF file here, or click to browse
            </p>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <AlertCircle className="h-4 w-4" />
              <span>Supports PDF files up to 50MB</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {selectedFile && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h4 className="font-semibold text-slate-900">{selectedFile.name}</h4>
                <p className="text-sm text-slate-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
            
            <Button onClick={handleUploadClick} className="bg-blue-600 hover:bg-blue-700">
              Process Document
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
