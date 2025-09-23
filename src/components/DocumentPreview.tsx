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
        <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
          <img
            src={URL.createObjectURL(document.file)}
            alt={document.name}
            className="max-w-full max-h-96 object-contain rounded-lg shadow-custom-md"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (isPDF && pdfUrl && !pdfError) {
      return (
        <div className="bg-muted/30 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
            <span className="text-sm font-medium">PDF Preview</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(pdfUrl, '_blank')}
                className="text-xs"
              >
                Open in New Tab
              </Button>
            </div>
          </div>
          <div className="relative">
            <iframe
              src={pdfUrl}
              className="w-full h-96 border-0"
              title={`Preview of ${document.name}`}
              onError={() => setPdfError(true)}
            />
          </div>
        </div>
      );
    }

    if (isText && document.content) {
      return (
        <div className="bg-muted/30 rounded-lg p-4">
          <pre className="whitespace-pre-wrap text-sm font-mono text-foreground max-h-96 overflow-y-auto">
            {document.content}
          </pre>
        </div>
      );
    }

    // Fallback for other file types or PDF error
    return (
      <Card className="p-8 text-center bg-gradient-ai">
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
            {isPDF ? (
              <FileText className="w-8 h-8 text-white" />
            ) : (
              <File className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">{document.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {isPDF 
                ? (pdfError ? 'PDF could not be displayed' : 'PDF Document') 
                : 'Binary File'
              } • {(document.size / 1024).toFixed(1)} KB
            </p>
            {isPDF && pdfError && (
              <p className="text-sm text-muted-foreground mb-4">
                This PDF cannot be previewed in the browser. You can download it to view with your preferred PDF reader.
              </p>
            )}
            <Button
              onClick={handleDownload}
              className="bg-gradient-primary hover:bg-primary-hover"
            >
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-ai-primary" />
              <span>Preview: {document.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {renderPreview()}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>File Size:</strong> {(document.size / 1024).toFixed(1)} KB</p>
            <p><strong>Type:</strong> {document.type || 'Unknown'}</p>
            <p><strong>Uploaded:</strong> {document.uploadedAt.toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};