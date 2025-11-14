import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OCRInterface } from '@/components/OCRInterface';

const OCR = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-gradient-secondary flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <OCRInterface />
        </div>
      </div>
    </div>
  );
};

export default OCR;

