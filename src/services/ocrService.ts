import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiService } from './geminiService';

export interface OCRResult {
  documentName: string;
  documentType: string;
  extractedData: Record<string, unknown>;
  rawText?: string;
  confidence?: number;
  processingTime?: number;
}

class OCRService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

  isInitialized(): boolean {
    return this.model !== null;
  }

  // Reinitialize with a new API key (useful when API key is updated)
  reinitialize(apiKey: string): boolean {
    // Clear existing model and genAI
    if (this.model) {
      this.model = null;
    }
    if (this.genAI) {
      this.genAI = null;
    }
    // Initialize with new key
    return this.initialize(apiKey);
  }

  initialize(apiKey: string): boolean {
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.1, // Lower temperature for more accurate OCR
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });
      
      // Log API key info for debugging (masked)
      const apiKeyPrefix = apiKey.substring(0, 8);
      const apiKeySuffix = apiKey.substring(apiKey.length - 4);
      console.log(`✓ Initialized OCR service with API key: ${apiKeyPrefix}...${apiKeySuffix}`);
      console.log(`💡 OCR API calls will be logged in Google AI Studio`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize OCR service:', error);
      return false;
    }
  }

  // Convert file to base64
  private async fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve({
          data: base64Data,
          mimeType: file.type || 'image/png'
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Convert image URL/Blob to base64
  private async imageToBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        const base64Data = dataURL.split(',')[1];
        resolve({
          data: base64Data,
          mimeType: 'image/png'
        });
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  // Perform OCR on a single image/document
  async performOCR(file: File | string, documentName?: string): Promise<OCRResult> {
    if (!this.model) {
      // Try to initialize from localStorage first
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
      if (apiKey) {
        const initialized = this.initialize(apiKey);
        if (!initialized) {
          // If initialization fails, try to reuse geminiService model
          if (geminiService.isInitialized()) {
            this.model = (geminiService as any).model; // eslint-disable-line @typescript-eslint/no-explicit-any
            this.genAI = (geminiService as any).genAI; // eslint-disable-line @typescript-eslint/no-explicit-any
          } else {
            throw new Error('OCR service not initialized. Please provide a valid API key.');
          }
        }
      } else if (geminiService.isInitialized()) {
        // Reuse the model from geminiService
        this.model = (geminiService as any).model; // eslint-disable-line @typescript-eslint/no-explicit-any
        this.genAI = (geminiService as any).genAI; // eslint-disable-line @typescript-eslint/no-explicit-any
      } else {
        throw new Error('OCR service not initialized. Please provide a valid API key.');
      }
    }

    const startTime = Date.now();
    const fileName = documentName || (typeof file === 'string' ? 'camera-capture' : file.name);

    try {
      // Convert to base64
      let base64Data: string;
      let mimeType: string;

      if (typeof file === 'string') {
        // It's an image URL (from camera)
        const result = await this.imageToBase64(file);
        base64Data = result.data;
        mimeType = result.mimeType;
      } else {
        // It's a File object
        const result = await this.fileToBase64(file);
        base64Data = result.data;
        mimeType = result.mimeType;
      }

      // Create OCR prompt
      const ocrPrompt = `Analyze this image/document and extract all text and structured data. Return the result as a valid JSON object.

Instructions:
1. Extract ALL visible text from the image
2. Identify and structure any data (forms, tables, lists, etc.)
3. Preserve the hierarchy and relationships in the data
4. Return ONLY valid JSON, no markdown, no code blocks
5. Include a "rawText" field with all extracted text
6. Structure other fields based on what you find (e.g., "fields", "tables", "sections", etc.)

Example structure:
{
  "rawText": "All extracted text...",
  "fields": {
    "field1": "value1",
    "field2": "value2"
  },
  "tables": [...],
  "sections": {...}
}

Extract and return the JSON now:`;

      // Call Gemini API
      const contentParts = [
        { text: ocrPrompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        }
      ];

      // Log API call for debugging
      const currentApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
      const apiKeyPrefix = currentApiKey ? currentApiKey.substring(0, 8) : 'unknown';
      console.log(`📤 Making OCR API call with key: ${apiKeyPrefix}... (this will appear in Google AI Studio logs)`);

      const result = await this.model.generateContent(contentParts);
      const response = await result.response;
      let responseText = response.text();
      
      console.log(`✓ OCR API call successful for ${fileName}`);

      // Clean up the response (remove markdown code blocks if any)
      responseText = responseText.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Parse JSON
      let extractedData: Record<string, unknown>;
      try {
        extractedData = JSON.parse(responseText);
      } catch (parseError) {
        // If JSON parsing fails, wrap the text in a simple structure
        extractedData = {
          rawText: responseText,
          error: 'Failed to parse structured JSON, returning raw text'
        };
      }

      const processingTime = Date.now() - startTime;

      return {
        documentName: fileName,
        documentType: mimeType,
        extractedData,
        rawText: typeof extractedData.rawText === 'string' ? extractedData.rawText : responseText,
        processingTime
      };

    } catch (error: unknown) {
      const errorObj = error as Error;
      const errorMessage = errorObj.message || String(error);
      
      // Get current API key prefix for debugging
      const currentApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
      const apiKeyPrefix = currentApiKey ? currentApiKey.substring(0, 8) : 'unknown';
      
      // Check for specific error types
      if (errorMessage.includes('QUOTA_EXCEEDED') || 
          errorMessage.includes('quota') || 
          errorMessage.includes('429') ||
          errorMessage.includes('RESOURCE_EXHAUSTED')) {
        throw new Error(`API quota exceeded for key starting with "${apiKeyPrefix}...". Please check your Gemini API usage limits at https://makersuite.google.com/app/apikey. If you created a new API key, please refresh the page or update the API key in settings.`);
      } else if (errorMessage.includes('API_KEY') || 
                 errorMessage.includes('401') || 
                 errorMessage.includes('403') || 
                 errorMessage.includes('permission') || 
                 errorMessage.includes('unauthorized')) {
        throw new Error('Invalid API key or insufficient permissions. Please verify your API key at https://makersuite.google.com/app/apikey');
      } else if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        throw new Error(`OCR failed for ${fileName}: ${errorMessage}`);
      }
    }
  }

  // Perform OCR on multiple documents
  async performBatchOCR(files: (File | string)[], documentNames?: string[]): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const documentName = documentNames?.[i];
      
      try {
        const result = await this.performOCR(file, documentName);
        results.push(result);
      } catch (error) {
        console.error(`OCR failed for document ${i + 1}:`, error);
        results.push({
          documentName: documentName || `document-${i + 1}`,
          documentType: typeof file === 'string' ? 'image/png' : file.type,
          extractedData: {
            error: (error as Error).message
          }
        });
      }
    }

    return results;
  }

  // Combine all OCR results into a single JSON
  combineResults(results: OCRResult[]): Record<string, unknown> {
    return {
      totalDocuments: results.length,
      processedAt: new Date().toISOString(),
      documents: results.map(result => ({
        documentName: result.documentName,
        documentType: result.documentType,
        data: result.extractedData,
        processingTime: result.processingTime
      }))
    };
  }
}

export const ocrService = new OCRService();

