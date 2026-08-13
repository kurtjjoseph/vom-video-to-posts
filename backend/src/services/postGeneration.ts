import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { PostData } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const PLATFORM_SPECS = {
  linkedin: {
    maxLength: 3000,
    tone: 'professional and insightful',
    hashtags: 5,
    style: 'thought leadership',
  },
  twitter: {
    maxLength: 280,
    tone: 'conversational and engaging',
    hashtags: 3,
    style: 'punchy and memorable',
  },
  instagram: {
    maxLength: 2200,
    tone: 'inspirational and relatable',
    hashtags: 10,
    style: 'visual and emotional',
  },
};

export async function generatePosts(
  videoId: string,
  transcription: string,
  userId: string
): Promise<PostData[]> {
  try {
    const video = await prisma.video.findUnique({ where: { id: videoId } });

    if (!video) {
      throw new Error('Video not found');
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'generating' },
    });

    // Create prompt for Claude
    const prompt = `You are an expert social media content strategist. Given the following video transcription, generate exactly 9 social media posts - 3 for each platform (LinkedIn, Twitter, Instagram).

Video Title: ${video.title}
Transcription: ${transcription}

For each platform, create posts that:
- LinkedIn (3 posts): Professional, thought leadership focused, 2000-3000 characters, 3-5 hashtags
- Twitter (3 posts): Concise, engaging, under 280 characters, 2-3 hashtags
- Instagram (3 posts): Inspirational, relatable, 1500-2200 characters, 8-10 hashtags

Format your response as JSON with this exact structure:
{
  "posts": [
    {"platform": "linkedin", "content": "..."},
    {"platform": "linkedin", "content": "..."},
    {"platform": "linkedin", "content": "..."},
    {"platform": "twitter", "content": "..."},
    {"platform": "twitter", "content": "..."},
    {"platform": "twitter", "content": "..."},
    {"platform": "instagram", "content": "..."},
    {"platform": "instagram", "content": "..."},
    {"platform": "instagram", "content": "..."}
  ]
}

Ensure posts are diverse, engaging, and platform-appropriate.`;

    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    );

    // Parse response
    const content = response.data.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Invalid response from Claude API');
    }

    // Extract JSON from response (Claude sometimes wraps it with markdown)
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const result = JSON.parse(jsonStr);
    const posts: PostData[] = result.posts;

    // Save posts to database
    for (const post of posts) {
      await prisma.post.create({
        data: {
          userId,
          videoId,
          platform: post.platform as 'linkedin' | 'twitter' | 'instagram',
          content: post.content,
          status: 'draft',
        },
      });
    }

    // Update video status
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'completed' },
    });

    // Log upload
    await prisma.uploadLog.create({
      data: {
        userId,
        videoId,
        action: 'generate',
        status: 'success',
        metadata: JSON.stringify({ postsCount: posts.length }),
      },
    });

    return posts;
  } catch (error) {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    const video = await prisma.video.findUnique({ where: { id: videoId } });

    await prisma.uploadLog.create({
      data: {
        userId,
        videoId: videoId,
        action: 'generate',
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

export function validatePost(post: PostData): string[] {
  const errors: string[] = [];
  const spec = PLATFORM_SPECS[post.platform];

  if (!post.content || post.content.trim().length === 0) {
    errors.push('Post content is empty');
  }

  if (post.content.length > spec.maxLength) {
    errors.push(
      `Post exceeds ${post.platform} character limit of ${spec.maxLength}`
    );
  }

  return errors;
}
