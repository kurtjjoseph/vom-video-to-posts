import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Video, DashboardStats } from '../services/api';
import { Activity, BarChart3, FileVideo, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!api) return;

      try {
        setLoading(true);
        const [dashStats, videosList] = await Promise.all([
          api.getDashboardStats(),
          api.getVideos(1, 5),
        ]);

        setStats(dashStats);
        setRecentVideos(videosList.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-orange border-t-navy rounded-full"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Videos',
      value: stats?.totalVideos || 0,
      icon: FileVideo,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Total Posts',
      value: stats?.totalPosts || 0,
      icon: Zap,
      color: 'bg-orange-100 text-orange',
    },
    {
      label: 'LinkedIn Posts',
      value: stats?.postsByPlatform?.linkedin || 0,
      icon: Activity,
      color: 'bg-indigo-100 text-indigo-700',
    },
    {
      label: 'Twitter Posts',
      value: stats?.postsByPlatform?.twitter || 0,
      icon: Activity,
      color: 'bg-sky-100 text-sky-700',
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">
            Track your videos, posts, and analytics all in one place
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Video Statistics */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Video Status */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileVideo size={20} className="text-navy" />
                Video Status
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.videosByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="capitalize text-gray-700">{status}</span>
                    <span className="font-semibold text-navy">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Post Platforms */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-orange" />
                Posts by Platform
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.postsByPlatform).map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="capitalize text-gray-700">{platform}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                        <div
                          className="h-2 rounded-full bg-orange transition-all duration-300"
                          style={{
                            width: `${Math.min((count / (stats.totalPosts || 1)) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="font-semibold text-navy min-w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Videos */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Videos
          </h3>
          {recentVideos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Title
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Posts
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentVideos.map((video) => (
                    <tr
                      key={video.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {video.title}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge ${
                            video.status === 'completed'
                              ? 'badge-success'
                              : 'badge-info'
                          }`}
                        >
                          {video.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {video.posts?.length || 0} posts
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">
              No videos yet. Start by uploading your first video.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
