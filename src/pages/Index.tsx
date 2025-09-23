import React, { useState, useCallback } from 'react';
import { FileText, MessageSquare, Settings, Trash2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ChatInterface } from '@/components/ChatInterface';
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { DocumentPreview } from '@/components/DocumentPreview';
import { Document, ChatMessage } from '@/types/document';
import { DocumentService } from '@/services/documentService';
import { geminiService } from '@/services/geminiService';

const Index = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showApiDialog, setShowApiDialog] = useState(!geminiService.isInitialized());
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  // Handle file uploads
  const handleFileUpload = useCallback(async (files: File[]) => {
    const newDocuments: Document[] = [];

    for (const file of files) {
      try {
        const content = await DocumentService.extractTextContent(file);
        const thumbnail = await DocumentService.generateThumbnail(file);
        
        const document: Document = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          file,
          content,
          thumbnail,
          uploadedAt: new Date(),
        };

        newDocuments.push(document);
      } catch (error) {
        console.error('Error processing file:', error);
        toast({
          title: "Upload Error",
          description: `Failed to process ${file.name}`,
          variant: "destructive",
        });
      }
    }

    if (newDocuments.length > 0) {
      setDocuments(prev => [...prev, ...newDocuments]);
      toast({
        title: "Upload Successful",
        description: `${newDocuments.length} document(s) uploaded successfully`,
      });
    }
  }, [toast]);

  // Handle message sending
  const handleSendMessage = useCallback(async (content: string) => {
    if (!geminiService.isInitialized()) {
      setShowApiDialog(true);
      return;
    }

    if (documents.length === 0) {
      toast({
        title: "No Documents",
        description: "Please upload some documents before asking questions",
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await geminiService.queryDocuments(content, documents);
      
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        relatedDocuments: response.sources,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: unknown) {
      console.error('Error querying documents:', error);
      const errorObj = error as Error;
      setError(errorObj.message || 'Failed to process your question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [documents, toast]);

  // Handle API key submission
  const handleApiKeySubmit = useCallback((apiKey: string) => {
    const success = geminiService.initialize(apiKey);
    if (success) {
      localStorage.setItem('gemini_api_key', apiKey);
      setShowApiDialog(false);
      toast({
        title: "API Key Configured",
        description: "You can now start asking questions about your documents",
      });
    } else {
      toast({
        title: "Invalid API Key",
        description: "Please check your API key and try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Handle document removal
  const handleRemoveDocument = useCallback((documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    toast({
      title: "Document Removed",
      description: "Document has been removed successfully",
    });
  }, [toast]);

  // Clear all documents
  const handleClearDocuments = useCallback(() => {
    setDocuments([]);
    setMessages([]);
    toast({
      title: "Documents Cleared",
      description: "All documents and chat history have been cleared",
    });
  }, [toast]);

  // Handle document preview
  const handlePreviewDocument = useCallback((document: Document) => {
    setPreviewDocument(document);
  }, []);

  // Initialize API key from localStorage
  React.useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
      const success = geminiService.initialize(savedApiKey);
      if (success) {
        setShowApiDialog(false);
      }
    }
  }, []);

  return (
    <div className="h-screen bg-gradient-secondary flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-card border-b shadow-custom-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  DocQuery AI
                </h1>
                <p className="text-sm text-muted-foreground">
                  Intelligent document analysis powered by AI
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApiDialog(true)}
                className="hidden sm:flex"
              >
                <Settings className="w-4 h-4 mr-2" />
                API Settings
              </Button>
              {documents.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearDocuments}
                  className="hidden sm:flex hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Document Panel */}
          <div className="lg:col-span-1">
            <Card className="h-full bg-gradient-card border-0 shadow-custom-md">
              <div className="p-4 border-b">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-ai-primary" />
                  <h2 className="text-lg font-semibold">Documents</h2>
                </div>
              </div>
              <div className="p-4 h-[calc(100%-4rem)] overflow-y-auto" style={{ minHeight: '400px' }}>
                <DocumentUpload
                  onUpload={handleFileUpload}
                  documents={documents}
                  onRemoveDocument={handleRemoveDocument}
                  onPreviewDocument={handlePreviewDocument}
                />
              </div>
            </Card>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full bg-gradient-card border-0 shadow-custom-md flex flex-col">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                error={error}
              />
            </Card>
          </div>
        </div>
      </main>

      {/* API Key Dialog */}
      <ApiKeyDialog
        open={showApiDialog}
        onApiKeySubmit={handleApiKeySubmit}
      />

      {/* Document Preview Dialog */}
      <DocumentPreview
        document={previewDocument}
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
      />

      <Toaster />
    </div>
  );
};

export default Index;
