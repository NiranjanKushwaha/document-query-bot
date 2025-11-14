import React, { useState } from 'react';
import { Key, Eye, EyeOff, ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { geminiService } from '@/services/geminiService';
import { useToast } from '@/hooks/use-toast';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySubmit: (apiKey: string) => void;
}

export const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({
  open,
  onOpenChange,
  onApiKeySubmit,
}) => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Get current API key from localStorage (masked)
  const currentApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  const maskedCurrentKey = currentApiKey 
    ? `${currentApiKey.substring(0, 8)}...${currentApiKey.substring(currentApiKey.length - 4)}`
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
      setApiKey('');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setApiKey('');
    setTestResult(null);
  };

  // Test API key before saving
  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "No API Key",
        description: "Please enter an API key to test",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Create a temporary service instance to test
      const testGenAI = new GoogleGenerativeAI(apiKey.trim());
      const testModel = testGenAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      // Try a simple test query
      const testResult = await testModel.generateContent('Say "test" if you can hear me.');
      const response = await testResult.response;
      const text = response.text();

      if (text && text.length > 0) {
        setTestResult({
          success: true,
          message: 'API key is valid and working! ✓'
        });
        toast({
          title: "API Key Valid",
          description: "The API key is working correctly",
        });
      } else {
        setTestResult({
          success: false,
          message: 'API key returned empty response'
        });
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      const errorMessage = errorObj.message || String(error);
      
      let userMessage = 'API key test failed';
      if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('quota') || errorMessage.includes('429')) {
        userMessage = 'API quota exceeded for this key';
      } else if (errorMessage.includes('API_KEY') || errorMessage.includes('401') || errorMessage.includes('403')) {
        userMessage = 'Invalid API key or insufficient permissions';
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        userMessage = 'Model not found. API key may be valid but model access issue';
      } else {
        userMessage = `Test failed: ${errorMessage.substring(0, 100)}`;
      }

      setTestResult({
        success: false,
        message: userMessage
      });
      
      toast({
        title: "API Key Test Failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Key className="w-4 h-4 sm:w-5 sm:h-5 text-ai-primary flex-shrink-0" />
            <span>Configure Gemini API</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Enter your Google Gemini API key to enable AI document querying.
          </DialogDescription>
        </DialogHeader>

        {maskedCurrentKey && (
          <Alert className="bg-muted/50 border-muted">
            <AlertDescription className="text-xs sm:text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Current API Key: <code className="text-xs bg-background px-1 py-0.5 rounded">{maskedCurrentKey}</code></span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const current = localStorage.getItem('gemini_api_key');
                      if (current) {
                        setApiKey(current);
                        setShowKey(true);
                      }
                    }}
                    className="text-xs h-6"
                  >
                    Use Current
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  <p>💡 Note: API usage logs may take a few minutes to appear in Google AI Studio.</p>
                  <p>💡 If logs don't show, ensure billing is set up (required for detailed logs).</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm">Gemini API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="pr-10 text-sm sm:text-base"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2 sm:px-3"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <AlertDescription className="text-xs sm:text-sm">
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                    {testResult.message}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-gradient-ai border-ai-primary/20">
            <AlertDescription className="text-xs sm:text-sm">
              <div className="space-y-2">
                <p>
                  Don't have an API key? Get one from Google AI Studio:
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs sm:text-sm"
                  onClick={() => window.open('https://makersuite.google.com/app/apikey', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Get Gemini API Key</span>
                  <span className="sm:hidden">Get API Key</span>
                </Button>
                <div className="text-[10px] sm:text-xs text-muted-foreground space-y-1">
                  <p>Your API key is stored locally in your browser and never sent to our servers.</p>
                  <p className="font-medium text-ai-primary">📊 API Usage Tips:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>API calls appear in Google AI Studio logs (may take 2-5 minutes)</li>
                    <li>Detailed logs require billing setup (free tier shows basic usage)</li>
                    <li>Check "Usage and Billing" for quota and usage statistics</li>
                    <li>Each API call is logged with timestamp and model used</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestKey}
                disabled={!apiKey.trim() || isTesting}
                className="flex-1 text-sm"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Test API Key
                  </>
                )}
              </Button>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-primary hover:bg-primary-hover w-full sm:w-auto text-sm"
                disabled={!apiKey.trim()}
              >
                Save API Key
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};