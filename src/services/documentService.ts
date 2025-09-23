import { Document } from '@/types/document';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class DocumentService {
  static async extractTextContent(file: File): Promise<string> {
    const fileType = file.type.toLowerCase();
    
    try {
      if (fileType.includes('text') || fileType.includes('javascript') || fileType.includes('json')) {
        return await this.readTextFile(file);
      } else if (fileType.includes('pdf')) {
        // Extract text from PDF files
        return await this.extractPdfText(file);
      } else if (fileType.includes('image')) {
        // Convert image to base64 for Gemini processing
        return await this.convertImageToBase64(file);
      } else if (fileType.includes('word') || fileType.includes('document') || 
                 fileType.includes('excel') || fileType.includes('sheet') ||
                 fileType.includes('presentation') || fileType.includes('powerpoint')) {
        // For Office documents, provide a helpful message
        return `Office document: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: Office document text extraction is not yet implemented. Please convert to PDF or text format for full content analysis.`;
      } else {
        return `Document: ${file.name} (${Math.round(file.size / 1024)} KB) - Content extraction not supported for this file type`;
      }
    } catch (error) {
      console.error('Error extracting content:', error);
      return `Error reading file: ${file.name}`;
    }
  }

  private static async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  private static async convertImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Return the base64 data URL for Gemini processing
          resolve(result);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  private static async extractPdfText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read PDF file'));
            return;
          }

          // Load PDF document
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';

          // Extract text from each page
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }

          if (fullText.trim()) {
            resolve(`PDF Content from ${file.name}:\n\n${fullText.trim()}`);
          } else {
            resolve(`PDF file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: This PDF appears to be image-based or contains no extractable text. Consider using an OCR tool to convert images to text.`);
          }
        } catch (error) {
          console.error('Error extracting PDF text:', error);
          resolve(`PDF file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: Failed to extract text from this PDF. The file may be corrupted or password-protected.`);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }

  static generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.readAsDataURL(file);
      } else {
        // Generate a placeholder based on file type
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d')!;
        
        // Background
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, 0, 100, 100);
        
        // File extension
        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ext, 50, 55);
        
        resolve(canvas.toDataURL());
      }
    });
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFileIcon(fileType: string): string {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📝';
    if (fileType.includes('word') || fileType.includes('document')) return '📄';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
    return '📁';
  }
}