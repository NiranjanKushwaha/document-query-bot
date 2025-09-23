import { Document } from '@/types/document';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import Tesseract from 'tesseract.js';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
} catch (error) {
  console.warn('Failed to set local PDF.js worker, falling back to CDN');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

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
      } else if (fileType.includes('word') || fileType.includes('document')) {
        // Extract text from Word documents
        return await this.extractWordText(file);
      } else if (fileType.includes('excel') || fileType.includes('sheet')) {
        // Extract text from Excel documents
        return await this.extractExcelText(file);
      } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
        // Extract text from PowerPoint documents
        return await this.extractPowerPointText(file);
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
          console.log('Starting PDF text extraction for:', file.name);
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            console.error('Failed to read PDF file - no array buffer');
            reject(new Error('Failed to read PDF file'));
            return;
          }

          console.log('PDF file size:', arrayBuffer.byteLength, 'bytes');

          // Load PDF document
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          console.log('PDF loaded successfully, pages:', pdf.numPages);
          
          let fullText = '';

          // Extract text from each page
          for (let i = 1; i <= pdf.numPages; i++) {
            console.log(`Processing page ${i} of ${pdf.numPages}`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item) => 'str' in item ? item.str : '')
              .join(' ');
            fullText += pageText + '\n';
            console.log(`Page ${i} text length:`, pageText.length);
          }

          console.log('Total extracted text length:', fullText.length);
          console.log('Extracted text preview:', fullText.substring(0, 200));

          if (fullText.trim()) {
            resolve(`PDF Content from ${file.name}:\n\n${fullText.trim()}`);
          } else {
            console.warn('No text extracted from PDF - attempting OCR');
            // Try OCR for image-based PDFs
            try {
              const ocrText = await this.extractPdfTextWithOCR(file);
              resolve(ocrText);
            } catch (ocrError) {
              console.error('OCR failed:', ocrError);
              resolve(`PDF file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\n⚠️ This PDF appears to be image-based and OCR processing failed.\n\n💡 Suggestions:\n• Use an OCR tool (like Adobe Acrobat, Google Drive, or online OCR services) to convert the images to text\n• Convert the PDF to a text-based format\n• Take screenshots and use image-to-text tools\n\nI can only analyze text-based content, so I cannot answer questions about this document until it's converted to text.`);
            }
          }
        } catch (error: unknown) {
          console.error('Error extracting PDF text:', error);
          
          let errorMessage = `PDF file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\n`;
          
          const errorObj = error as Error;
          if (errorObj.name === 'PasswordException') {
            errorMessage += 'Note: This PDF is password-protected. Please remove the password and try again.';
          } else if (errorObj.name === 'InvalidPDFException') {
            errorMessage += 'Note: This PDF appears to be corrupted or invalid. Please try with a different PDF file.';
          } else if (errorObj.message?.includes('worker')) {
            errorMessage += 'Note: PDF processing worker failed to load. Please refresh the page and try again.';
          } else if (errorObj.message?.includes('fetch')) {
            errorMessage += 'Note: Failed to load PDF processing resources. Please check your internet connection and try again.';
          } else {
            errorMessage += `Note: Failed to extract text from this PDF. Error: ${errorObj.message || 'Unknown error occurred'}`;
          }
          
          resolve(errorMessage);
        }
      };
      reader.onerror = (e) => {
        console.error('FileReader error:', e);
        reject(e);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  private static async extractWordText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          console.log('Starting Word text extraction for:', file.name);
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read Word file'));
            return;
          }

          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          
          if (text.trim()) {
            console.log('Word text extracted successfully, length:', text.length);
            resolve(`Word Document Content from ${file.name}:\n\n${text.trim()}`);
          } else {
            console.warn('No text extracted from Word document');
            resolve(`Word file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: This Word document appears to contain no extractable text or may be image-based.`);
          }
        } catch (error: unknown) {
          console.error('Error extracting Word text:', error);
          const errorObj = error as Error;
          resolve(`Word file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: Failed to extract text from this Word document. Error: ${errorObj.message || 'Unknown error occurred'}`);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }

  private static async extractExcelText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          console.log('Starting Excel text extraction for:', file.name);
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read Excel file'));
            return;
          }

          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          let fullText = '';

          // Extract text from all sheets
          workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            fullText += `\n--- Sheet: ${sheetName} ---\n`;
            
            // Convert sheet data to readable text
            sheetData.forEach((row: unknown[], rowIndex) => {
              const rowText = row.filter(cell => cell !== '' && cell !== null && cell !== undefined)
                                .map(cell => String(cell).trim())
                                .join(' | ');
              if (rowText) {
                fullText += `Row ${rowIndex + 1}: ${rowText}\n`;
              }
            });
          });

          if (fullText.trim()) {
            console.log('Excel text extracted successfully, length:', fullText.length);
            console.log('Excel content preview:', fullText.substring(0, 500));
            resolve(`Excel Document Content from ${file.name}:\n${fullText.trim()}`);
          } else {
            console.warn('No text extracted from Excel document');
            console.log('Workbook sheets:', workbook.SheetNames);
            console.log('First sheet data:', workbook.Sheets[workbook.SheetNames[0]]);
            resolve(`Excel file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: This Excel document appears to contain no extractable data.`);
          }
        } catch (error: unknown) {
          console.error('Error extracting Excel text:', error);
          const errorObj = error as Error;
          resolve(`Excel file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: Failed to extract data from this Excel document. Error: ${errorObj.message || 'Unknown error occurred'}`);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }

  private static async extractPowerPointText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          console.log('Starting PowerPoint text extraction for:', file.name);
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read PowerPoint file'));
            return;
          }

          const zip = new JSZip();
          const zipContent = await zip.loadAsync(arrayBuffer);
          let fullText = '';

          // Extract text from slides
          const slideFiles = Object.keys(zipContent.files).filter(name => 
            name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
          );

          for (const slideFile of slideFiles) {
            const slideContent = await zipContent.files[slideFile].async('text');
            const slideNumber = slideFile.match(/slide(\d+)\.xml/)?.[1] || 'unknown';
            
            // Extract text content from XML (basic text extraction)
            const textMatches = slideContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
            if (textMatches) {
              fullText += `\n--- Slide ${slideNumber} ---\n`;
              textMatches.forEach(match => {
                const textContent = match.replace(/<[^>]*>/g, '').trim();
                if (textContent) {
                  fullText += textContent + '\n';
                }
              });
            }
          }

          if (fullText.trim()) {
            console.log('PowerPoint text extracted successfully, length:', fullText.length);
            resolve(`PowerPoint Document Content from ${file.name}:\n${fullText.trim()}`);
          } else {
            console.warn('No text extracted from PowerPoint document');
            resolve(`PowerPoint file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: This PowerPoint document appears to contain no extractable text or may be image-based.`);
          }
        } catch (error: unknown) {
          console.error('Error extracting PowerPoint text:', error);
          const errorObj = error as Error;
          resolve(`PowerPoint file: ${file.name} (${Math.round(file.size / 1024)} KB)\n\nNote: Failed to extract text from this PowerPoint document. Error: ${errorObj.message || 'Unknown error occurred'}`);
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

  private static async extractPdfTextWithOCR(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          console.log('Starting OCR processing for PDF:', file.name);
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read PDF file'));
            return;
          }

          // Load PDF document
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          console.log('PDF loaded for OCR, pages:', pdf.numPages);
          
          let fullText = '';
          const totalPages = pdf.numPages;

          // Process pages sequentially to show progress
          for (let i = 1; i <= totalPages; i++) {
            console.log(`Processing page ${i} of ${totalPages}`);
            const pageText = await this.processPageWithOCR(pdf, i, i, totalPages);
            fullText += pageText + '\n\n';
          }

          console.log('OCR completed, total text length:', fullText.length);
          
          if (fullText.trim()) {
            resolve(`PDF Content from ${file.name} (OCR Processed):\n\n${fullText.trim()}`);
          } else {
            reject(new Error('No text could be extracted with OCR'));
          }
        } catch (error: unknown) {
          console.error('Error in OCR processing:', error);
          reject(error);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }

  private static async processPageWithOCR(pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number, currentPage: number, totalPages: number): Promise<string> {
    try {
      console.log(`Processing page ${pageNumber} with OCR`);
      const page = await pdf.getPage(pageNumber);
      
      // Render page to canvas
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to image data
      const imageData = canvas.toDataURL('image/png');
      
      // Perform OCR on the image
      const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pageProgress = Math.round(m.progress * 100);
            const overallProgress = Math.round(((currentPage - 1) + m.progress) / totalPages * 100);
            console.log(`OCR Progress for page ${pageNumber}: ${pageProgress}% (Overall: ${overallProgress}%)`);
            
            // Dispatch custom event for progress tracking
            window.dispatchEvent(new CustomEvent('ocrProgress', { 
              detail: { 
                page: currentPage, 
                totalPages, 
                pageProgress, 
                overallProgress 
              } 
            }));
          }
        }
      });

      console.log(`Page ${pageNumber} OCR completed, text length:`, text.length);
      return text.trim();
    } catch (error: unknown) {
      console.error(`Error processing page ${pageNumber} with OCR:`, error);
      return `[Error processing page ${pageNumber} with OCR]`;
    }
  }
}