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
      
      // Try multiple models in order of preference
      // Start with most stable/widely available models first
      const modelsToTry = [
        'gemini-1.5-flash',      // Most stable and widely available
        'gemini-1.5-pro',        // Stable production model
        'gemini-2.0-flash-exp',  // Experimental (may not be available)
        'gemini-pro'             // Legacy model (fallback)
      ];
      
      let lastError: Error | null = null;
      let testModel: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
      
      for (const modelName of modelsToTry) {
        try {
          testModel = testGenAI.getGenerativeModel({ model: modelName });
          // Try a simple test query
          const testResult = await testModel.generateContent('Say "test" if you can hear me.');
          const response = await testResult.response;
          const text = response.text();

          if (text && text.length > 0) {
            setTestResult({
              success: true,
              message: `API key is valid and working! ✓ (using ${modelName})`
            });
            toast({
              title: "API Key Valid",
              description: `The API key is working correctly with ${modelName}`,
            });
            return; // Success, exit early
          }
        } catch (modelError) {
          lastError = modelError as Error;
          console.log(`Model ${modelName} failed, trying next...`, lastError.message);
          continue; // Try next model
        }
      }
      
      // If we get here, all models failed
      if (lastError) {
        throw lastError;
      } else {
        throw new Error('All models returned empty responses');
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      let errorMessage = errorObj.message || String(error);
      
      // Try to extract more details from the error object
      let errorDetails = '';
      if (errorObj && typeof errorObj === 'object') {
        // Check for additional error properties
        const errorAny = errorObj as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (errorAny.status) {
          errorDetails += `Status: ${errorAny.status}. `;
        }
        if (errorAny.statusText) {
          errorDetails += `Status Text: ${errorAny.statusText}. `;
        }
        if (errorAny.cause) {
          errorDetails += `Cause: ${String(errorAny.cause)}. `;
        }
        // Check for Google API specific error structure
        if (errorAny.error) {
          const apiError = errorAny.error;
          if (apiError.message) {
            errorMessage = apiError.message;
          }
          if (apiError.status) {
            errorDetails += `API Status: ${apiError.status}. `;
          }
          if (apiError.code) {
            errorDetails += `Error Code: ${apiError.code}. `;
          }
        }
      }
      
      // Log the full error for debugging
      console.error('API key test error (full):', error);
      console.error('API key test error (message):', errorMessage);
      console.error('API key test error (details):', errorDetails);
      
      // More specific error detection - only match exact quota errors
      let userMessage = 'API key test failed';
      const errorUpper = errorMessage.toUpperCase();
      const detailsUpper = errorDetails.toUpperCase();
      
      // Check for billing-related errors first (most common for new keys)
      if (errorUpper.includes('BILLING') || 
          errorUpper.includes('PAYMENT_REQUIRED') ||
          errorUpper.includes('BILLING_NOT_ENABLED') ||
          detailsUpper.includes('BILLING') ||
          errorUpper.includes('403') && (errorUpper.includes('BILLING') || errorUpper.includes('PAYMENT'))) {
        userMessage = 'Billing setup required. Even for the free tier, you need to set up billing in Google Cloud Console. Please:\n1. Go to your Google Cloud Console\n2. Click "Set up billing" for your project\n3. Complete the billing setup (free tier won\'t charge you)\n4. Wait 1-2 minutes for activation\n5. Try testing the key again';
      } else if (errorUpper.includes('QUOTA_EXCEEDED') || 
          errorUpper.includes('RESOURCE_EXHAUSTED') ||
          (errorUpper.includes('429') && errorUpper.includes('QUOTA'))) {
        userMessage = 'API quota exceeded for this key. Please check your usage limits or wait a few minutes if you just created the key.';
      } else if (errorUpper.includes('API_KEY') || 
                 errorUpper.includes('401') || 
                 (errorUpper.includes('403') && !errorUpper.includes('BILLING'))) {
        userMessage = 'Invalid API key or insufficient permissions. Please verify the key is correct and has Generative AI API enabled.';
      } else if (errorUpper.includes('404') || 
                 errorUpper.includes('NOT_FOUND') ||
                 errorUpper.includes('MODEL_NOT_FOUND')) {
        // Model not found could also be a billing issue
        userMessage = 'Model not found. This often means billing needs to be set up. Please:\n1. Set up billing in Google Cloud Console (even for free tier)\n2. Wait 1-2 minutes after setting up billing\n3. Ensure Generative AI API is enabled\n4. Try testing the key again';
      } else if (errorUpper.includes('RATE_LIMIT') || 
                 errorUpper.includes('RATE_LIMIT_EXCEEDED')) {
        userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else {
        // Show more helpful message with actual error details
        const shortError = errorMessage.length > 200 
          ? errorMessage.substring(0, 200) + '...' 
          : errorMessage;
        userMessage = `Test failed: ${shortError}\n\nCommon solutions:\n1. Set up billing in Google Cloud Console (required even for free tier)\n2. Wait 1-2 minutes if you just created the key\n3. Verify the API key is correct\n4. Check browser console (F12) for more details`;
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
                <div className="flex items-start space-x-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                    {testResult.message.split('\n').map((line, index) => (
                      <div key={index} className={index > 0 ? 'mt-1' : ''}>
                        {line}
                      </div>
                    ))}
                  </div>
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
                  <p className="font-medium text-ai-primary">💡 For New API Keys:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><strong>Billing setup is required</strong> even for the free tier - click "Set up billing" in Google AI Studio</li>
                    <li>Newly created keys may take 1-2 minutes to activate after billing setup</li>
                    <li>Verify the Generative AI API is enabled in your Google Cloud project</li>
                    <li>Check the browser console (F12) for detailed error messages</li>
                  </ul>
                  <p className="font-medium text-ai-primary mt-2">📊 API Usage Tips:</p>
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