import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DragDropUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileUpload,
  accept = 'image/*',
  maxSize = 10,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file (PNG, JPG, JPEG)';
    }
    
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }
    
    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setUploadStatus('error');
      return;
    }

    setError('');
    setFileName(file.name);
    setIsUploading(true);
    setUploadStatus('idle');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      await onFileUpload(file);
      setUploadStatus('success');
    } catch (error) {
      setUploadStatus('error');
      setError('Failed to analyze image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload, maxSize]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const clearUpload = () => {
    setPreview(null);
    setFileName('');
    setUploadStatus('idle');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`w-full ${className}`}>
      <motion.div
        className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
          isDragOver
            ? 'border-purple-500 bg-purple-500/10'
            : uploadStatus === 'success'
            ? 'border-green-500 bg-green-500/10'
            : uploadStatus === 'error'
            ? 'border-red-500 bg-red-500/10'
            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4"
            >
              <div className="relative">
                <img
                  src={preview}
                  alt="Upload preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={clearUpload}
                  className="absolute top-2 right-2 p-1 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300 truncate">{fileName}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isUploading && (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  )}
                  {uploadStatus === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  {uploadStatus === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center cursor-pointer"
              onClick={openFileDialog}
            >
              <motion.div
                animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                className="mb-4"
              >
                <Upload className={`w-12 h-12 mx-auto ${
                  isDragOver ? 'text-purple-400' : 'text-slate-400'
                }`} />
              </motion.div>
              
              <h3 className="text-lg font-medium text-white mb-2">
                {isDragOver ? 'Drop your image here' : 'Upload Trading Screenshot'}
              </h3>
              
              <p className="text-slate-400 text-sm mb-4">
                Drag and drop your trading screenshot here, or click to browse
              </p>
              
              <div className="text-xs text-slate-500">
                Supports PNG, JPG, JPEG • Max {maxSize}MB
              </div>
              
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center justify-center space-x-2 text-purple-400"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing screenshot...</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DragDropUpload;