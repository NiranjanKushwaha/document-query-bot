import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document } from '@/types/document';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

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

  async queryDocuments(query: string, documents: Document[]): Promise<{ answer: string; sources: string[] }> {
    if (!this.model) {
      throw new Error('Gemini service not initialized. Please provide a valid API key.');
    }

    try {
      // Prepare content for multimodal processing
      const contentParts: any[] = [];
      
      // Add text prompt
      const textPrompt = `
You are an AI assistant that answers questions based on provided documents. 
Answer the user's question using only the information from the documents provided.
If the answer cannot be found in the documents, say "I cannot find this information in the provided documents."

Question: ${query}

Please provide a clear and accurate answer based on the document content. If you reference specific documents, mention their names.
`;
      
      contentParts.push({ text: textPrompt });

      // Process each document
      for (const doc of documents) {
        console.log('Processing document:', doc.name, 'Type:', doc.type, 'Content length:', doc.content?.length);
        if (doc.content) {
          if (doc.type.startsWith('image/')) {
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
            }
          } else {
            // Handle text content
            console.log('Adding text content for:', doc.name, 'Content preview:', doc.content.substring(0, 200));
            contentParts.push({
              text: `\nDocument: ${doc.name}\nContent: ${doc.content}\n\n---\n`
            });
          }
        }
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

    } catch (error: any) {
      console.error('Gemini API Error:', error);
      
      if (error.message?.includes('API_KEY')) {
        throw new Error('Invalid API key. Please check your Gemini API key and try again.');
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('API quota exceeded. Please check your Gemini API usage limits.');
      } else if (error.message?.includes('RATE_LIMIT')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        throw new Error(`Failed to process your query: ${error.message || 'Unknown error occurred'}`);
      }
    }
  }

  isInitialized(): boolean {
    return this.model !== null;
  }
}

export const geminiService = new GeminiService();