import React, { useState } from 'react';
import { Key, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

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
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Your API key is stored locally in your browser and never sent to our servers.
                </p>
              </div>
            </AlertDescription>
          </Alert>

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
        </form>
      </DialogContent>
    </Dialog>
  );
};