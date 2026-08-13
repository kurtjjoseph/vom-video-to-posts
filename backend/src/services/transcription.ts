import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import FormData from 'form-data';
import https from 'https';
import http from 'http';

const prisma = new PrismaClient();

export async function transcribeVideo(videoId: string, videoPath: string): Promise<string> {
  try {
    const video = await prisma.video.findUnique({ where: { id: videoId } });

    if (!video) {
      throw new Error('Video not found');
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'transcribing' },
    });

    // Download video from blob or S3
    let videoBuffer: Buffer;

    if (video.blobUrl) {
      videoBuffer = await downloadFromUrl(video.blobUrl);
    } else if (video.s3Url) {
      videoBuffer = await downloadFromUrl(video.s3Url);
    } else {
      throw new Error('No video URL available');
    }

    // Send to OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', videoBuffer, { filename: video.filename });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const transcription = response.data.text;

    // Update video with transcription
    await prisma.video.update({
      where: { id: videoId },
      data: {
        transcription,
        status: 'transcribed',
      },
    });

    // Log upload
    await prisma.uploadLog.create({
      data: {
        userId: video.userId,
        videoId,
        action: 'transcribe',
        status: 'success',
        metadata: JSON.stringify({ duration: video.duration }),
      },
    });

    return transcription;
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
        userId: video?.userId || 'unknown',
        videoId,
        action: 'transcribe',
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

async function downloadFromUrl(url: string): Promise<Buffer> {
  const protocol = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const request = protocol.get(url, (response) => {
      const chunks: Buffer[] = [];

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    request.on('error', reject);
  });
}
