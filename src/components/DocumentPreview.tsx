import React, { useState, useEffect } from 'react';
import { X, Eye, Download, FileText, Image, File, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Document } from '@/types/document';

interface DocumentPreviewProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [imageError, setImageError] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    if (document && document.type.includes('pdf')) {
      try {
        const url = URL.createObjectURL(document.file);
        setPdfUrl(url);
        setPdfError(false);
      } catch (error) {
        console.error('Error creating PDF URL:', error);
        setPdfError(true);
      }

      // Cleanup function to revoke the URL
      return () => {
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
      };
    }
  }, [document]);

  // Cleanup PDF URL when component unmounts or document changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!document) return null;

  const isImage = document.type.startsWith('image/');
  const isText = document.type.startsWith('text/') || 
    document.type.includes('json') || 
    document.type.includes('javascript');
  const isPDF = document.type.includes('pdf');

  const handleDownload = () => {
    const url = URL.createObjectURL(document.file);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.name;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderPreview = () => {
    if (isImage && !imageError) {
      return (
        <div className="flex items-center justify-center p-2 sm:p-4 bg-muted/30 rounded-lg">
          <img
            src={URL.createObjectURL(document.file)}
            alt={document.name}
            className="max-w-full max-h-[50vh] sm:max-h-96 object-contain rounded-lg shadow-custom-md"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (isPDF && pdfUrl && !pdfError) {
      return (
        <div className="bg-muted/30 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 border-b gap-2">
            <span className="text-xs sm:text-sm font-medium">PDF Preview</span>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(pdfUrl, '_blank')}
                className="text-[10px] sm:text-xs p-1 sm:px-2 sm:py-1"
              >
                <span className="hidden sm:inline">Open in New Tab</span>
                <span className="sm:hidden">Open</span>
              </Button>
            </div>
          </div>
          <div className="relative">
            <iframe
              src={pdfUrl}
              className="w-full h-[50vh] sm:h-96 border-0"
              title={`Preview of ${document.name}`}
              onError={() => setPdfError(true)}
            />
          </div>
        </div>
      );
    }

    if (isText && document.content) {
      return (
        <div className="bg-muted/30 rounded-lg p-2 sm:p-4">
          <pre className="whitespace-pre-wrap text-xs sm:text-sm font-mono text-foreground max-h-[50vh] sm:max-h-96 overflow-y-auto">
            {document.content}
          </pre>
        </div>
      );
    }

    // Fallback for other file types or PDF error
    return (
      <Card className="p-4 sm:p-6 md:p-8 text-center bg-gradient-ai">
        <div className="space-y-3 sm:space-y-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
            {isPDF ? (
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            ) : (
              <File className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-1 sm:mb-2 break-words">{document.name}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
              {isPDF 
                ? (pdfError ? 'PDF could not be displayed' : 'PDF Document') 
                : 'Binary File'
              } • {(document.size / 1024).toFixed(1)} KB
            </p>
            {isPDF && pdfError && (
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
                This PDF cannot be previewed in the browser. You can download it to view with your preferred PDF reader.
              </p>
            )}
            <Button
              onClick={handleDownload}
              className="bg-gradient-primary hover:bg-primary-hover text-xs sm:text-sm"
              size="sm"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Download File</span>
              <span className="sm:hidden">Download</span>
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-ai-primary flex-shrink-0" />
              <span className="truncate text-sm sm:text-base">Preview: {document.name}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="p-2 sm:px-3 sm:py-2"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-3 sm:mt-4">
          {renderPreview()}
        </div>

        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
          <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <p><strong>File Size:</strong> {(document.size / 1024).toFixed(1)} KB</p>
            <p><strong>Type:</strong> {document.type || 'Unknown'}</p>
            <p><strong>Uploaded:</strong> {document.uploadedAt.toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};