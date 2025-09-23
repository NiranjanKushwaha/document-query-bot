export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  file: File;
  content?: string;
  thumbnail?: string;
  uploadedAt: Date;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  relatedDocuments?: string[];
}

export interface AIResponse {
  answer: string;
  sources?: string[];
  confidence?: number;
}