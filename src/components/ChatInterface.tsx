import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, Loader2, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatMessage } from '@/types/document';
import { PDFExportService } from '@/services/pdfExportService';
import { useToast } from '@/hooks/use-toast';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error?: string;
  ocrProgress?: number;
  isOcrProcessing?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  error,
  ocrProgress = 0,
  isOcrProcessing = false,
}) => {
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Also scroll to bottom when loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const message = inputMessage.trim();
    
    // Basic validation to encourage document-related questions
    const nonDocumentKeywords = ['calculate', 'math', 'code', 'programming', 'weather', 'news', 'general', 'what is', 'how to'];
    const isLikelyNonDocument = nonDocumentKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (isLikelyNonDocument && !message.toLowerCase().includes('document') && !message.toLowerCase().includes('file')) {
      // Still allow the message but the AI will handle the restriction
    }
    
    setInputMessage('');
    await onSendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDownloadPDF = async () => {
    if (messages.length === 0) {
      toast({
        title: "No Messages",
        description: "There are no messages to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      const filename = PDFExportService.formatFilename(messages);
      
      try {
        // Try the direct method first (more reliable)
        await PDFExportService.exportChatToPDFDirect(messages, filename);
      } catch (directError) {
        console.warn('Direct method failed, trying HTML2Canvas method:', directError);
        // Fallback to HTML2Canvas method
        await PDFExportService.exportChatToPDF(messages, filename);
      }
      
      toast({
        title: "Export Successful",
        description: "Chat conversation has been downloaded as PDF.",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export chat conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-card flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Document Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Ask questions about your uploaded documents
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={isExporting || isLoading || isOcrProcessing}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 hover:bg-gradient-primary hover:text-white transition-all duration-300"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isExporting ? 'Exporting...' : `Download PDF (${messages.length})`}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export chat conversation as PDF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages-container" style={{ minHeight: 0, maxHeight: 'calc(100vh - 200px)' }}>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-ai rounded-full flex items-center justify-center">
              <Bot className="w-8 h-8 text-ai-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Ready to analyze your documents!</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
              Upload some documents and ask me questions about their content. 
              I can help you find information, summarize content, and answer specific queries about your uploaded files.
            </p>
            <div className="text-xs text-muted-foreground max-w-md mx-auto">
              <p className="font-medium mb-2">💡 Try asking:</p>
              <ul className="text-left space-y-1">
                <li>• "Give me a summary"</li>
                <li>• "What are the key points?"</li>
                <li>• "Show me the data"</li>
                <li>• "What are the main findings?"</li>
                <li>• "Explain the details"</li>
                <li>• "What information is available?"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[80%] p-4 chat-message ${
                  message.type === 'user'
                    ? 'bg-gradient-primary text-white'
                    : 'bg-card border-muted'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user'
                      ? 'bg-white/20'
                      : 'bg-gradient-primary'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                      message.type === 'user' ? 'text-white' : 'text-foreground'
                    }`}>
                      {message.content}
                    </p>
                    <p className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ))
        )}

        {(isLoading || isOcrProcessing) && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-card border-muted chat-message">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-2">
                    {isOcrProcessing ? 'Processing image-based PDF with OCR...' : 'Processing your question...'}
                  </div>
                  {isOcrProcessing && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${ocrProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {error && (
          <Alert className="border-ai-error bg-ai-error/5">
            <AlertCircle className="h-4 w-4 text-ai-error flex-shrink-0" />
            <AlertDescription className="text-ai-error break-words overflow-wrap-anywhere">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gradient-card flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your uploaded documents (e.g., 'Give me a summary', 'What are the key points?')"
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-primary hover:bg-primary-hover transition-all duration-300"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line. I can only answer questions about your uploaded documents.
        </p>
      </div>
    </div>
  );
};