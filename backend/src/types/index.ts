export interface AuthRequest {
  userId: string;
  email: string;
  name?: string;
}

export interface VideoUploadRequest {
  title: string;
  filename: string;
  size: number;
}

export interface TranscriptionRequest {
  videoId: string;
  blobUrl?: string;
  s3Url?: string;
}

export interface GeneratePostsRequest {
  videoId: string;
  transcription: string;
}

export interface PostData {
  platform: 'linkedin' | 'twitter' | 'instagram';
  content: string;
  imageUrl?: string;
}

export interface ExportRequest {
  videoId: string;
  format: 'json' | 'csv';
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
