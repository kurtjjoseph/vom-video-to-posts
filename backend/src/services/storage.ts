import AWS from 'aws-sdk';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function uploadToS3(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const key = `videos/${uuidv4()}-${filename}`;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'vom-video-to-posts',
    Key: key,
    Body: buffer,
    ContentType: 'video/mp4',
  };

  const result = await s3Client.upload(params).promise();
  return result.Location;
}

export async function uploadToVercelBlob(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([buffer]), filename);

  const response = await axios.post(
    'https://blob.vercel-storage.com',
    formData,
    {
      headers: {
        authorization: `Bearer ${process.env.VERCEL_BLOB_READ_WRITE_TOKEN}`,
      },
    }
  );

  return response.data.url;
}

export async function uploadVideo(
  buffer: Buffer,
  filename: string
): Promise<string> {
  // Use Vercel Blob if token is provided, otherwise use S3
  if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN) {
    return uploadToVercelBlob(buffer, filename);
  } else if (process.env.AWS_ACCESS_KEY_ID) {
    return uploadToS3(buffer, filename);
  } else {
    throw new Error(
      'No storage provider configured. Set VERCEL_BLOB_READ_WRITE_TOKEN or AWS credentials.'
    );
  }
}

export async function deleteVideo(url: string): Promise<void> {
  if (url.includes('blob.vercel-storage.com')) {
    await axios.delete(url, {
      headers: {
        authorization: `Bearer ${process.env.VERCEL_BLOB_READ_WRITE_TOKEN}`,
      },
    });
  } else if (url.includes('amazonaws.com')) {
    const key = url.split('.amazonaws.com/').pop();
    if (key) {
      await s3Client
        .deleteObject({
          Bucket: process.env.AWS_S3_BUCKET || 'vom-video-to-posts',
          Key: key,
        })
        .promise();
    }
  }
}
