import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChatMessage } from '@/types/document';

export class PDFExportService {
  static async exportChatToPDF(messages: ChatMessage[], filename?: string): Promise<void> {
    try {
      console.log('Starting PDF generation with', messages.length, 'messages');
      
      // Create a temporary container for the PDF content
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.padding = '40px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.lineHeight = '1.6';
      tempContainer.style.color = '#333333';
      tempContainer.style.fontSize = '14px';
      tempContainer.style.overflow = 'visible';
      tempContainer.style.visibility = 'visible';
      tempContainer.style.display = 'block';
      
      // Add to DOM temporarily
      document.body.appendChild(tempContainer);

      // Generate PDF content HTML
      const pdfContent = this.generatePDFContent(messages);
      console.log('Generated PDF content length:', pdfContent.length);
      tempContainer.innerHTML = pdfContent;

      // Wait a bit for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for any images to load
      await this.waitForImages(tempContainer);

      console.log('Container height:', tempContainer.scrollHeight);
      console.log('Container content:', tempContainer.innerHTML.substring(0, 200));

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 1, // Reduced scale for better compatibility
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempContainer.scrollHeight,
        logging: true, // Enable logging for debugging
        foreignObjectRendering: false // Disable for better compatibility
      });

      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Clean up
      document.body.removeChild(tempContainer);

      // Download the PDF
      const finalFilename = filename || `chat-conversation-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(finalFilename);

      console.log('PDF generated successfully');

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }

  private static generatePDFContent(messages: ChatMessage[]): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let html = `
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #6366f1; padding-bottom: 20px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: bold;">DocQuery AI</h1>
        <h2 style="color: #666; margin: 10px 0 0 0; font-size: 18px; font-weight: normal;">Chat Conversation Export</h2>
        <p style="color: #888; margin: 10px 0 0 0; font-size: 14px;">Generated on ${currentDate}</p>
      </div>
    `;

    if (messages.length === 0) {
      html += `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p style="font-size: 16px;">No messages in this conversation.</p>
        </div>
      `;
    } else {
      messages.forEach((message, index) => {
        const isUser = message.type === 'user';
        const messageTime = new Date(message.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        html += `
          <div style="margin-bottom: 25px; ${isUser ? 'text-align: right;' : 'text-align: left;'}">
            <div style="
              display: inline-block;
              max-width: 75%;
              padding: 15px 18px;
              border-radius: 15px;
              ${isUser 
                ? 'background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; margin-left: auto;' 
                : 'background: #f8fafc; color: #1f2937; border: 1px solid #e5e7eb;'
              }
              box-shadow: 0 3px 6px rgba(0,0,0,0.1);
              min-height: 40px;
            ">
              <div style="
                font-size: 15px;
                line-height: 1.6;
                white-space: pre-wrap;
                word-wrap: break-word;
                margin-bottom: 10px;
                font-weight: 400;
                ${isUser ? 'color: white;' : 'color: #1f2937;'}
              ">${this.escapeHtml(message.content)}</div>
              <div style="
                font-size: 12px;
                opacity: 0.8;
                text-align: right;
                margin-top: 10px;
                border-top: 1px solid ${isUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'};
                padding-top: 8px;
                font-weight: 500;
                ${isUser ? 'color: rgba(255,255,255,0.9);' : 'color: #6b7280;'}
              ">
                ${isUser ? 'You' : 'AI Assistant'} • ${messageTime}
              </div>
            </div>
          </div>
        `;
      });
    }

    // Add footer
    html += `
      <div style="
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        color: #888;
        font-size: 12px;
      ">
        <p>This conversation was exported from DocQuery AI - Intelligent Document Analysis</p>
        <p>For more information, visit your DocQuery AI application</p>
      </div>
    `;

    return html;
  }

  private static escapeHtml(text: string): string {
    // Properly escape HTML characters while preserving line breaks
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
  }

  private static async waitForImages(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      return new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Continue even if image fails to load
        }
      });
    });

    await Promise.all(imagePromises);
  }

  static formatFilename(messages: ChatMessage[]): string {
    const date = new Date().toISOString().split('T')[0];
    const messageCount = messages.length;
    return `docquery-chat-${date}-${messageCount}-messages.pdf`;
  }

  // Test method to verify PDF generation
  static async testPDFGeneration(): Promise<void> {
    const testMessages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Hello, this is a test message from the user.',
        timestamp: new Date()
      },
      {
        id: '2',
        type: 'assistant',
        content: 'Hello! This is a test response from the AI assistant. The PDF generation should work properly now.',
        timestamp: new Date()
      }
    ];

    console.log('Testing PDF generation with sample messages...');
    await this.exportChatToPDFDirect(testMessages, 'test-chat.pdf');
  }

  // Alternative method using jsPDF directly (fallback)
  static async exportChatToPDFDirect(messages: ChatMessage[], filename?: string): Promise<void> {
    try {
      console.log('Starting direct PDF generation with', messages.length, 'messages');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      let yPosition = margin;
      const lineHeight = 6;
      const maxWidth = pageWidth - (margin * 2);

      // Add header
      pdf.setFontSize(20);
      pdf.setTextColor(99, 102, 241); // #6366f1
      pdf.text('DocQuery AI', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(14);
      pdf.setTextColor(102, 102, 102);
      pdf.text('Chat Conversation Export', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(136, 136, 136);
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Generated on ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Add separator line
      pdf.setDrawColor(99, 102, 241);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Add messages
      if (messages.length === 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(102, 102, 102);
        pdf.text('No messages in this conversation.', pageWidth / 2, yPosition, { align: 'center' });
      } else {
        console.log('Processing messages for direct PDF...');
        messages.forEach((message, index) => {
          console.log(`Processing message ${index + 1}:`, message.content.substring(0, 50) + '...');
          
          const isUser = message.type === 'user';
          const messageTime = new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });

          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }

          // Add message content
          pdf.setFontSize(12);
          pdf.setTextColor(31, 41, 55); // Dark gray
          
          // Split content into lines that fit the page width
          const contentLines = pdf.splitTextToSize(message.content, maxWidth - 20);
          console.log(`Message ${index + 1} split into ${contentLines.length} lines`);
          
          // Add message bubble background (simplified)
          const contentHeight = contentLines.length * lineHeight + 20;
          if (isUser) {
            pdf.setFillColor(99, 102, 241); // Purple background
            pdf.roundedRect(pageWidth - margin - 150, yPosition - 5, 150, contentHeight, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255); // White text
          } else {
            pdf.setFillColor(248, 250, 252); // Light background
            pdf.roundedRect(margin, yPosition - 5, 150, contentHeight, 3, 3, 'F');
            pdf.setTextColor(31, 41, 55); // Dark text
          }

          // Add content text
          pdf.text(contentLines, isUser ? pageWidth - margin - 140 : margin + 10, yPosition + 5);
          yPosition += contentHeight + 10;

          // Add timestamp
          pdf.setFontSize(8);
          pdf.setTextColor(107, 114, 128); // Gray
          pdf.text(
            `${isUser ? 'You' : 'AI Assistant'} • ${messageTime}`,
            isUser ? pageWidth - margin - 140 : margin + 10,
            yPosition
          );
          yPosition += 15;
        });
      }

      // Add footer
      yPosition = pageHeight - 20;
      pdf.setFontSize(8);
      pdf.setTextColor(136, 136, 136);
      pdf.text('This conversation was exported from DocQuery AI - Intelligent Document Analysis', 
               pageWidth / 2, yPosition, { align: 'center' });
      pdf.text('For more information, visit your DocQuery AI application', 
               pageWidth / 2, yPosition + 5, { align: 'center' });

      // Download the PDF
      const finalFilename = filename || PDFExportService.formatFilename(messages);
      pdf.save(finalFilename);
      
      console.log('Direct PDF generated successfully');

    } catch (error) {
      console.error('Error generating PDF (direct method):', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }
}
