import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Type, Image as ImageIcon, Loader2, Send, X, File, Clipboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const errorToastStyle = {
  border: '2px solid black',
  padding: '16px',
  color: '#000',
  fontWeight: 'bold',
  background: '#ff6b6b',
};

const showErrorToast = (message) => {
  toast.error(message, { style: errorToastStyle });
};

export default function InputSection({ onSave, isUploading }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('text');
  const [previews, setPreviews] = useState([]);
  const [filesToUpload, setFilesToUpload] = useState([]);

  // Revoke object URLs when they are replaced or when the component unmounts
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const validateFileSize = useCallback((file) => {
    if (file.size > MAX_FILE_SIZE) {
      const displayName = file.name || 'clipboard image';
      showErrorToast(`FILE ${displayName} TOO LARGE! MAX 10MB`);
      return false;
    }
    return true;
  }, []);

  const handleFilesSelect = useCallback((files, newMode) => {
    const validFiles = files.filter(validateFileSize);
    if (validFiles.length === 0) return;

    setMode(newMode);
    setFilesToUpload(validFiles);
    
    if (newMode === 'image') {
      setPreviews(validFiles.map(file => URL.createObjectURL(file)));
    } else {
      setPreviews([]);
    }
  }, [validateFileSize]);

  const onDropImage = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      handleFilesSelect(acceptedFiles, 'image');
    }
  }, [handleFilesSelect]);

  const onDropFile = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      handleFilesSelect(acceptedFiles, 'file');
    }
  }, [handleFilesSelect]);

  const onDropRejected = useCallback((fileRejections) => {
    const rejection = fileRejections[0];
    if (rejection) {
      const error = rejection.errors[0];
      if (error?.code === 'file-too-large') {
        showErrorToast('FILE TOO LARGE! MAX 10MB');
      } else if (error?.code === 'file-invalid-type') {
        showErrorToast('INVALID FILE TYPE');
      }
    }
  }, []);

  const imageDropzone = useDropzone({ 
    onDrop: onDropImage,
    onDropRejected,
    accept: {
      'image/*': []
    },
    maxSize: MAX_FILE_SIZE
  });

  const fileDropzone = useDropzone({ 
    onDrop: onDropFile,
    onDropRejected,
    maxSize: MAX_FILE_SIZE
  });

  const handleSubmit = async () => {
    if (mode === 'text' && !text.trim()) return;
    if ((mode === 'image' || mode === 'file') && filesToUpload.length === 0) return;

    try {
      await onSave({ type: mode, content: text, files: filesToUpload });
      setText('');
      setMode('text');
    } finally {
      previews.forEach(url => URL.revokeObjectURL(url));
      setPreviews([]);
      setFilesToUpload([]);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (validateFileSize(blob)) {
          files.push(blob);
        }
      }
    }
    if (files.length > 0) {
      handleFilesSelect(files, 'image');
      e.preventDefault();
    }
  };

  const handlePasteButton = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files = [];
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            if (validateFileSize(blob)) {
              files.push(blob);
            }
          }
        }
      }
      if (files.length > 0) {
        handleFilesSelect(files, 'image');
      } else {
        showErrorToast('NO IMAGE IN CLIPBOARD');
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      showErrorToast('CLIPBOARD ACCESS DENIED');
    }
  };

  const clearFiles = () => {
    previews.forEach(url => URL.revokeObjectURL(url));
    setPreviews([]);
    setFilesToUpload([]);
  };

  const getTotalSize = () => {
    return filesToUpload.reduce((acc, file) => acc + file.size, 0);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-16 relative z-10">
      <div className="bg-white border-4 border-black shadow-neo p-4 sm:p-6">
        <div className="flex gap-2 sm:gap-4 mb-6">
          <button 
            onClick={() => setMode('text')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 py-3 sm:py-4 text-sm sm:text-lg font-bold border-2 border-black transition-all",
              mode === 'text' 
                ? "bg-neo-yellow shadow-neo -translate-y-1" 
                : "bg-white hover:bg-gray-50"
            )}
          >
            <Type size={18} className="shrink-0" /> 
            <span className="hidden sm:inline">TEXT</span>
            <span className="sm:hidden">TXT</span>
          </button>
          <button 
            onClick={() => setMode('image')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 py-3 sm:py-4 text-sm sm:text-lg font-bold border-2 border-black transition-all",
              mode === 'image' 
                ? "bg-neo-pink text-white shadow-neo -translate-y-1" 
                : "bg-white hover:bg-gray-50"
            )}
          >
            <ImageIcon size={18} className="shrink-0" /> 
            <span className="hidden sm:inline">IMAGE</span>
            <span className="sm:hidden">IMG</span>
          </button>
          <button 
            onClick={() => setMode('file')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 py-3 sm:py-4 text-sm sm:text-lg font-bold border-2 border-black transition-all",
              mode === 'file' 
                ? "bg-neo-blue text-white shadow-neo -translate-y-1" 
                : "bg-white hover:bg-gray-50"
            )}
          >
            <File size={18} className="shrink-0" /> 
            <span>FILE</span>
          </button>
        </div>

        <div className="relative min-h-[150px] sm:min-h-[200px] mb-6">
          <AnimatePresence mode="wait">
            {mode === 'text' ? (
              <motion.div
                key="text-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="TYPE SOMETHING HERE..."
                  className="w-full h-[150px] sm:h-[200px] neo-input resize-none font-mono"
                  autoFocus
                />
              </motion.div>
            ) : mode === 'image' ? (
              <motion.div
                key="image-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-[150px] sm:h-[200px]"
              >
                {filesToUpload.length > 0 ? (
                  <div className="relative h-full w-full flex items-center justify-center bg-gray-100 border-2 border-black border-dashed overflow-hidden">
                    {filesToUpload.length < 3 ? (
                      <div className="flex gap-2 p-4 h-full w-full overflow-x-auto">
                        {previews.map((src, i) => (
                          <img key={i} src={src} alt={`Preview ${i}`} className="h-full object-contain flex-1" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-neo-pink border-2 border-black shadow-neo-sm flex items-center justify-center mb-3 rounded-full">
                          <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                        <p className="font-black text-xl">{filesToUpload.length} IMAGES SELECTED</p>
                      </div>
                    )}
                    <button 
                      onClick={clearFiles}
                      className="absolute top-4 right-4 bg-red-500 border-2 border-black p-2 text-white hover:bg-red-600 shadow-neo-sm z-10"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="h-full w-full flex flex-col gap-2 sm:gap-4">
                    <div 
                      {...imageDropzone.getRootProps()} 
                      className={clsx(
                        "flex-1 flex flex-col items-center justify-center cursor-pointer border-4 border-dashed border-black transition-all bg-gray-50",
                        imageDropzone.isDragActive ? "bg-neo-blue/20" : "hover:bg-gray-100"
                      )}
                    >
                      <input {...imageDropzone.getInputProps()} />
                      <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white border-2 border-black shadow-neo-sm flex items-center justify-center mb-1 sm:mb-3 rounded-full">
                        <Upload className="w-5 h-5 sm:w-8 sm:h-8 text-black" />
                      </div>
                      <p className="text-black font-bold text-sm sm:text-lg uppercase text-center">Drop images here</p>
                      <p className="text-gray-500 font-mono text-[10px] sm:text-sm mt-1 text-center">or click to browse (max 10MB each)</p>
                    </div>
                    <button
                      onClick={handlePasteButton}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-bold border-2 border-black bg-neo-green hover:bg-neo-yellow transition-all shadow-neo-sm"
                    >
                      <Clipboard size={18} className="shrink-0" />
                      <span className="hidden sm:inline">PASTE FROM CLIPBOARD</span>
                      <span className="sm:hidden">PASTE</span>
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="file-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-[150px] sm:h-[200px]"
              >
                {filesToUpload.length > 0 ? (
                  <div className="relative h-full w-full flex flex-col items-center justify-center bg-gray-100 border-2 border-black border-dashed p-4">
                    <div className="w-16 h-16 bg-neo-blue border-2 border-black shadow-neo-sm flex items-center justify-center mb-3 rounded-full">
                      <File className="w-8 h-8 text-white" />
                    </div>
                    {filesToUpload.length === 1 ? (
                      <>
                        <p className="text-black font-bold text-lg text-center break-all px-4">{filesToUpload[0].name}</p>
                        <p className="text-gray-500 font-mono text-sm mt-1">{(filesToUpload[0].size / 1024 / 1024).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <p className="text-black font-bold text-lg text-center">{filesToUpload.length} FILES SELECTED</p>
                    )}
                    <button 
                      onClick={clearFiles}
                      className="absolute top-4 right-4 bg-red-500 border-2 border-black p-2 text-white hover:bg-red-600 shadow-neo-sm"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div 
                    {...fileDropzone.getRootProps()} 
                    className={clsx(
                      "h-full w-full flex flex-col items-center justify-center cursor-pointer border-4 border-dashed border-black transition-all bg-gray-50 p-4",
                      fileDropzone.isDragActive ? "bg-neo-blue/20" : "hover:bg-gray-100"
                    )}
                  >
                    <input {...fileDropzone.getInputProps()} />
                    <div className="w-12 h-12 sm:w-20 sm:h-20 bg-white border-2 border-black shadow-neo-sm flex items-center justify-center mb-2 sm:mb-4 rounded-full">
                      <File className="w-6 h-6 sm:w-10 sm:h-10 text-black" />
                    </div>
                    <p className="text-black font-bold text-sm sm:text-xl uppercase text-center">Drop any files here</p>
                    <p className="text-gray-500 font-mono text-[10px] sm:text-sm mt-1 sm:mt-2 text-center">or click to browse (max 10MB each)</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm font-mono font-bold bg-black text-white px-3 py-1 text-center sm:text-left">
            {mode === 'text' ? `${text.length} CHARS` : filesToUpload.length > 0 ? `${(getTotalSize() / 1024 / 1024).toFixed(2)} MB (${filesToUpload.length} FILES)` : 'NO FILE'}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isUploading || (mode === 'text' && !text) || ((mode === 'image' || mode === 'file') && filesToUpload.length === 0)}
            className="flex items-center justify-center gap-2 sm:gap-3 bg-neo-green text-black border-2 border-black px-4 sm:px-8 py-3 text-base sm:text-lg font-black uppercase shadow-neo hover:-translate-y-1 hover:shadow-neo-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            {isUploading ? 'SAVING...' : 'PASTE IT'}
          </button>
        </div>
      </div>
    </div>
  );
}
