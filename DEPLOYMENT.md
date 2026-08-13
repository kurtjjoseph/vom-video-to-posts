# Deployment Guide

## Quick Start Deployment

### Prerequisites Checklist
- [ ] GitHub repository created
- [ ] Vercel account with org
- [ ] Supabase project created
- [ ] API keys obtained:
  - [ ] Clerk (publishable + secret)
  - [ ] OpenAI API key
  - [ ] Anthropic API key
  - [ ] Vercel Blob token OR AWS S3 credentials

## Step 1: Setup Supabase PostgreSQL

1. Create Supabase project at https://supabase.com
2. Create new PostgreSQL database
3. Copy connection string (use `postgresql://...` format)
4. Keep this for backend environment variables

## Step 2: Configure Clerk Authentication

1. Go to https://clerk.com and create app
2. Set GitHub as OAuth provider:
   - Add OAuth app in GitHub settings
   - Authorized redirect URLs:
     - http://localhost:3000/callback
     - https://vom-video-to-posts.vercel.app/callback
3. Copy keys:
   - Publishable key (Frontend)
   - Secret key (Backend)

## Step 3: Get API Keys

### OpenAI API
1. Create account at https://openai.com/api
2. Generate API key
3. Set billing limits

### Anthropic API
1. Create account at https://console.anthropic.com
2. Generate API key

### Vercel Blob (Storage)
1. Go to Vercel dashboard
2. Settings → Storage → Create Blob
3. Copy read/write token

**OR AWS S3:**
1. Create IAM user with S3 permissions
2. Generate access key + secret key
3. Create S3 bucket (e.g., `vom-video-to-posts`)

## Step 4: Deploy Backend to Vercel

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import GitHub repository
4. Select `/backend` as root directory
5. Add Environment Variables:

```
DATABASE_URL = (Supabase connection string)
CLERK_SECRET_KEY = (Clerk secret)
OPENAI_API_KEY = sk-...
ANTHROPIC_API_KEY = sk-ant-...
VERCEL_BLOB_READ_WRITE_TOKEN = (or AWS creds)
AWS_ACCESS_KEY_ID = (if using S3)
AWS_SECRET_ACCESS_KEY = (if using S3)
AWS_REGION = us-east-1
AWS_S3_BUCKET = vom-video-to-posts
CORS_ORIGIN = https://vom-video-to-posts.vercel.app
NODE_ENV = production
```

6. Click Deploy

7. Once deployed, run database migrations:
```bash
vercel env pull .env.production.local
npm run prisma:deploy
```

8. Note your backend URL: `https://video-to-posts-[random].vercel.app`

## Step 5: Deploy Frontend to Vercel

1. Go to https://vercel.com/new
2. Import same GitHub repository
3. Select `/frontend` as root directory
4. Add Environment Variables:

```
VITE_API_URL = https://video-to-posts-[random].vercel.app/api
VITE_CLERK_PUBLISHABLE_KEY = pk_test_...
```

5. Click Deploy

## Step 6: Configure Clerk Redirects

Update Clerk dashboard:
- Authorized redirect URLs:
  - https://vom-video-to-posts.vercel.app/callback
  - https://vom-video-to-posts.vercel.app/sso-callback

## Step 7: Verify Deployment

### Backend Health Check
```bash
curl https://video-to-posts-[random].vercel.app/health
# Should return: { "status": "ok", "timestamp": "..." }
```

### Test Upload
1. Go to https://vom-video-to-posts.vercel.app
2. Sign in with GitHub
3. Upload test video
4. Monitor Vercel logs if issues occur

## Monitoring & Logs

### Vercel Logs
```bash
vercel logs --prod backend
vercel logs --prod frontend
```

### Database
- Supabase dashboard shows query performance
- Check UploadLog table for processing history

### API Errors
- Backend logs: Vercel dashboard → Functions → Logs
- Frontend errors: Browser console
- Storage errors: CloudWatch (if using AWS)

## Common Issues & Solutions

### "CORS error"
- Check CORS_ORIGIN in backend env vars
- Verify frontend domain is listed
- Restart backend deployment

### "Transcription failed"
- Check OpenAI API key validity
- Verify API quota/balance
- Check video file is valid MP4

### "Database connection error"
- Verify DATABASE_URL is correct
- Ensure database allows Vercel IPs
- Run migrations: `npm run prisma:deploy`

### "Storage upload failed"
- Verify Vercel Blob token OR AWS credentials
- Check bucket exists and permissions
- S3: Ensure bucket is in same region

## Scaling Recommendations

- Monitor Vercel function execution time
- Set up CloudWatch alerts for errors
- Use database connection pooling
- Implement request rate limiting
- Cache transcriptions (avoid re-processing)

## Security Hardening

- Rotate API keys monthly
- Enable Vercel analytics
- Use IP allowlist for database access
- Set video file size limits appropriately
- Implement user rate limiting

## Backup Strategy

```bash
# Export Supabase database
pg_dump postgresql://... > backup.sql

# Schedule weekly via GitHub Actions
# Or use Supabase automated backups
```

## Rollback Plan

1. Identify failed deployment in Vercel
2. Click "Rollback to previous"
3. Verify health check passes
4. Notify users if downtime occurred

## Support

- Vercel status: https://www.vercel-status.com
- Supabase status: https://status.supabase.com
- OpenAI status: https://status.openai.com
