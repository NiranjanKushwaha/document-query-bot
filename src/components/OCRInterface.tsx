import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, FileText, Download, X, Loader2, CheckCircle2, Eye, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { ocrService } from '@/services/ocrService';
import { OCRResult } from '@/types/document';
import { geminiService } from '@/services/geminiService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

export const OCRInterface: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<(File | string)[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [combinedJson, setCombinedJson] = useState<Record<string, unknown> | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isServiceInitialized, setIsServiceInitialized] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize OCR service
  React.useEffect(() => {
    const initializeServices = () => {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (apiKey) {
        // First try to initialize geminiService if not already initialized
        if (!geminiService.isInitialized()) {
          geminiService.initialize(apiKey);
        }
        
        // Initialize OCR service - reinitialize if already initialized to ensure we're using the latest key
        if (!ocrService.isInitialized()) {
          const initialized = ocrService.initialize(apiKey);
          if (!initialized && geminiService.isInitialized()) {
            // If direct initialization fails, try to reuse gemini service model
            (ocrService as any).model = (geminiService as any).model; // eslint-disable-line @typescript-eslint/no-explicit-any
            (ocrService as any).genAI = (geminiService as any).genAI; // eslint-disable-line @typescript-eslint/no-explicit-any
          }
        } else {
          // If already initialized, reinitialize to ensure we're using the latest API key
          ocrService.reinitialize(apiKey);
        }
        
        // Update initialization state
        setIsServiceInitialized(ocrService.isInitialized() || geminiService.isInitialized());
      } else {
        setIsServiceInitialized(false);
      }
    };

    initializeServices();
    
    // Also check periodically in case API key is added or updated
    const interval = setInterval(() => {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (apiKey) {
        // Reinitialize if services are not initialized or if we want to refresh with new key
        if (!ocrService.isInitialized() && !geminiService.isInitialized()) {
          initializeServices();
        }
      }
      setIsServiceInitialized(ocrService.isInitialized() || geminiService.isInitialized());
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Dropzone for file uploads
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles];
    const newNames = [...fileNames, ...acceptedFiles.map(f => f.name)];
    setFiles(newFiles);
    setFileNames(newNames);
    toast({
      title: "Files Added",
      description: `${acceptedFiles.length} file(s) added for OCR processing`,
    });
  }, [files, fileNames, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  // Camera capture
  const startCamera = async (facingMode: 'user' | 'environment' = cameraFacing) => {
    setIsCameraLoading(true);
    
    try {
      // Stop existing stream if any
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }

      // Get camera stream based on device type
      let stream: MediaStream;
      
      if (isMobile) {
        // Mobile: Use specified facing mode
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } else {
        // Desktop: Try user-facing first, fallback to any camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
        } catch {
          // Fallback to any available camera
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        }
      }

      if (!stream) {
        setIsCameraLoading(false);
        toast({
          title: "Camera Error",
          description: "Failed to get camera stream.",
          variant: "destructive",
        });
        return;
      }

      // Set camera stream and show camera first
      setCameraStream(stream);
      setShowCamera(true);
      setCameraFacing(facingMode);

      // Wait a bit for the video element to be rendered, then set the stream
      setTimeout(() => {
        if (!videoRef.current) {
          console.error('Video element still not available after timeout');
          setIsCameraLoading(false);
          toast({
            title: "Camera Error",
            description: "Video element not available. Please try again.",
            variant: "destructive",
          });
          return;
        }

        const video = videoRef.current;
        
        // Set stream to video element
        video.srcObject = stream;
        
        // Wait for video to be ready
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Video is playing');
              setIsCameraLoading(false);
            })
            .catch(err => {
              console.error('Error playing video:', err);
              setIsCameraLoading(false);
              toast({
                title: "Video Playback Error",
                description: "Failed to start video playback. Please try again.",
                variant: "destructive",
              });
            });
        }

        // Handle video loaded metadata
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          // Try to play again when metadata is loaded
          video.play().catch(err => {
            console.error('Error playing after metadata loaded:', err);
          });
        };

        // Handle video playing event
        video.onplaying = () => {
          console.log('Video is now playing');
          setIsCameraLoading(false);
        };

        // Handle video errors
        video.onerror = (e) => {
          console.error('Video error:', e);
          setIsCameraLoading(false);
          toast({
            title: "Video Error",
            description: "Failed to display camera feed.",
            variant: "destructive",
          });
        };
      }, 100); // Small delay to ensure video element is rendered
    } catch (error: unknown) {
      console.error('Camera error:', error);
      setIsCameraLoading(false);
      const errorMessage = (error as Error).message || 'Unknown error';
      
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        toast({
          title: "Camera Permission Denied",
          description: "Please allow camera access in your browser settings.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('no camera')) {
        toast({
          title: "No Camera Found",
          description: "No camera device found. Please connect a camera and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Camera Error",
          description: `Failed to access camera: ${errorMessage}. Please check permissions and ensure no other app is using the camera.`,
          variant: "destructive",
        });
      }
      setShowCamera(false);
    }
  };

  // Switch camera (for mobile)
  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    await startCamera(newFacing);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Check if video is ready
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        toast({
          title: "Camera Not Ready",
          description: "Please wait for the camera to load completely.",
          variant: "destructive",
        });
        return;
      }

      // Check if video has valid dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
          title: "Invalid Video",
          description: "Camera video is not ready. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const imageUrl = canvas.toDataURL('image/png');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newFiles = [...files, imageUrl];
        const newNames = [...fileNames, `camera-capture-${timestamp}.png`];
        
        setFiles(newFiles);
        setFileNames(newNames);
        
        toast({
          title: "Photo Captured",
          description: "Photo added for OCR processing",
        });

        stopCamera();
      } else {
        toast({
          title: "Capture Error",
          description: "Failed to get canvas context.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Camera Not Available",
        description: "Camera video element is not ready.",
        variant: "destructive",
      });
    }
  };

  // Remove file
  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newNames = fileNames.filter((_, i) => i !== index);
    setFiles(newFiles);
    setFileNames(newNames);
  };

  // View file preview
  const handleViewFile = (index: number) => {
    const file = files[index];
    const fileName = fileNames[index] || `File ${index + 1}`;
    
    if (typeof file === 'string') {
      // It's a camera capture (base64 URL)
      setPreviewFile({ url: file, name: fileName, type: 'image/png' });
    } else {
      // It's a File object
      const url = URL.createObjectURL(file);
      setPreviewFile({ url, name: fileName, type: file.type });
    }
  };

  // Close preview
  const handleClosePreview = () => {
    if (previewFile) {
      // Revoke object URL if it's not a base64 string
      if (!previewFile.url.startsWith('data:')) {
        URL.revokeObjectURL(previewFile.url);
      }
      setPreviewFile(null);
    }
  };

  // Cleanup camera stream on unmount
  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Process OCR
  const handleProcessOCR = async () => {
    if (files.length === 0) {
      toast({
        title: "No Files",
        description: "Please add files or capture photos first",
        variant: "destructive",
      });
      return;
    }

    if (!ocrService.isInitialized() && !geminiService.isInitialized()) {
      toast({
        title: "API Key Required",
        description: "Please configure your Gemini API key first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    setCombinedJson(null);

    try {
      // Process files one by one to show progress
      const processedResults: OCRResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        setProgress(Math.round(((i) / files.length) * 100));
        
        try {
          const result = await ocrService.performOCR(files[i], fileNames[i]);
          processedResults.push(result);
        } catch (error) {
          console.error(`OCR failed for file ${i + 1}:`, error);
          const errorMessage = (error as Error).message || String(error);
          const fileType = typeof files[i] === 'string' ? 'image/png' : (files[i] as File).type;
          
          // If quota error, suggest refreshing/reinitializing
          let displayError = errorMessage;
          if (errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED')) {
            displayError = errorMessage + '\n\nTip: If you created a new API key, please refresh the page or go to Settings to update the API key.';
          }
          
          processedResults.push({
            documentName: fileNames[i] || `document-${i + 1}`,
            documentType: fileType,
            extractedData: {
              error: displayError
            }
          });
        }
      }

      setProgress(100);
      setResults(processedResults);

      // Combine all results
      const combined = ocrService.combineResults(processedResults);
      setCombinedJson(combined);

      toast({
        title: "OCR Complete",
        description: `Successfully processed ${processedResults.length} document(s)`,
      });
    } catch (error) {
      console.error('OCR processing error:', error);
      toast({
        title: "OCR Failed",
        description: (error as Error).message || "Failed to process documents",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Download JSON
  const handleDownloadJSON = () => {
    if (!combinedJson) return;

    const jsonString = JSON.stringify(combinedJson, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "OCR results downloaded as JSON",
    });
  };

  // Clear all
  const handleClear = () => {
    setFiles([]);
    setFileNames([]);
    setResults([]);
    setCombinedJson(null);
    setProgress(0);
  };

  return (
    <div className="flex flex-col h-full min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            OCR Document Scanner
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Extract structured data from images and documents
          </p>
        </div>
        {combinedJson && (
          <Button
            onClick={handleDownloadJSON}
            className="bg-gradient-primary hover:bg-primary-hover"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Download JSON</span>
            <span className="sm:hidden">Download</span>
          </Button>
        )}
      </div>

      {/* Camera Section */}
      <Card className="p-4 sm:p-6 bg-gradient-card border-0 shadow-custom-md">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            onClick={showCamera ? stopCamera : () => startCamera()}
            variant="outline"
            className="flex-1"
            disabled={isCameraLoading}
          >
            {isCameraLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Camera...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                {showCamera ? 'Stop Camera' : 'Start Camera'}
              </>
            )}
          </Button>
          {showCamera && (
            <>
              {isMobile && (
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  className="flex-1"
                  disabled={isCameraLoading}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Switch Camera
                </Button>
              )}
              <Button
                onClick={capturePhoto}
                className="bg-gradient-primary hover:bg-primary-hover flex-1"
                disabled={isCameraLoading || !cameraStream}
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
            </>
          )}
        </div>

        {showCamera && (
          <div className="mt-4 relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-96 object-contain"
              style={{ 
                minHeight: '300px',
                display: cameraStream && !isCameraLoading ? 'block' : 'none'
              }}
              onLoadedMetadata={() => {
                console.log('Video metadata loaded in element');
                if (videoRef.current && cameraStream) {
                  videoRef.current.play().catch(err => {
                    console.error('Error playing video in onLoadedMetadata:', err);
                  });
                }
              }}
              onPlaying={() => {
                console.log('Video playing event fired');
                setIsCameraLoading(false);
              }}
              onError={(e) => {
                console.error('Video element error:', e);
                setIsCameraLoading(false);
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
            {(isCameraLoading || !cameraStream) && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50 z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>{isCameraLoading ? 'Starting camera...' : 'Camera not ready'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* File Upload Section */}
      <Card
        {...getRootProps()}
        className={`p-6 sm:p-8 border-2 border-dashed transition-all duration-300 cursor-pointer hover:shadow-custom-md ${
          isDragActive 
            ? 'border-ai-primary bg-gradient-ai' 
            : 'border-muted hover:border-ai-primary'
        }`}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? 'Drop files here' : 'Upload Documents/Images'}
            </h3>
            <p className="text-muted-foreground text-sm">
              Drag & drop files or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports Images (PNG, JPG, JPEG) and PDF files
            </p>
          </div>
        </div>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <Card className="p-4 sm:p-6 bg-gradient-card border-0 shadow-custom-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Files to Process ({files.length})</h3>
            <Button
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg gap-2"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <FileText className="w-5 h-5 text-ai-primary flex-shrink-0" />
                  <span className="text-sm truncate">{fileNames[index] || `File ${index + 1}`}</span>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewFile(index)}
                    className="hover:bg-ai-primary hover:text-white"
                    title="View file"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Process Button */}
      {files.length > 0 && !isProcessing && (
        <Button
          onClick={handleProcessOCR}
          className="w-full bg-gradient-primary hover:bg-primary-hover text-lg py-6"
          size="lg"
        >
          <FileText className="w-5 h-5 mr-2" />
          Process OCR ({files.length} {files.length === 1 ? 'document' : 'documents'})
        </Button>
      )}

      {/* Progress */}
      {isProcessing && (
        <Card className="p-4 sm:p-6 bg-gradient-card border-0 shadow-custom-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processing OCR...</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Extracting text and structured data from documents...</span>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && !isProcessing && (
        <Card className="p-4 sm:p-6 bg-gradient-card border-0 shadow-custom-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                OCR Results ({results.length} {results.length === 1 ? 'document' : 'documents'})
              </h3>
            </div>

            {/* Individual Results */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{result.documentName}</span>
                    {result.processingTime && (
                      <span className="text-xs text-muted-foreground">
                        {result.processingTime}ms
                      </span>
                    )}
                  </div>
                  <pre className="text-xs overflow-x-auto bg-background p-2 rounded max-h-32 overflow-y-auto">
                    {JSON.stringify(result.extractedData, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Combined JSON */}
      {combinedJson && (
        <Card className="p-4 sm:p-6 bg-gradient-card border-0 shadow-custom-md">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Combined JSON Result</h3>
            <pre className="text-xs sm:text-sm overflow-x-auto bg-background p-3 sm:p-4 rounded-lg max-h-96 overflow-y-auto border">
              {JSON.stringify(combinedJson, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      {/* API Key Warning */}
      {!isServiceInitialized && (
        <Alert className="border-ai-warning bg-ai-warning/10">
          <AlertDescription>
            Please configure your Gemini API key in settings to use OCR features.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-ai-primary flex-shrink-0" />
              <span className="truncate">{previewFile?.name || 'Preview'}</span>
            </DialogTitle>
          </DialogHeader>

          {previewFile && (
            <div className="mt-4">
              {previewFile.type.startsWith('image/') || previewFile.url.startsWith('data:image') ? (
                <div className="flex items-center justify-center p-2 sm:p-4 bg-muted/30 rounded-lg min-h-[200px]">
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-custom-md"
                    onError={(e) => {
                      console.error('Image load error:', e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-center text-muted-foreground p-4';
                      errorDiv.textContent = 'Failed to load image preview';
                      target.parentElement?.appendChild(errorDiv);
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully');
                    }}
                  />
                </div>
              ) : previewFile.type.includes('pdf') || previewFile.url.includes('.pdf') ? (
                <div className="bg-muted/30 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 border-b gap-2">
                    <span className="text-xs sm:text-sm font-medium">PDF Preview</span>
                  </div>
                  <div className="relative">
                    <iframe
                      src={previewFile.url}
                      className="w-full h-[70vh] border-0"
                      title={`Preview of ${previewFile.name}`}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-muted-foreground">Preview not available for this file type</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

