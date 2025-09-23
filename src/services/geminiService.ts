import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document } from '@/types/document';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

  initialize(apiKey: string) {
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

    const contextInfo = documentAnalysis.length > 0 ? 
      `\n\nDOCUMENT CONTEXT: The user is asking about ${documentAnalysis.map(d => `${d.name} (${d.context})`).join(', ')}. ` +
      `Please analyze the document content and filename to understand the context and interpret the question intelligently. ` +
      `Be smart about understanding what the user is really asking for based on the document type and content.` : '';

    return query + contextInfo;
  }

  async queryDocuments(query: string, documents: Document[]): Promise<{ answer: string; sources: string[] }> {
    if (!this.model) {
      throw new Error('Gemini service not initialized. Please provide a valid API key.');
    }

    try {
      // Preprocess the query to add context
      const enhancedQuery = this.preprocessQuery(query, documents);
      // Prepare content for multimodal processing
      const contentParts: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
      
      // Add text prompt
      const textPrompt = `
You are an intelligent document analysis AI assistant. You can ONLY answer questions about the uploaded documents provided to you.

IMPORTANT RULES:
1. You MUST only answer questions related to the content of the uploaded documents
2. If the user asks about anything NOT in the documents (math, coding, general knowledge, etc.), respond with: "I can only answer questions about the uploaded documents. Please ask me something about the content of your documents."
3. Be intelligent and understand context by analyzing:
   - Document filenames for context clues (resume, report, invoice, contract, etc.)
   - Document content structure and type
   - User's intent behind their question
4. Use semantic understanding - understand synonyms and related terms:
   - "experience" = work experience, professional experience, job experience, career history, background
   - "skills" = technical skills, abilities, competencies, expertise, capabilities
   - "education" = academic background, qualifications, degrees, certifications, training
   - "summary" = overview, brief, key points, highlights, main points
   - "data" = information, numbers, statistics, figures, results
   - "details" = specific information, particulars, specifics
5. If the answer cannot be found in the provided documents after considering synonyms and context, say "I cannot find this information in the provided documents."
6. Always base your answers strictly on the document content provided
7. Be helpful and interpret questions intelligently rather than literally
8. Analyze the document type and content to understand what kind of information it contains
9. If some documents cannot be processed (image-based PDFs, etc.), clearly explain which documents you can analyze and which you cannot, and suggest solutions

INTELLIGENT INTERPRETATION GUIDELINES:
- Analyze the document filename and content to understand its purpose
- Medical documents: "details" = patient info, diagnosis, treatment; "summary" = discharge summary
- Financial documents: "data" = amounts, transactions, balances; "summary" = financial overview
- Legal documents: "details" = terms, conditions, clauses; "summary" = key legal points
- KYC documents: "details" = personal information, identity proof; "summary" = verification status
- Business documents: "experience" = work history; "summary" = professional overview
- Technical documents: "details" = specifications, requirements; "summary" = technical overview
- Research documents: "findings" = research results; "summary" = key conclusions
- Government documents: "details" = official information; "summary" = key requirements
- Always consider the document context when interpreting questions

User's question: ${enhancedQuery}

Please provide a clear and accurate answer based ONLY on the document content. If you reference specific documents, mention their names. Consider the context and use intelligent interpretation of the question.
`;
      
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
            // Handle image content
            contentParts.push({
              text: `\nDocument: ${doc.name}\n`
            });
            
            // Extract base64 data from data URL
            const base64Data = doc.content.split(',')[1];
            
            // Validate base64 data
            if (!base64Data || base64Data.trim() === '') {
              console.error('Empty base64 data for image:', doc.name);
              // Skip this image and continue with text-only processing
              contentParts.push({
                text: `\n[Image: ${doc.name} - Failed to process image data]\n`
              });
            } else {
              // Use the file's MIME type directly
              let mimeType = doc.type;
              
              // Ensure we have a valid image MIME type
              if (!mimeType.startsWith('image/')) {
                mimeType = 'image/png'; // Default fallback
              }
              
              console.log('Processing image:', doc.name, 'MIME type:', mimeType, 'Data length:', base64Data.length);
              
              contentParts.push({
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              });
              processableDocuments.push(doc);
            }
          } else if (isProcessable) {
            // Handle text content
            console.log('Adding text content for:', doc.name, 'Content preview:', doc.content.substring(0, 200));
            contentParts.push({
              text: `\nDocument: ${doc.name}\nContent: ${doc.content}\n\n---\n`
            });
            processableDocuments.push(doc);
          } else {
            nonProcessableDocuments.push(doc);
          }
        }
      }
      
      // Add information about non-processable documents
      if (nonProcessableDocuments.length > 0) {
        contentParts.push({
          text: `\n\n📋 Document Status:\nI can analyze the following documents: ${processableDocuments.map(d => d.name).join(', ')}\n\nI cannot analyze these documents: ${nonProcessableDocuments.map(d => d.name).join(', ')} - they appear to be image-based or contain insufficient text content.\n\n`
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
      if (errorObj.message?.includes('API_KEY')) {
        throw new Error('Invalid API key. Please check your Gemini API key and try again.');
      } else if (errorObj.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('API quota exceeded. Please check your Gemini API usage limits.');
      } else if (errorObj.message?.includes('RATE_LIMIT')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        throw new Error(`Failed to process your query: ${errorObj.message || 'Unknown error occurred'}`);
      }
    }
  }

  isInitialized(): boolean {
    return this.model !== null;
  }
}

export const geminiService = new GeminiService();