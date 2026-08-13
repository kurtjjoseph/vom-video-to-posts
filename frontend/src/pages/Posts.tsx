import { useEffect, useState } from 'react';
import { useApi, Post } from '../services/api';
import PostEditor from '../components/PostEditor';
import { Download, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Posts() {
  const api = useApi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('');

  useEffect(() => {
    const fetchPosts = async () => {
      if (!api) return;

      try {
        setLoading(true);
        const data = await api.getPosts(1, 100, filterPlatform || undefined);
        setPosts(data.data);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        toast.error('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [api, filterPlatform]);

  const handleSavePost = async (post: Post) => {
    if (!api) return;

    try {
      await api.updatePost(post.id, post);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? post : p))
      );
      setSelectedPost(null);
    } catch (error) {
      throw error;
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!api) return;

    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!api || posts.length === 0) return;

    try {
      const videoId = posts[0].videoId;
      const blob = await api.exportPosts(videoId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `posts.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-orange border-t-navy rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Posts</h1>
            <p className="text-gray-600 mt-2">{posts.length} posts total</p>
          </div>
          {posts.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('json')}
                className="btn-secondary flex items-center gap-2"
              >
                <Download size={18} />
                JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="btn-secondary flex items-center gap-2"
              >
                <Download size={18} />
                CSV
              </button>
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="input-base"
          >
            <option value="">All Platforms</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">Twitter</option>
            <option value="instagram">Instagram</option>
          </select>
        </div>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid gap-6">
            {posts.map((post) => (
              <div key={post.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="badge badge-info text-xs font-semibold">
                        {post.platform.toUpperCase()}
                      </span>
                      <span
                        className={`badge text-xs font-semibold ${
                          post.status === 'draft'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedPost(post)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} className="text-navy" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-800 mb-4 line-clamp-3">{post.content}</p>

                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="max-h-64 rounded-lg mb-4 object-cover"
                  />
                )}

                {post.metrics && (
                  <div className="flex gap-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                    <span>Views: {post.metrics.views}</span>
                    <span>Likes: {post.metrics.likes}</span>
                    <span>Comments: {post.metrics.comments}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No posts yet</p>
            <a href="/upload" className="btn-primary">
              Upload Your First Video
            </a>
          </div>
        )}
      </div>

      {/* Post Editor Modal */}
      {selectedPost && (
        <PostEditor
          post={selectedPost}
          onSave={handleSavePost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}
