import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileVideo } from 'lucide-react';
import toast from 'react-hot-toast';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export default function UploadZone({ onFileSelect, isLoading = false }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setIsDragActive(false);

      if (acceptedFiles.length === 0) {
        toast.error('Please drop a valid MP4 video file');
        return;
      }

      const file = acceptedFiles[0];

      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast.error('Please upload a video file');
        return;
      }

      // Validate file size (500MB)
      if (file.size > 500 * 1024 * 1024) {
        toast.error('File size must be less than 500MB');
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] },
    disabled: isLoading,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-orange bg-orange bg-opacity-5'
          : 'border-gray-300 hover:border-orange'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        <div className={`p-4 rounded-full ${isDragActive ? 'bg-orange' : 'bg-gray-100'}`}>
          {isDragActive ? (
            <FileVideo size={32} className="text-white" />
          ) : (
            <Upload size={32} className="text-navy" />
          )}
        </div>

        <div>
          <p className="text-lg font-semibold text-gray-900">
            {isDragActive ? 'Drop your video here' : 'Drag and drop your video'}
          </p>
          <p className="text-sm text-gray-600">or click to select a file</p>
          <p className="text-xs text-gray-500 mt-2">MP4, MOV, AVI up to 500MB</p>
        </div>

        {isLoading && (
          <div className="text-sm text-orange font-medium">Uploading...</div>
        )}
      </div>
    </div>
  );
}
