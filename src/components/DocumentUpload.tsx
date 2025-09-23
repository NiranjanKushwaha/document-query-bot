import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Document } from '@/types/document';

interface DocumentUploadProps {
  onUpload: (files: File[]) => void;
  documents: Document[];
  onRemoveDocument: (documentId: string) => void;
  onPreviewDocument: (document: Document) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUpload,
  documents,
  onRemoveDocument,
  onPreviewDocument,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/*': ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    multiple: true,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`p-8 border-2 border-dashed transition-all duration-300 cursor-pointer hover:shadow-custom-md ${
          isDragActive 
            ? 'border-ai-primary bg-gradient-ai' 
            : 'border-muted hover:border-ai-primary'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? 'Drop files here' : 'Upload Documents'}
            </h3>
            <p className="text-muted-foreground text-sm">
              Drag & drop files or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, Images
            </p>
          </div>
        </div>
      </Card>

      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">
            Uploaded Documents ({documents.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-3 bg-gradient-card border border-muted">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreviewDocument(doc)}
                      className="w-8 h-8 p-0 hover:bg-ai-primary hover:text-white"
                      title="Preview document"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveDocument(doc.id)}
                      className="w-8 h-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      title="Remove document"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};