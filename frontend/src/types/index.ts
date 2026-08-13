export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface ProcessingStatus {
  step: 'uploading' | 'transcribing' | 'generating' | 'completed';
  progress: number;
  message: string;
}
