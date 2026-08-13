# VOM Video-to-Posts Deployment Checklist

## Overview
This checklist ensures the Video-to-Posts project is properly configured for Vercel deployment with all necessary environment variables, database schema, and OAuth integrations.

---

## 1. GitHub Repository Setup

- [ ] Repository created on GitHub
- [ ] Branch protection enabled on `main` branch
- [ ] Collaborators/Teams added with appropriate permissions
- [ ] Repository secrets configured (if using GitHub Actions)
- [ ] README.md updated with project description
- [ ] .gitignore configured to exclude:
  - `.env.local`
  - `.env*.local`
  - `node_modules/`
  - `dist/`
  - `.vercel/`

---

## 2. Vercel Configuration

### Project Setup
- [ ] Project created in Vercel dashboard
- [ ] GitHub repository connected to Vercel
- [ ] Project name set to: `vom-video-to-posts`
- [ ] Root directory: `.` (root of repository)
- [ ] Build command verified: `npm run build`
- [ ] Output directory verified: `dist`
- [ ] Node.js version set to: 20.x

### Environment Variables (Vercel Dashboard)
Add each variable via Vercel Project Settings → Environment Variables:

**Critical - Must Add:**
- [ ] `OPENAI_API_KEY` - OpenAI API key for Whisper transcription
- [ ] `ANTHROPIC_API_KEY` - Claude API key for social post generation
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_KEY` - Supabase service role key (backend only)
- [ ] `AWS_ACCESS_KEY_ID` - AWS credentials
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS credentials
- [ ] `AWS_S3_BUCKET` - S3 bucket name for video storage
- [ ] `AWS_REGION` - AWS region (e.g., us-east-1)
- [ ] `JWT_SECRET` - Cryptographically random string (min 32 chars)
- [ ] `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- [ ] `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
- [ ] `NODE_ENV` - Set to `production`

**Optional but Recommended:**
- [ ] `SENTRY_DSN` - Sentry error tracking
- [ ] `SENDGRID_API_KEY` - Email notifications
- [ ] `POSTHOG_API_KEY` - Analytics

---

## 3. Database Setup (Supabase)

### Create Supabase Project
- [ ] Supabase account created/logged in at https://supabase.com
- [ ] New project created
- [ ] Project URL and keys noted (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- [ ] Service role key generated and noted (`SUPABASE_SERVICE_KEY`)

### Initialize Database Schema
- [ ] Navigate to Supabase SQL Editor
- [ ] Copy and paste contents of `DATABASE_SCHEMA.sql`
- [ ] Execute all SQL commands
- [ ] Verify tables created:
  - `users`
  - `videos`
  - `transcripts`
  - `social_posts`
  - `api_logs`
  - `api_usage`
  - `processing_jobs`
- [ ] Verify indexes created for performance
- [ ] Verify Row-Level Security (RLS) policies enabled
- [ ] Test RLS policies by connecting as authenticated user

### Supabase Authentication Setup
- [ ] Enable GitHub OAuth provider in Supabase Auth settings
- [ ] GitHub OAuth app client ID added
- [ ] GitHub OAuth app client secret added
- [ ] Redirect URL set to: `https://vom-video-to-posts.vercel.app/api/auth/github/callback`

---

## 4. External Services Configuration

### OpenAI API (for Transcription)
- [ ] OpenAI account created at https://platform.openai.com
- [ ] API key generated and noted
- [ ] Usage limits set (optional but recommended)
- [ ] Billing method configured

### Anthropic API (for Post Generation)
- [ ] Anthropic account created at https://console.anthropic.com
- [ ] API key generated and noted
- [ ] Usage limits configured (optional)
- [ ] Billing method configured

### AWS S3 (for Video Storage)
- [ ] AWS account created
- [ ] S3 bucket created: `vom-video-to-posts-bucket`
- [ ] Bucket versioning enabled
- [ ] Public access blocked (bucket is private)
- [ ] IAM user created for app with limited S3 permissions
- [ ] Access key ID and secret key generated and noted
- [ ] IAM policy attached (see template below):
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::vom-video-to-posts-bucket",
          "arn:aws:s3:::vom-video-to-posts-bucket/*"
        ]
      }
    ]
  }
  ```
- [ ] CORS configured for S3 bucket:
  ```json
  [
    {
      "AllowedOrigins": ["https://vom-video-to-posts.vercel.app"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
  ```

### GitHub OAuth App (for Authentication)
- [ ] GitHub OAuth app created at https://github.com/settings/developers
- [ ] Application name: "VOM Video-to-Posts"
- [ ] Homepage URL: `https://vom-video-to-posts.vercel.app`
- [ ] Authorization callback URL: `https://vom-video-to-posts.vercel.app/api/auth/github/callback`
- [ ] Client ID and Client Secret generated and noted
- [ ] OAuth credentials added to Vercel environment variables

---

## 5. Security & Secrets

### JWT Secret
- [ ] JWT_SECRET generated using cryptographically secure random generator
  - Generate with: `openssl rand -base64 32`
  - Minimum length: 32 characters
  - Added to Vercel environment variables
  - NOT committed to repository

### API Keys
- [ ] All API keys are stored ONLY in Vercel environment variables
- [ ] No API keys appear in:
  - `.env` file (committed to git)
  - `.env.local` (excluded from git, but used locally)
  - Code files or comments
  - Git history
- [ ] `.env.local` excluded from git (.gitignore)
- [ ] `.env.example` contains placeholders (not real keys)

### CORS & CSP
- [ ] CORS headers configured in vercel.json
- [ ] Content Security Policy headers configured if needed
- [ ] Same-site cookie policy configured

---

## 6. Build & Deployment

### Local Testing
- [ ] Node.js version matches Vercel (20.x)
- [ ] `npm install` runs without errors
- [ ] `.env.local` created with test values
- [ ] `npm run build` completes successfully
- [ ] Build output exists in `dist/` directory
- [ ] No build warnings related to dependencies

### Vercel Deployment
- [ ] Git repository pushed to GitHub
- [ ] Vercel auto-deployment triggered
- [ ] Deployment preview created
- [ ] Deployment logs show no errors
- [ ] Production deployment successful
- [ ] Live URL accessible: `https://vom-video-to-posts.vercel.app`

### Post-Deployment Testing
- [ ] Application loads without errors
- [ ] GitHub OAuth login works
- [ ] Video upload form works
- [ ] Video processing starts
- [ ] Error handling works properly
- [ ] All environment variables accessible to functions

---

## 7. Monitoring & Logging

### Error Tracking (Sentry - Optional)
- [ ] Sentry account created
- [ ] Sentry project created for Video-to-Posts
- [ ] DSN generated and added to environment variables
- [ ] Error logging integrated in code
- [ ] Test error captured in Sentry

### Analytics (PostHog - Optional)
- [ ] PostHog account created
- [ ] API key generated
- [ ] Analytics events configured
- [ ] Event tracking verified

### Vercel Analytics
- [ ] Vercel Analytics enabled in project settings
- [ ] Web Vitals tracked
- [ ] Performance metrics monitored

---

## 8. Database & Backups

### Backup Strategy
- [ ] Supabase automatic backups enabled (daily)
- [ ] Backup retention set to appropriate duration
- [ ] Manual backup procedure documented
- [ ] Backup restoration tested

### Data Migration (if applicable)
- [ ] Data validation scripts created
- [ ] Production data backup taken before migration
- [ ] Migration tested on staging database
- [ ] Rollback plan documented

---

## 9. Documentation

### README Updates
- [ ] Project description added
- [ ] Installation instructions included
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Deployment instructions included

### Developer Documentation
- [ ] Architecture diagram created
- [ ] Database schema documented
- [ ] API documentation (OpenAPI/Swagger) created
- [ ] Setup guide for new developers
- [ ] Troubleshooting guide

### Deployment Documentation
- [ ] Deployment procedure documented
- [ ] Rollback procedure documented
- [ ] Environment variables list maintained
- [ ] Infrastructure changes logged

---

## 10. Team Access & Permissions

### Vercel
- [ ] Team members added to Vercel project
- [ ] Appropriate role levels assigned:
  - [ ] Owner (1-2 people)
  - [ ] Admin (developers)
  - [ ] Viewer (stakeholders)

### GitHub
- [ ] Team members added to repository
- [ ] Branch protection rules configured
- [ ] Code review requirements set
- [ ] Required status checks enabled

### Supabase
- [ ] Team members invited to organization
- [ ] Appropriate access levels assigned

### AWS
- [ ] IAM users created for each team member (if needed)
- [ ] Permissions limited to necessary resources

---

## 11. CI/CD Pipeline (Optional)

- [ ] GitHub Actions workflow configured (if using)
- [ ] Tests run on pull requests
- [ ] Linting checks enabled
- [ ] Builds triggered on push to main
- [ ] Automated deployments configured

---

## 12. SSL/TLS & Domain

### SSL Certificate
- [ ] Vercel-managed SSL certificate enabled (automatic)
- [ ] Certificate valid and not expiring
- [ ] HTTPS enforced for all routes

### Domain (Optional)
- [ ] Custom domain registered (if not using *.vercel.app)
- [ ] DNS records configured to point to Vercel
- [ ] Domain verified in Vercel
- [ ] HTTPS working on custom domain

---

## 13. Performance & Optimization

### Frontend
- [ ] Code splitting implemented
- [ ] Lazy loading for components
- [ ] Image optimization applied
- [ ] Bundle size analyzed and optimized

### Backend
- [ ] Database queries optimized
- [ ] Indexes created for large tables
- [ ] Caching strategy implemented
- [ ] Rate limiting configured

### Vercel Optimization
- [ ] Edge functions used for performance
- [ ] Caching headers configured
- [ ] Image optimization enabled

---

## 14. Compliance & Legal

- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] GDPR compliance reviewed
- [ ] Data retention policy defined
- [ ] Cookie consent (if applicable) configured

---

## Final Sign-Off

- [ ] All checklist items completed
- [ ] Production URL tested and working
- [ ] Team notified of production deployment
- [ ] Release notes/changelog updated
- [ ] Monitoring alerts configured
- [ ] Incident response plan documented

**Deployment Date:** _______________

**Deployed By:** _______________

**Verified By:** _______________

---

## Rollback Plan

If deployment fails or issues are discovered:

1. [ ] Identify issue in Vercel logs
2. [ ] Rollback to previous deployment version in Vercel dashboard
3. [ ] Notify team of rollback
4. [ ] Fix issue in code
5. [ ] Re-test locally
6. [ ] Re-deploy to Vercel

---

## Support Contacts

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/docs
- **OpenAI API Support:** https://help.openai.com
- **Anthropic Support:** https://console.anthropic.com
