# DocQuery AI 🤖📄

**Intelligent Document Analysis Powered by AI**

A modern, responsive web application that leverages Google's Gemini AI to analyze and answer questions about your documents. Upload various file types and get intelligent insights through natural language conversations.

*Created by Niranjan Kushwaha*

![DocQuery AI](https://img.shields.io/badge/AI-Powered-blue) ![React](https://img.shields.io/badge/React-18.3.1-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue) ![Vite](https://img.shields.io/badge/Vite-5.4.19-purple)

## ✨ Features

### 🔍 **Multi-Format Document Support**
- **Images**: PNG, JPG, JPEG, GIF, WebP - Visual content analysis and text extraction
- **PDFs**: Full text extraction from all pages with intelligent content analysis
- **Text Files**: TXT, MD, JSON, JS, TS, TSX, JSX - Direct content processing
- **Office Documents**: Word, Excel, PowerPoint (with conversion guidance)

### 🤖 **AI-Powered Analysis**
- **Gemini 1.5 Flash Integration**: State-of-the-art multimodal AI processing
- **Natural Language Queries**: Ask questions in plain English
- **Contextual Understanding**: AI understands document content and relationships
- **Source Attribution**: See which documents were used for each answer

### 🎨 **Modern User Interface**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Drag & Drop Upload**: Intuitive file upload with visual feedback
- **Real-time Chat**: Interactive conversation interface
- **Document Preview**: View uploaded documents before analysis
- **Dark/Light Theme**: Beautiful UI with theme support

### 🛡️ **Security & Privacy**
- **Local Processing**: Documents processed locally before sending to AI
- **API Key Management**: Secure storage of your Gemini API key
- **No Data Persistence**: Documents are not stored on external servers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/document-query-gemini-bot.git
   cd document-query-gemini-bot
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install
   
   # Or using yarn (recommended)
   yarn install
   ```

3. **Start the development server**
   ```bash
   # Using npm
   npm run dev
   
   # Or using yarn
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:8080` (or the port shown in terminal)

5. **Configure API Key**
   - Click the settings icon in the top-right corner
   - Enter your Google Gemini API key
   - Start uploading and analyzing documents!

## 📖 Usage Guide

### 1. **Upload Documents**
- Drag and drop files onto the upload area
- Or click to browse and select files
- Supported formats: Images, PDFs, Text files, Office documents

### 2. **Ask Questions**
- Type your questions in natural language
- Examples:
  - "What type of document is this?"
  - "Extract the key information from this document"
  - "What is the main topic discussed?"
  - "Summarize the content in bullet points"

### 3. **Get AI Insights**
- Receive detailed, contextual answers
- See which documents were referenced
- Ask follow-up questions for deeper analysis

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** - Modern UI framework
- **TypeScript 5.8.3** - Type-safe development
- **Vite 5.4.19** - Fast build tool and dev server
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components

### AI & Processing
- **Google Generative AI** - Gemini 1.5 Flash integration
- **PDF.js** - Client-side PDF text extraction
- **FileReader API** - Local file processing

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   ├── ApiKeyDialog.tsx
│   ├── ChatInterface.tsx
│   ├── DocumentPreview.tsx
│   └── DocumentUpload.tsx
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── pages/              # Page components
├── services/           # API and business logic
│   ├── documentService.ts
│   └── geminiService.ts
├── types/              # TypeScript type definitions
└── main.tsx           # Application entry point
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file for local development:
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### API Key Setup
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Enter it in the application settings
4. The key is stored locally in your browser

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build the project
npm run build

# Deploy the dist folder to Netlify
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Niranjan Kushwaha**
- GitHub: [@niranjankushwaha](https://github.com/niranjankushwaha)
- LinkedIn: [Niranjan Kushwaha](https://linkedin.com/in/niranjankushwaha)
- Email: niranjan.kushwaha@example.com

## 🙏 Acknowledgments

- [Google AI](https://ai.google.dev/) for the Gemini API
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Vite](https://vitejs.dev/) for the excellent development experience
- [React](https://react.dev/) team for the amazing framework

## 📊 Roadmap

### Upcoming Features
- [ ] **OCR Integration** - Extract text from image-based documents
- [ ] **Batch Processing** - Analyze multiple documents simultaneously
- [ ] **Export Results** - Download analysis results as PDF/Word
- [ ] **Document Comparison** - Compare multiple documents
- [ ] **Advanced Search** - Search across all uploaded documents
- [ ] **User Authentication** - Secure user accounts and document storage
- [ ] **API Endpoints** - RESTful API for integration
- [ ] **Mobile App** - React Native mobile application

### Known Issues
- Office document text extraction requires conversion to PDF/text
- Large files (>20MB) may take longer to process
- Password-protected PDFs cannot be processed

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature request? Please [open an issue](https://github.com/yourusername/document-query-gemini-bot/issues) with:
- Clear description of the problem/request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots (if applicable)

## 📈 Performance

- **Bundle Size**: ~2.5MB (gzipped)
- **Load Time**: <3 seconds on 3G
- **File Processing**: Supports files up to 20MB
- **AI Response Time**: 2-5 seconds depending on complexity

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

Made with ❤️ by [Niranjan Kushwaha](https://github.com/niranjankushwaha)

</div>