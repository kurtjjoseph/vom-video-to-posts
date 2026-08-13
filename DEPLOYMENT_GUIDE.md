# VOM Video-to-Posts Deployment Guide

## Quick Start

Transform screen recordings and videos into AI-generated social media posts with a single upload.

**Live URL:** https://vom-video-to-posts.vercel.app

---

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Account** - Repository must be on GitHub for Vercel integration
2. **Vercel Account** - Free tier is sufficient for development
3. **Supabase Account** - PostgreSQL database backend
4. **OpenAI API Key** - For video transcription via Whisper
5. **Anthropic API Key** - For AI-generated social posts
6. **AWS Account** (optional) - For S3 video storage
7. **GitHub OAuth App** - For user authentication

---

## Step 1: Prepare Environment Variables

### Local Development

1. Create `.env.local` in project root:
```bash
cp .env.example .env.local
```

2. Fill in all variables in `.env.local`:
```bash
# .env.local
OPENAI_API_KEY=sk-proj-your-actual-key-here
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-actual-key-here
SUPABASE_SERVICE_KEY=your-actual-service-key-here
AWS_ACCESS_KEY_ID=your-actual-aws-key
AWS_SECRET_ACCESS_KEY=your-actual-aws-secret
AWS_S3_BUCKET=vom-video-to-posts-bucket
AWS_REGION=us-east-1
JWT_SECRET=generate-random-32-char-string-here
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_REDIRECT_URI=https://vom-video-to-posts.vercel.app/api/auth/github/callback
```

3. **NEVER** commit `.env.local` to Git - it's in `.gitignore`

---

## Step 2: Set Up External Services

### OpenAI API (Video Transcription)

1. Go to https://platform.openai.com/account/api-keys
2. Create new API key
3. Copy and save the key
4. Set usage limits in OpenAI dashboard
5. Add to `.env.local`: `OPENAI_API_KEY=sk-proj-...`

### Anthropic API (Social Post Generation)

1. Go to https://console.anthropic.com/account/keys
2. Create new API key
3. Copy and save the key
4. Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`

### Supabase (Database)

1. Create account at https://supabase.com
2. Create new project:
   - Organization: Your organization
   - Project name: `vom-video-to-posts`
   - Database password: (strong password)
   - Region: Choose closest to your location
3. Copy project credentials:
   - Project URL → `SUPABASE_URL`
   - Anon key → `SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_KEY`
4. Add to `.env.local`

#### Initialize Database Schema

1. Go to Supabase dashboard → SQL Editor
2. Create new query
3. Copy contents of `DATABASE_SCHEMA.sql`
4. Execute all SQL
5. Verify tables created in Table Editor:
   - `users`
   - `videos`
   - `transcripts`
   - `social_posts`
   - `api_logs`
   - `api_usage`
   - `processing_jobs`

### AWS S3 (Video Storage) - Optional

1. Create AWS account if needed
2. Create S3 bucket: `vom-video-to-posts-bucket`
3. Create IAM user with S3 access:
   - Go to IAM → Users → Create user
   - User name: `vom-video-to-posts-app`
   - Attach policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:*"],
       "Resource": ["arn:aws:s3:::vom-video-to-posts-bucket*"]
     }]
   }
   ```
4. Generate access key ID and secret
5. Add to `.env.local`:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_S3_BUCKET=vom-video-to-posts-bucket`
   - `AWS_REGION=us-east-1`

### GitHub OAuth (User Authentication)

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: `VOM Video-to-Posts`
   - Homepage URL: `https://vom-video-to-posts.vercel.app`
   - Auth callback URL: `https://vom-video-to-posts.vercel.app/api/auth/github/callback`
4. Copy Client ID and Client Secret
5. Add to `.env.local`:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

#### Enable GitHub OAuth in Supabase

1. Supabase dashboard → Authentication → Providers
2. Enable GitHub
3. Paste GitHub OAuth App credentials:
   - Client ID
   - Client Secret
4. Save

---

## Step 3: Configure Vercel Deployment

### Connect Repository to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select GitHub repository: `vom-video-to-posts`
4. Project settings:
   - **Project Name:** vom-video-to-posts
   - **Root Directory:** ./ (root)
   - **Framework Preset:** Vite (or your framework)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Add Environment Variables to Vercel

1. Project Settings → Environment Variables
2. Add each variable from `.env.local`:
   - `OPENAI_API_KEY` → *production*
   - `ANTHROPIC_API_KEY` → *production*
   - `SUPABASE_URL` → *production*
   - `SUPABASE_ANON_KEY` → *production*
   - `SUPABASE_SERVICE_KEY` → *production*
   - `AWS_ACCESS_KEY_ID` → *production*
   - `AWS_SECRET_ACCESS_KEY` → *production*
   - `AWS_S3_BUCKET` → *production*
   - `AWS_REGION` → *production*
   - `JWT_SECRET` → *production*
   - `GITHUB_CLIENT_ID` → *production*
   - `GITHUB_CLIENT_SECRET` → *production*
   - `NODE_ENV=production` → *production*

3. Click "Save"

### Trigger Initial Deployment

1. Push code to GitHub `main` branch:
```bash
git add .
git commit -m "Configure deployment for Vercel"
git push origin main
```

2. Vercel automatically triggers deployment
3. Monitor deployment in Vercel dashboard
4. Wait for "Production" deployment to complete

---

## Step 4: Verify Deployment

### Test Application

1. Visit https://vom-video-to-posts.vercel.app
2. Test GitHub OAuth login:
   - Click "Login with GitHub"
   - Authorize application
   - Should redirect to dashboard
3. Test video upload:
   - Upload test video (< 500MB)
   - Watch processing status
4. Test transcription:
   - Wait for Whisper transcription to complete
   - Verify transcript appears
5. Test post generation:
   - Wait for Claude to generate posts
   - Verify 9 social posts appear (3 per platform)

### Check Logs

1. Vercel dashboard → Function Logs
2. Verify no error messages
3. Check OpenAI API usage
4. Check Anthropic API usage
5. Verify database queries in Supabase

---

## Step 5: Post-Deployment Configuration

### Update GitHub OAuth Redirect URL (if changed)

1. GitHub Settings → Developers → OAuth Apps
2. Update callback URL if deployment URL changed:
   ```
   https://vom-video-to-posts.vercel.app/api/auth/github/callback
   ```

### Configure Custom Domain (Optional)

1. Vercel dashboard → Domains
2. Add custom domain (e.g., `posts.visionoutreachmedia.nl`)
3. Follow DNS configuration steps
4. Wait for DNS propagation (up to 24 hours)
5. Update GitHub OAuth redirect URL to custom domain

### Set Up Monitoring (Optional)

#### Sentry Error Tracking

1. Create account at https://sentry.io
2. Create new project (Select Next.js or Node)
3. Copy DSN
4. Add to Vercel env vars: `SENTRY_DSN`
5. Initialize Sentry in code (if not already done)

#### PostHog Analytics

1. Create account at https://posthog.com
2. Create new project
3. Copy API key
4. Add to Vercel env vars: `POSTHOG_API_KEY`
5. Initialize PostHog in code (if not already done)

---

## Step 6: Scale & Optimize

### Database Optimization

1. Review database schema in Supabase
2. Verify all indexes created:
   - `idx_videos_status`
   - `idx_videos_created_at`
   - `idx_transcripts_video_id`
   - `idx_social_posts_platform`
3. Monitor query performance
4. Add additional indexes if needed

### Function Optimization

1. Monitor function execution time in Vercel
2. Optimize long-running processes:
   - Transcription might take 5-15 minutes
   - Post generation might take 2-5 minutes
3. Consider background job queue for large videos

### Storage Optimization

1. Monitor S3 bucket size
2. Implement cleanup policy for old videos
3. Consider lifecycle rules in S3

---

## Troubleshooting

### Deployment Fails

**Problem:** Vercel deployment fails with build error

**Solution:**
1. Check Vercel deployment logs
2. Ensure Node.js 20.x compatibility
3. Run `npm install` and `npm run build` locally
4. Fix any build errors
5. Commit and push to GitHub
6. Vercel will auto-retry

### Environment Variables Not Loading

**Problem:** "OPENAI_API_KEY is undefined" error

**Solution:**
1. Verify variable added in Vercel Project Settings
2. Ensure variable name matches exactly (case-sensitive)
3. Redeploy after adding variable:
   - Vercel dashboard → Deployments → Redeploy
4. Check that `.env.local` file exists for local testing

### GitHub OAuth Not Working

**Problem:** OAuth redirect fails or "invalid_client" error

**Solution:**
1. Verify GitHub OAuth app settings at https://github.com/settings/developers
2. Confirm redirect URL matches exactly:
   - `https://vom-video-to-posts.vercel.app/api/auth/github/callback`
3. Verify credentials in Supabase auth settings
4. For custom domains, update GitHub OAuth redirect URL
5. Clear browser cache and try again

### Video Upload Fails

**Problem:** Upload fails with storage error

**Solution:**
1. Verify AWS credentials in environment variables
2. Check S3 bucket permissions (bucket must be private)
3. Verify S3 bucket CORS configuration
4. Check S3 bucket name matches `AWS_S3_BUCKET`
5. Check AWS IAM user has S3 permissions

### Transcription Takes Too Long

**Problem:** Video transcription never completes

**Solution:**
1. Check OpenAI API status at https://status.openai.com
2. Verify `OPENAI_API_KEY` is valid
3. Check video file format (should be MP4, WebM, etc.)
4. Monitor OpenAI API usage in dashboard
5. Check Vercel function timeout (set to 900s = 15 minutes)

### Database Connection Error

**Problem:** "Cannot connect to database" error

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Check Supabase project is running (check dashboard)
3. Verify database schema was created (check SQL Editor)
4. Test connection: `psql <SUPABASE_URL>`
5. Check row-level security policies (might be blocking access)

---

## Security Best Practices

1. **Secrets**: Never commit API keys or secrets to Git
2. **Environment**: Use Vercel environment variables for production
3. **CORS**: Configure CORS to allow only your domain
4. **RLS**: Supabase row-level security is enabled by default
5. **JWT**: Keep JWT_SECRET secret and rotate periodically
6. **Updates**: Keep dependencies updated for security patches

---

## Monitoring & Maintenance

### Weekly Tasks
- Check Vercel dashboard for errors
- Review API usage (OpenAI, Anthropic)
- Monitor S3 storage usage
- Check database query performance

### Monthly Tasks
- Review error logs in Sentry
- Analyze user behavior in PostHog
- Update dependencies: `npm update`
- Review security advisories: `npm audit`

### Quarterly Tasks
- Review and optimize database indexes
- Analyze cost across all services
- Review and update documentation
- Conduct security review

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **OpenAI API Docs:** https://platform.openai.com/docs
- **Anthropic API Docs:** https://docs.anthropic.com
- **AWS S3 Docs:** https://docs.aws.amazon.com/s3/

---

## Deployment Summary

| Service | Purpose | Free Tier | Production |
|---------|---------|-----------|-----------|
| Vercel | Hosting | Yes | Yes |
| Supabase | Database | 500MB | Paid plan |
| OpenAI | Transcription | $5 free | Pay-as-you-go |
| Anthropic | Post generation | Limited | Pay-as-you-go |
| AWS S3 | Video storage | 1GB free | Pay-as-you-go |
| GitHub | Repo hosting | Yes | Yes |

**Total Monthly Cost (Production):**
- Supabase: $25-100 (based on usage)
- OpenAI: $0.01-0.50 per video (Whisper)
- Anthropic: $0.01-0.10 per 9 posts (Claude)
- AWS S3: $0.023 per GB stored
- GitHub: Free
- Vercel: Free for most use cases

---

Last Updated: August 13, 2026
Maintained by: Vision Outreach Media (VOM)
