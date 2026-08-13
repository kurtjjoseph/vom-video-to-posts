import { PrismaClient } from '@prisma/client';
import { Post } from '@prisma/client';

const prisma = new PrismaClient();

export async function exportPostsAsJSON(videoId: string): Promise<string> {
  const posts = await prisma.post.findMany({
    where: { videoId },
    select: {
      id: true,
      platform: true,
      content: true,
      imageUrl: true,
      status: true,
      createdAt: true,
    },
  });

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      title: true,
      transcription: true,
      createdAt: true,
    },
  });

  const exportData = {
    video: {
      title: video?.title,
      transcription: video?.transcription,
      exportedAt: new Date().toISOString(),
    },
    posts,
    summary: {
      total: posts.length,
      byPlatform: {
        linkedin: posts.filter((p) => p.platform === 'linkedin').length,
        twitter: posts.filter((p) => p.platform === 'twitter').length,
        instagram: posts.filter((p) => p.platform === 'instagram').length,
      },
    },
  };

  return JSON.stringify(exportData, null, 2);
}

export async function exportPostsAsCSV(videoId: string): Promise<string> {
  const posts = await prisma.post.findMany({
    where: { videoId },
    select: {
      id: true,
      platform: true,
      content: true,
      imageUrl: true,
      status: true,
      createdAt: true,
    },
  });

  const video = await prisma.video.findUnique({
    where: { videoId },
    select: { title: true },
  });

  const rows: string[] = [
    // Header
    'Platform,Content,ImageURL,Status,CreatedAt',
  ];

  // Add data rows
  for (const post of posts) {
    const content = escapeCSV(post.content);
    const imageUrl = post.imageUrl ? escapeCSV(post.imageUrl) : '';
    const createdAt = post.createdAt.toISOString();

    rows.push(
      `"${post.platform}","${content}","${imageUrl}","${post.status}","${createdAt}"`
    );
  }

  // Add summary section
  rows.push('');
  rows.push('Summary');
  rows.push(`Video Title,"${escapeCSV(video?.title || '')}"`);
  rows.push(`Total Posts,${posts.length}`);
  rows.push(
    `LinkedIn Posts,${posts.filter((p) => p.platform === 'linkedin').length}`
  );
  rows.push(`Twitter Posts,${posts.filter((p) => p.platform === 'twitter').length}`);
  rows.push(
    `Instagram Posts,${posts.filter((p) => p.platform === 'instagram').length}`
  );
  rows.push(`Exported At,"${new Date().toISOString()}"`);

  return rows.join('\n');
}

function escapeCSV(value: string): string {
  return value.replace(/"/g, '""').replace(/[\n\r]+/g, ' ');
}

export async function logExport(
  userId: string,
  videoId: string,
  format: 'json' | 'csv',
  size: number
): Promise<void> {
  await prisma.uploadLog.create({
    data: {
      userId,
      videoId,
      action: 'export',
      status: 'success',
      metadata: JSON.stringify({ format, size }),
    },
  });
}
