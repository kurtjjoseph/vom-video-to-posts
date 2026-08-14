import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Video } from '../services/api';
import UploadZone from '../components/UploadZone';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Upload() {
  const api = useApi();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<Video | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!selectedFile || !videoTitle.trim() || !api) {
      toast.error('Please select a video and enter a title');
      return;
    }

    setIsUploading(true);
    try {
      const video = await api.uploadVideo(selectedFile, videoTitle);
      setUploadedVideo(video);
      setSelectedFile(null);
      setVideoTitle('');
      toast.success('Video uploaded successfully!');

      // Auto-start transcription
      handleTranscribe(video.id);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload video'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleTranscribe = async (videoId: string) => {
    if (!api) return;

    setIsTranscribing(true);
    try {
      await api.transcribeVideo(videoId);
      toast.success('Video transcribed! Generating posts...');

      // Auto-start post generation
      handleGeneratePosts(videoId);
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to transcribe video'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGeneratePosts = async (videoId: string) => {
    if (!api) return;

    setIsGenerating(true);
    try {
      const posts = await api.generatePosts(videoId);
      setUploadedVideo((prev) =>
        prev ? { ...prev, status: 'completed' } : null
      );
      toast.success(`Generated ${posts.length} social media posts!`);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate posts'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (!api) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-orange mx-auto mb-4" />
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Video</h1>
          <p className="text-gray-600 mt-2">
            Upload a video to automatically generate social media posts
          </p>
        </div>

        {!uploadedVideo ? (
          <div className="space-y-6">
            {/* Upload Zone */}
            <UploadZone
              onFileSelect={handleFileSelect}
              isLoading={isUploading}
            />

            {/* Video Title Input */}
            {selectedFile && (
              <div className="card p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Video Title
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="input-base w-full mb-4"
                  placeholder="Enter a title for your video"
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setVideoTitle('');
                    }}
                    className="btn-outline flex-1"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload & Process'}
                  </button>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="card p-6 bg-blue-50 border-blue-200">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-blue-700 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">How it works</p>
                  <ol className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-decimal">
                    <li>Upload your video (MP4, up to 500MB)</li>
                    <li>We automatically transcribe the audio</li>
                    <li>AI generates 9 posts (3 per platform)</li>
                    <li>Edit and export your posts</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Processing Status */}
            <div className="card p-8">
              <div className="text-center">
                <div className="mb-6">
                  {uploadedVideo.status === 'completed' ? (
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100">
                      <Loader
                        size={32}
                        className="text-orange animate-spin"
                      />
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {uploadedVideo.title}
                </h2>

                {/* Status Steps */}
                <div className="my-8 space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-gray-700">Video uploaded</span>
                  </div>
                  <div
                    className={`flex items-center justify-center gap-2 ${
                      isTranscribing
                        ? 'text-orange'
                        : uploadedVideo.transcription
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {isTranscribing ? (
                      <Loader size={20} className="animate-spin" />
                    ) : uploadedVideo.transcription ? (
                      <CheckCircle size={20} />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <span>Transcribing audio</span>
                  </div>
                  <div
                    className={`flex items-center justify-center gap-2 ${
                      isGenerating
                        ? 'text-orange'
                        : uploadedVideo.status === 'completed'
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {isGenerating ? (
                      <Loader size={20} className="animate-spin" />
                    ) : uploadedVideo.status === 'completed' ? (
                      <CheckCircle size={20} />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <span>Generating posts</span>
                  </div>
                </div>

                {uploadedVideo.status === 'completed' && (
                  <>
                    <p className="text-gray-600 mb-6">
                      {uploadedVideo.posts?.length || 0} posts generated!
                    </p>
                    <a
                      href="/"
                      className="btn-primary inline-block"
                    >
                      Go to Dashboard
                    </a>
                  </>
                )}

                {uploadedVideo.status === 'error' && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-medium">
                      {uploadedVideo.errorMessage || 'An error occurred'}
                    </p>
                    <button
                      onClick={() => setUploadedVideo(null)}
                      className="mt-4 btn-outline"
                    >
                      Upload Another Video
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
