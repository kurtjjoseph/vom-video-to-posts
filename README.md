# VOM Video-to-Posts Pipeline

Transform videos into engaging social media posts with AI-powered transcription and content generation.

## Features

- **Video Upload**: Drag-drop interface, supports MP4 up to 500MB
- **Auto-Transcription**: OpenAI Whisper API integration
- **AI Post Generation**: Claude API generates 9 posts (3 per platform)
  - LinkedIn (professional, 3000 chars)
  - Twitter (concise, 280 chars)
  - Instagram (inspirational, 2200 chars)
- **Post Editor**: Edit text and images, manage status
- **Bulk Export**: Download as JSON or CSV
- **Team Dashboard**: Upload history, analytics, activity log
- **GitHub OAuth**: Clerk authentication

## Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Vite
- Clerk (Auth)

### Backend
- Express.js + TypeScript
- Prisma ORM
- Supabase PostgreSQL
- Vercel Blob or AWS S3 storage

### APIs
- OpenAI Whisper (transcription)
- Anthropic Claude (post generation)
- Clerk (authentication)

## Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase)
- API keys for:
  - Clerk (GitHub OAuth)
  - OpenAI (Whisper API)
  - Anthropic (Claude API)
  - Vercel Blob OR AWS S3

## Local Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd video-to-posts

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Copy environment file
cd backend
cp ../.env.example .env

# Update .env with your PostgreSQL connection string
# Example: DATABASE_URL="postgresql://user:pass@localhost:5432/vom"

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### 3. Environment Configuration

**Backend (.env)**:
```
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
VERCEL_BLOB_READ_WRITE_TOKEN=... (or AWS creds)
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env)**:
```
VITE_API_URL=http://localhost:3001/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 4. Run Locally

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Server runs on http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm run dev
# App runs on http://localhost:3000
```

## Deployment to Vercel

### Backend Deployment

1. Push code to GitHub
2. Create new Vercel project, select `/backend` directory
3. Add environment variables in Vercel dashboard:
   - DATABASE_URL
   - CLERK_SECRET_KEY
   - OPENAI_API_KEY
   - ANTHROPIC_API_KEY
   - VERCEL_BLOB_READ_WRITE_TOKEN
   - AWS credentials (optional)
   - CORS_ORIGIN

4. Deploy

### Frontend Deployment

1. Create new Vercel project, select `/frontend` directory
2. Add environment variables:
   - VITE_API_URL=https://your-backend.vercel.app/api
   - VITE_CLERK_PUBLISHABLE_KEY

3. Deploy

### Database Migration

```bash
# On Vercel
vercel env pull .env.production.local

# Run migrations
npm run prisma:deploy
```

## API Endpoints

### Videos
- `POST /api/videos` - Upload video
- `GET /api/videos` - List user videos
- `GET /api/videos/:id` - Get video details
- `POST /api/videos/:id/transcribe` - Transcribe video
- `POST /api/videos/:id/generate-posts` - Generate posts
- `DELETE /api/videos/:id` - Delete video

### Posts
- `GET /api/posts` - List posts (with filters)
- `GET /api/posts/:id` - Get post details
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/export/:videoId` - Export as JSON/CSV

### Dashboard
- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/analytics` - Get analytics (timeframe param)
- `GET /api/dashboard/activity` - Get activity log

## Database Schema

### Users
```prisma
model User {
  id: String (unique)
  clerkId: String (unique)
  email: String
  name: String?
  image: String?
  videos: Video[]
  posts: Post[]
}
```

### Videos
```prisma
model Video {
  id: String
  userId: String
  title: String
  filename: String
  size: Int
  transcription: String?
  status: "uploaded" | "transcribing" | "transcribed" | "generating" | "completed" | "error"
  blobUrl?: String
  s3Url?: String
  posts: Post[]
}
```

### Posts
```prisma
model Post {
  id: String
  userId: String
  videoId: String
  platform: "linkedin" | "twitter" | "instagram"
  content: String
  imageUrl?: String
  status: "draft" | "published" | "scheduled"
  metrics?: Metrics
}
```

## Error Handling

- All endpoints return proper HTTP status codes
- Error responses include descriptive messages
- Retry logic for transient API failures
- Video processing tracked with status field

## Performance Optimizations

- Pagination on all list endpoints (default: 10-20 items)
- File upload streaming
- Database indexing on frequently queried fields
- Response compression

## Security

- GitHub OAuth via Clerk
- API authentication on all protected endpoints
- CORS configured for deployments
- Environment variables for sensitive data
- No credentials in code

## Troubleshooting

### Video Upload Fails
- Check file size < 500MB
- Verify storage credentials (Blob or S3)
- Check database connection

### Transcription Errors
- Verify OpenAI API key and quota
- Check video format (MP4 recommended)
- Review CloudWatch logs

### Post Generation Fails
- Verify Anthropic API key
- Check token limits
- Ensure transcription succeeded first

## Development

### Run Tests
```bash
cd backend
npm test

cd ../frontend
npm test
```

### Type Checking
```bash
tsc --noEmit
```

## License

MIT

## Support

For issues, check logs on Vercel dashboard or CloudWatch.
