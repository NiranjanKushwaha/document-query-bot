import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document } from '@/types/document';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  private modelName: string = 'gemini-2.0-flash-exp'; // Default model that works with v1beta

  initialize(apiKey: string) {
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      
      // Use gemini-2.0-flash-exp as default since it works with v1beta API
      // This model is fast, efficient, and supports multimodal (images + text)
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192, // Good balance for document queries
        }
      });
      this.modelName = 'gemini-2.0-flash-exp';
      
      // Log API key info for debugging (masked)
      const apiKeyPrefix = apiKey.substring(0, 8);
      const apiKeySuffix = apiKey.substring(apiKey.length - 4);
      console.log(`✓ Initialized Gemini service with model: ${this.modelName}`);
      console.log(`✓ Using API key: ${apiKeyPrefix}...${apiKeySuffix}`);
      console.log(`💡 API calls will be logged in Google AI Studio (may take a few minutes to appear)`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini:', error);
      return false;
    }
  }

  private preprocessQuery(query: string, documents: Document[]): string {
    // Analyze document names and types to provide intelligent context
    const documentAnalysis = documents.map(doc => {
      const fileName = doc.name.toLowerCase();
      const fileType = doc.type.toLowerCase();
      
      // Analyze filename for context clues - Comprehensive document type detection
      const contextClues = [];
      
      // Medical & Healthcare Documents
      if (fileName.includes('discharge') || fileName.includes('summary') || fileName.includes('medical')) contextClues.push('medical');
      if (fileName.includes('hospital') || fileName.includes('clinic') || fileName.includes('healthcare')) contextClues.push('healthcare');
      if (fileName.includes('prescription') || fileName.includes('medicine') || fileName.includes('drug')) contextClues.push('prescription');
      if (fileName.includes('lab') || fileName.includes('test') || fileName.includes('diagnosis')) contextClues.push('lab-report');
      if (fileName.includes('insurance') || fileName.includes('claim') || fileName.includes('coverage')) contextClues.push('insurance');
      
      // Financial Documents
      if (fileName.includes('invoice') || fileName.includes('bill') || fileName.includes('receipt')) contextClues.push('financial');
      if (fileName.includes('bank') || fileName.includes('statement') || fileName.includes('account')) contextClues.push('banking');
      if (fileName.includes('tax') || fileName.includes('return') || fileName.includes('filing')) contextClues.push('tax');
      if (fileName.includes('salary') || fileName.includes('payroll') || fileName.includes('wage')) contextClues.push('payroll');
      if (fileName.includes('budget') || fileName.includes('expense') || fileName.includes('cost')) contextClues.push('budget');
      if (fileName.includes('audit') || fileName.includes('financial') || fileName.includes('accounting')) contextClues.push('accounting');
      
      // Legal Documents
      if (fileName.includes('contract') || fileName.includes('agreement') || fileName.includes('terms')) contextClues.push('legal');
      if (fileName.includes('court') || fileName.includes('judgment') || fileName.includes('order')) contextClues.push('court');
      if (fileName.includes('patent') || fileName.includes('trademark') || fileName.includes('copyright')) contextClues.push('intellectual-property');
      if (fileName.includes('policy') || fileName.includes('procedure') || fileName.includes('guidelines')) contextClues.push('policy');
      
      // Identity & KYC Documents
      if (fileName.includes('kyc') || fileName.includes('ckyc') || fileName.includes('identity')) contextClues.push('kyc');
      if (fileName.includes('passport') || fileName.includes('visa') || fileName.includes('travel')) contextClues.push('travel');
      if (fileName.includes('aadhar') || fileName.includes('pan') || fileName.includes('voter')) contextClues.push('government-id');
      if (fileName.includes('license') || fileName.includes('permit') || fileName.includes('certificate')) contextClues.push('certificate');
      
      // Business Documents
      if (fileName.includes('resume') || fileName.includes('cv') || fileName.includes('profile')) contextClues.push('resume/cv');
      if (fileName.includes('proposal') || fileName.includes('plan') || fileName.includes('strategy')) contextClues.push('business');
      if (fileName.includes('meeting') || fileName.includes('minutes') || fileName.includes('agenda')) contextClues.push('meeting');
      if (fileName.includes('memo') || fileName.includes('notice') || fileName.includes('announcement')) contextClues.push('corporate');
      
      // Technical Documents
      if (fileName.includes('manual') || fileName.includes('guide') || fileName.includes('instruction')) contextClues.push('instructional');
      if (fileName.includes('specification') || fileName.includes('requirement') || fileName.includes('design')) contextClues.push('technical');
      if (fileName.includes('code') || fileName.includes('script') || fileName.includes('program')) contextClues.push('code');
      if (fileName.includes('log') || fileName.includes('error') || fileName.includes('debug')) contextClues.push('system-log');
      
      // Research & Academic Documents
      if (fileName.includes('research') || fileName.includes('study') || fileName.includes('thesis')) contextClues.push('research');
      if (fileName.includes('paper') || fileName.includes('article') || fileName.includes('publication')) contextClues.push('academic');
      if (fileName.includes('report') || fileName.includes('analysis') || fileName.includes('findings')) contextClues.push('report');
      if (fileName.includes('survey') || fileName.includes('questionnaire') || fileName.includes('feedback')) contextClues.push('survey');
      
      // Communication Documents
      if (fileName.includes('email') || fileName.includes('mail') || fileName.includes('message')) contextClues.push('communication');
      if (fileName.includes('letter') || fileName.includes('correspondence') || fileName.includes('formal')) contextClues.push('correspondence');
      if (fileName.includes('presentation') || fileName.includes('slides') || fileName.includes('deck')) contextClues.push('presentation');
      if (fileName.includes('newsletter') || fileName.includes('bulletin') || fileName.includes('update')) contextClues.push('newsletter');
      
      // Real Estate Documents
      if (fileName.includes('property') || fileName.includes('lease') || fileName.includes('rental')) contextClues.push('real-estate');
      if (fileName.includes('mortgage') || fileName.includes('loan') || fileName.includes('credit')) contextClues.push('loan');
      if (fileName.includes('deed') || fileName.includes('title') || fileName.includes('ownership')) contextClues.push('property-document');
      
      // Educational Documents
      if (fileName.includes('transcript') || fileName.includes('marksheet') || fileName.includes('grade')) contextClues.push('academic-record');
      if (fileName.includes('diploma') || fileName.includes('degree') || fileName.includes('qualification')) contextClues.push('education');
      if (fileName.includes('syllabus') || fileName.includes('curriculum') || fileName.includes('course')) contextClues.push('educational-content');
      
      // Government Documents
      if (fileName.includes('government') || fileName.includes('official') || fileName.includes('public')) contextClues.push('government');
      if (fileName.includes('form') || fileName.includes('application') || fileName.includes('request')) contextClues.push('application');
      if (fileName.includes('permit') || fileName.includes('license') || fileName.includes('authorization')) contextClues.push('permit');
      
      // Marketing Documents
      if (fileName.includes('marketing') || fileName.includes('advertisement') || fileName.includes('promotion')) contextClues.push('marketing');
      if (fileName.includes('brochure') || fileName.includes('flyer') || fileName.includes('leaflet')) contextClues.push('marketing-material');
      if (fileName.includes('catalog') || fileName.includes('catalogue') || fileName.includes('inventory')) contextClues.push('catalog');
      
      // Analyze file type
      let typeContext = '';
      if (fileType.includes('excel') || fileType.includes('sheet')) typeContext = 'spreadsheet/data';
      else if (fileType.includes('word') || fileType.includes('document')) typeContext = 'text document';
      else if (fileType.includes('pdf')) typeContext = 'PDF document';
      else if (fileType.includes('presentation') || fileType.includes('powerpoint')) typeContext = 'presentation';
      else if (fileType.includes('image')) typeContext = 'image';
      
      return {
        name: doc.name,
        type: typeContext,
        context: contextClues.length > 0 ? contextClues.join(', ') : 'general document'
      };
    });

    // Concise context info for token efficiency
    const contextInfo = documentAnalysis.length > 0 ? 
      `\nContext: ${documentAnalysis.map(d => `${d.name} (${d.context})`).join(', ')}. Interpret question based on document type.` : '';

    return query + contextInfo;
  }

  async queryDocuments(query: string, documents: Document[]): Promise<{ answer: string; sources: string[] }> {
    if (!this.model) {
      throw new Error('Gemini service not initialized. Please provide a valid API key.');
    }

    // Log API call for debugging
    const currentApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
    const apiKeyPrefix = currentApiKey ? currentApiKey.substring(0, 8) : 'unknown';
    console.log(`📤 Making API call with key: ${apiKeyPrefix}... (this will appear in Google AI Studio logs)`);

    // Preprocess the query to add context
    const enhancedQuery = this.preprocessQuery(query, documents);
    // Prepare content for multimodal processing - defined outside try for retry logic
    const contentParts: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

    try {
      
      // Add concise, token-efficient prompt
      const textPrompt = `Analyze the uploaded documents and answer ONLY based on their content.

Rules:
- Answer ONLY questions about the documents. If asked about general knowledge, say: "I can only answer questions about the uploaded documents."
- Understand context from filenames and content type (medical, financial, legal, etc.)
- Use synonyms: "summary"="overview/key points", "details"="specifics", "experience"="work history", "data"="numbers/figures"
- If information isn't found, say: "I cannot find this information in the provided documents."
- Interpret questions intelligently based on document type

Question: ${enhancedQuery}

Provide a clear answer based ONLY on the document content. Mention document names when referencing them.`;
      
      contentParts.push({ text: textPrompt });

      // Process each document
      const processableDocuments = [];
      const nonProcessableDocuments = [];
      
      for (const doc of documents) {
        console.log('Processing document:', doc.name, 'Type:', doc.type, 'Content length:', doc.content?.length);
        if (doc.content) {
          // Check if this is a processable document (has meaningful text content)
          const isImageBasedPDF = doc.type.includes('pdf') && doc.content.includes('⚠️ This PDF appears to be image-based');
          const isProcessable = !isImageBasedPDF && doc.content.length > 100; // Minimum content length
          
          if (isImageBasedPDF) {
            nonProcessableDocuments.push(doc);
          } else if (doc.type.startsWith('image/')) {
            // Handle image content - optimized format
            const base64Data = doc.content.split(',')[1];
            
            if (!base64Data || base64Data.trim() === '') {
              console.error('Empty base64 data for image:', doc.name);
              contentParts.push({ text: `\n[${doc.name} - Image processing failed]\n` });
            } else {
              const mimeType = doc.type.startsWith('image/') ? doc.type : 'image/png';
              console.log('Processing image:', doc.name, 'MIME type:', mimeType);
              
              contentParts.push({
                text: `\n[${doc.name}]\n`
              });
              contentParts.push({
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              });
              processableDocuments.push(doc);
            }
          } else if (isProcessable) {
            // Handle text content - optimized format for token efficiency
            console.log('Adding text content for:', doc.name, 'Content preview:', doc.content.substring(0, 200));
            contentParts.push({
              text: `\n[${doc.name}]\n${doc.content}\n`
            });
            processableDocuments.push(doc);
          } else {
            nonProcessableDocuments.push(doc);
          }
        }
      }
      
      // Add concise info about non-processable documents
      if (nonProcessableDocuments.length > 0) {
        contentParts.push({
          text: `\nNote: Cannot analyze ${nonProcessableDocuments.map(d => d.name).join(', ')} - image-based or insufficient text.\n`
        });
      }

      if (contentParts.length === 1) {
        throw new Error('No readable document content found. Please upload documents with text or image content.');
      }

      const result = await this.model.generateContent(contentParts);
      const response = await result.response;
      const answer = response.text();

      // Extract document names that were likely used in the response
      const sources = documents
        .filter(doc => answer.toLowerCase().includes(doc.name.toLowerCase()))
        .map(doc => doc.name);

      return {
        answer: answer || 'I apologize, but I could not generate a response. Please try rephrasing your question.',
        sources: sources.length > 0 ? sources : documents.map(doc => doc.name)
      };

    } catch (error: unknown) {
      console.error('Gemini API Error:', error);
      
      const errorObj = error as Error;
      const errorMessage = errorObj.message || '';
      
      // Handle 404 errors - model not found
      if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('is not found')) {
        // Check if we need multimodal support (images)
        const hasImages = documents.some(doc => doc.type.startsWith('image/'));
        
        // Try alternative models in order of preference
        // Models that work with v1beta API version
        const fallbackModels = [
          'gemini-1.5-flash',      // Fast model (fallback)
          'gemini-1.5-pro',        // Capable model (fallback)
          'gemini-pro'             // Legacy model (may not work with v1beta)
        ];
        
        if (this.genAI) {
          for (const fallbackModel of fallbackModels) {
            // Skip if we're already using this model
            if (fallbackModel === this.modelName) {
              continue;
            }
            
            console.log(`Model ${this.modelName} not available, trying ${fallbackModel}...`);
            try {
              this.model = this.genAI.getGenerativeModel({ 
                model: fallbackModel,
                generationConfig: {
                  temperature: 0.7,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 8192,
                }
              });
              this.modelName = fallbackModel;
              
              // Retry the request with the new model
              const result = await this.model.generateContent(contentParts);
              const response = await result.response;
              const answer = response.text();

              const sources = documents
                .filter(doc => answer.toLowerCase().includes(doc.name.toLowerCase()))
                .map(doc => doc.name);

              console.log(`Successfully used model: ${fallbackModel}`);
              return {
                answer: answer || 'I apologize, but I could not generate a response. Please try rephrasing your question.',
                sources: sources.length > 0 ? sources : documents.map(doc => doc.name)
              };
            } catch (retryError) {
              const retryErrorMsg = (retryError as Error).message || '';
              console.warn(`Model ${fallbackModel} also failed:`, retryErrorMsg);
              // Continue to next model
              continue;
            }
          }
        }
        
        // If all predefined models failed, try to discover a working model
        console.log('All predefined models failed, attempting model discovery...');
        const workingModel = await this.discoverWorkingModel();
        
        if (workingModel && this.genAI) {
          console.log(`Found working model: ${workingModel}, retrying query...`);
          try {
            this.model = this.genAI.getGenerativeModel({ 
              model: workingModel,
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              }
            });
            this.modelName = workingModel;
            
            // Retry the request with the discovered model
            const result = await this.model.generateContent(contentParts);
            const response = await result.response;
            const answer = response.text();

            const sources = documents
              .filter(doc => answer.toLowerCase().includes(doc.name.toLowerCase()))
              .map(doc => doc.name);

            console.log(`Successfully used discovered model: ${workingModel}`);
            return {
              answer: answer || 'I apologize, but I could not generate a response. Please try rephrasing your question.',
              sources: sources.length > 0 ? sources : documents.map(doc => doc.name)
            };
          } catch (discoveryError) {
            console.error('Even discovered model failed:', discoveryError);
          }
        }
        
        // If all models failed including discovery
        console.error('All model fallbacks and discovery failed. Original error:', errorMessage);
        throw new Error(`Unable to access any Gemini models. Please verify:\n1. Your API key is valid and has model access\n2. Your API key has not been revoked\n3. Check https://makersuite.google.com/app/apikey for API key status\n4. Try updating @google/generative-ai package: npm install @google/generative-ai@latest\n\nOriginal error: ${errorMessage}`);
      } else if (errorMessage.includes('API_KEY') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        throw new Error('Invalid API key or insufficient permissions. Please:\n1. Verify your API key at https://makersuite.google.com/app/apikey\n2. Ensure the API key is enabled for Generative AI\n3. Check that your API key has not been revoked or expired');
      } else if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        // Get current API key prefix for debugging
        const currentApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
        const apiKeyPrefix = currentApiKey ? currentApiKey.substring(0, 8) : 'unknown';
        throw new Error(`API quota exceeded for key starting with "${apiKeyPrefix}...". Please check your Gemini API usage limits at https://makersuite.google.com/app/apikey. If you created a new API key, please refresh the page or update the API key in settings.`);
      } else if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        // For any other error, provide detailed information
        throw new Error(`Failed to process your query: ${errorMessage}\n\nIf this persists, please:\n1. Check your API key is valid\n2. Verify you have access to Gemini models\n3. Check https://makersuite.google.com/app/apikey for API key status`);
      }
    }
  }

  isInitialized(): boolean {
    return this.model !== null;
  }

  // Test if the API key and model are working
  async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    if (!this.model || !this.genAI) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      // Try a simple test query
      const testResult = await this.model.generateContent('Say "test" if you can hear me.');
      const response = await testResult.response;
      const text = response.text();
      
      if (text && text.length > 0) {
        return { success: true, model: this.modelName };
      } else {
        return { success: false, error: 'Empty response from model' };
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      return { success: false, error: errorObj.message || 'Unknown error' };
    }
  }

  // Try to find a working model by testing multiple options
  async discoverWorkingModel(): Promise<string | null> {
    if (!this.genAI) {
      return null;
    }

    // List of models to try, ordered by likelihood of working with v1beta
    const modelsToTry = [
      'gemini-2.0-flash-exp',  // This is what actually works
      'gemini-1.5-flash', 
      'gemini-1.5-pro',
      'gemini-pro'
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`Testing model: ${modelName}...`);
        const testModel = this.genAI.getGenerativeModel({ model: modelName });
        // Try a minimal test
        await testModel.generateContent('test');
        console.log(`✓ Model ${modelName} works!`);
        return modelName;
      } catch (error) {
        console.log(`✗ Model ${modelName} failed:`, (error as Error).message);
        continue;
      }
    }

    return null;
  }
}

export const geminiService = new GeminiService();