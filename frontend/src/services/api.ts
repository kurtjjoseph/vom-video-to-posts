import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Video {
  id: string;
  userId: string;
  title: string;
  filename: string;
  size: number;
  duration?: number;
  blobUrl?: string;
  s3Url?: string;
  transcription?: string;
  status: 'uploaded' | 'transcribing' | 'transcribed' | 'generating' | 'completed' | 'error';
  errorMessage?: string;
  posts: Array<{ id: string; platform: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  userId: string;
  videoId: string;
  platform: 'linkedin' | 'twitter' | 'instagram';
  content: string;
  imageUrl?: string;
  status: 'draft' | 'published' | 'scheduled';
  scheduledFor?: string;
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalVideos: number;
  totalPosts: number;
  videosByStatus: Record<string, number>;
  postsByPlatform: Record<string, number>;
  recentUploads: Array<{ videoId: string; uploadedAt: string }>;
}

class ApiClient {
  private client: AxiosInstance;

  constructor(token?: string) {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  }

  setToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Videos
  //
  // The file goes straight from the browser to storage. The API only mints a
  // signed URL and records the result, so a 500MB video never has to fit
  // inside a serverless request body.
  async uploadVideo(
    file: File,
    title: string,
    onProgress?: (percent: number) => void
  ): Promise<Video> {
    const { data: ticket } = await this.client.post<{
      success: boolean;
      data: { videoId: string; uploadUrl: string; token: string; path: string };
    }>('/videos/upload-url', {
      filename: file.name,
      size: file.size,
      title,
    });

    const { videoId, uploadUrl } = ticket.data;

    // Straight to storage — deliberately not through `this.client`, so the
    // API's auth header and base URL are not attached to the storage PUT.
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'video/mp4' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });

    const response = await this.client.post<{ success: boolean; data: Video }>(
      `/videos/${videoId}/complete`
    );
    return response.data.data;
  }

  async getVideos(page = 1, limit = 10): Promise<{ data: Video[]; total: number; page: number; limit: number }> {
    const response = await this.client.get('/videos', {
      params: { page, limit },
    });
    return response.data;
  }

  async getVideo(id: string): Promise<Video> {
    const response = await this.client.get<{ success: boolean; data: Video }>(
      `/videos/${id}`
    );
    return response.data.data;
  }

  async transcribeVideo(videoId: string): Promise<string> {
    const response = await this.client.post<{ success: boolean; data: { transcription: string } }>(
      `/videos/${videoId}/transcribe`
    );
    return response.data.data.transcription;
  }

  async generatePosts(videoId: string): Promise<Post[]> {
    const response = await this.client.post<{ success: boolean; data: Post[] }>(
      `/videos/${videoId}/generate-posts`
    );
    return response.data.data;
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.client.delete(`/videos/${videoId}`);
  }

  // Posts
  async getPosts(
    page = 1,
    limit = 20,
    platform?: string,
    videoId?: string
  ): Promise<{ data: Post[]; total: number; page: number; limit: number }> {
    const response = await this.client.get('/posts', {
      params: { page, limit, platform, videoId },
    });
    return response.data;
  }

  async getPost(id: string): Promise<Post> {
    const response = await this.client.get<{ success: boolean; data: Post }>(
      `/posts/${id}`
    );
    return response.data.data;
  }

  async updatePost(
    id: string,
    data: Partial<Post>
  ): Promise<Post> {
    const response = await this.client.put<{ success: boolean; data: Post }>(
      `/posts/${id}`,
      data
    );
    return response.data.data;
  }

  async deletePost(id: string): Promise<void> {
    await this.client.delete(`/posts/${id}`);
  }

  async exportPosts(videoId: string, format: 'json' | 'csv'): Promise<Blob> {
    const response = await this.client.post(
      `/posts/export/${videoId}`,
      { format },
      { responseType: 'blob' }
    );
    return response.data;
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<{ success: boolean; data: DashboardStats }>(
      '/dashboard/stats'
    );
    return response.data.data;
  }

  async getAnalytics(timeframe = '30days'): Promise<any> {
    const response = await this.client.get('/dashboard/analytics', {
      params: { timeframe },
    });
    return response.data.data;
  }

  async getActivityLog(page = 1, limit = 20): Promise<any> {
    const response = await this.client.get('/dashboard/activity', {
      params: { page, limit },
    });
    return response.data;
  }
}

export default ApiClient;
