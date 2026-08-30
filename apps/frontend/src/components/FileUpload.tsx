import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { emailApi } from '../services/api';
import { showError, showSuccess } from './Toast';

interface FileUploadProps {
  onSuccess: (recipients: string[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      showError('Only CSV or TXT files are allowed');
      return;
    }

    setFileName(file.name);
    setIsUploading(true);
    try {
      const response = await emailApi.uploadCsv(file);
      const data = response.data.data as any;
      if (response.data.success && data?.emails) {
        onSuccess(data.emails);
        showSuccess(`${data.count} email address${data.count !== 1 ? 'es' : ''} detected`);
      } else {
        showError(response.data.error || 'Failed to upload file');
        setFileName(null);
      }
    } catch (error) {
      showError('Failed to upload file');
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onSuccess([]);
  };

  if (fileName) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-md">
        <span className="text-sm font-medium text-green-800">{fileName} {isUploading && '(Uploading...)'}</span>
        <button type="button" onClick={clearFile} className="text-green-600 hover:text-green-800">
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
        isDragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv,.txt"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />
      <Upload className="w-8 h-8 text-gray-400 mb-2" />
      <p className="text-sm text-gray-600 text-center">
        <span className="font-medium text-brand-600 hover:text-brand-500">Click to upload</span> or drag and drop<br/>
        CSV or TXT file
      </p>
    </div>
  );
};
