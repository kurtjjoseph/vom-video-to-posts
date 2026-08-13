import { useState } from 'react';
import { Post } from '../services/api';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface PostEditorProps {
  post: Post;
  onSave: (post: Post) => Promise<void>;
  onClose: () => void;
}

const PLATFORM_LIMITS = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
};

export default function PostEditor({ post, onSave, onClose }: PostEditorProps) {
  const [content, setContent] = useState(post.content);
  const [imageUrl, setImageUrl] = useState(post.imageUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const charLimit = PLATFORM_LIMITS[post.platform];
  const charCount = content.length;
  const isOverLimit = charCount > charLimit;

  const handleSave = async () => {
    if (isOverLimit) {
      toast.error(`Content exceeds ${charLimit} character limit`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...post,
        content,
        imageUrl: imageUrl || undefined,
      });
      toast.success('Post saved successfully');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save post');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Edit {post.platform.toUpperCase()} Post</h2>
            <p className="text-sm text-gray-600">
              {charCount} / {charLimit} characters
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Textarea */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange resize-none ${
                isOverLimit ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
              rows={6}
              placeholder="Enter post content..."
            />
            {isOverLimit && (
              <p className="text-sm text-red-600 mt-2">
                Content exceeds character limit by {charCount - charLimit} characters
              </p>
            )}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Image URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              placeholder="https://example.com/image.jpg"
            />
            {imageUrl && (
              <div className="mt-4 relative">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-64 rounded-lg"
                  onError={() => setImageUrl('')}
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange">
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isOverLimit}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
