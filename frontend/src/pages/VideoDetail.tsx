import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApi, Video } from '../services/api';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!api || !id) return;

      try {
        setLoading(true);
        const data = await api.getVideo(id);
        setVideo(data);
      } catch (error) {
        console.error('Failed to fetch video:', error);
        toast.error('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [api, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size={48} className="animate-spin text-orange" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Video not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">{video.title}</h1>

        <div className="mt-6 space-y-6">
          {/* Video Info */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Video Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {video.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">File Size</p>
                <p className="font-semibold text-gray-900">
                  {(video.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Generated Posts</p>
                <p className="font-semibold text-gray-900">
                  {video.posts?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-semibold text-gray-900">
                  {new Date(video.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Transcription */}
          {video.transcription && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Transcription
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {video.transcription}
              </p>
            </div>
          )}

          {/* Posts */}
          {video.posts && video.posts.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Generated Posts
              </h3>
              <div className="space-y-3">
                {video.posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="badge badge-info text-xs">
                      {post.platform}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
