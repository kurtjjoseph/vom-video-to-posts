# VOM Video-to-Posts API Configuration

## Overview

The Video-to-Posts API provides serverless functions for:
1. **Video Upload & Storage** - Upload to S3
2. **Transcription** - Convert video to text using OpenAI Whisper
3. **Post Generation** - Generate 9 social media posts using Claude
4. **Authentication** - GitHub OAuth via Supabase
5. **Data Management** - CRUD operations on Supabase

---

## Vercel Configuration (vercel.json)

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    // API Keys
    "OPENAI_API_KEY": "@openai_api_key",
    "ANTHROPIC_API_KEY": "@anthropic_api_key",
    
    // Database
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_ANON_KEY": "@supabase_anon_key",
    
    // Storage
    "AWS_S3_BUCKET": "@aws_s3_bucket",
    "AWS_ACCESS_KEY_ID": "@aws_access_key_id",
    "AWS_SECRET_ACCESS_KEY": "@aws_secret_access_key",
    
    // Security
    "JWT_SECRET": "@jwt_secret",
    
    // OAuth
    "GITHUB_CLIENT_ID": "@github_client_id",
    "GITHUB_CLIENT_SECRET": "@github_client_secret",
    
    // Environment
    "NODE_ENV": "production"
  },
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 900,  // 15 minutes for long-running tasks
      "memory": 3008       // 3GB for processing large videos
    }
  }
}
```

---

## API Endpoints

### Authentication

#### POST /api/auth/github/callback
**GitHub OAuth callback**

- **Method:** POST
- **Query Params:** `code`, `state`
- **Response:** `{ token: string, user: User }`
- **Dependencies:** Supabase Auth

**Flow:**
1. Frontend redirects to GitHub OAuth
2. GitHub redirects back with `code`
3. Backend exchanges `code` for access token
4. Backend creates/updates user in Supabase
5. Backend returns JWT token to frontend

---

### Video Management

#### POST /api/videos/upload
**Upload video file to S3**

- **Method:** POST
- **Headers:** 
  - `Authorization: Bearer <jwt_token>`
  - `Content-Type: multipart/form-data`
- **Body:**
  ```json
  {
    "file": File,
    "title": "string",
    "description": "string"
  }
  ```
- **Response:**
  ```json
  {
    "id": "uuid",
    "video_url": "https://s3.amazonaws.com/...",
    "status": "pending"
  }
  ```
- **Dependencies:** AWS S3, Supabase

**Implementation:**
```typescript
export const POST = async (req: Request) => {
  // 1. Authenticate user (check JWT)
  // 2. Validate file (check size < 500MB, format)
  // 3. Upload to S3
  // 4. Create video record in Supabase
  // 5. Trigger transcription job
  // 6. Return video object
}
```

---

#### GET /api/videos/:id
**Get video details**

- **Method:** GET
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response:**
  ```json
  {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "video_url": "string",
    "status": "processing|transcribed|posts_generated|completed",
    "transcript": { ... },
    "posts": [ ... ],
    "created_at": "ISO8601"
  }
  ```
- **Dependencies:** Supabase

---

#### GET /api/videos
**List user's videos**

- **Method:** GET
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Query Params:** `limit`, `offset`, `status`
- **Response:**
  ```json
  {
    "videos": [ ... ],
    "total": 42,
    "limit": 10,
    "offset": 0
  }
  ```
- **Dependencies:** Supabase

---

#### DELETE /api/videos/:id
**Delete video and associated data**

- **Method:** DELETE
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response:** `{ success: true }`
- **Dependencies:** AWS S3, Supabase

**Implementation:**
1. Verify ownership (user can only delete their own videos)
2. Delete from S3
3. Delete transcript from Supabase
4. Delete posts from Supabase
5. Delete video record from Supabase
6. Return success

---

### Processing Jobs

#### POST /api/videos/:id/transcribe
**Start video transcription job**

- **Method:** POST
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response:**
  ```json
  {
    "job_id": "uuid",
    "status": "pending",
    "created_at": "ISO8601"
  }
  ```
- **Dependencies:** OpenAI API, Supabase

**Implementation:**
1. Check video status (must be "pending")
2. Create processing job record in Supabase
3. Call OpenAI Whisper API:
   ```python
   response = openai.Audio.transcribe(
     model="whisper-1",
     file=open(video_file, "rb"),
     language="en"
   )
   ```
4. Store transcript in Supabase
5. Update video status to "transcribed"
6. Trigger post generation job
7. Return job status

**Error Handling:**
- If video > 25MB: split into chunks
- If transcription fails: store error_message, set status to "failed"
- Timeout: 15 minutes (Vercel limit)

---

#### POST /api/videos/:id/generate-posts
**Generate social media posts from transcript**

- **Method:** POST
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response:**
  ```json
  {
    "posts": [
      {
        "platform": "twitter",
        "post_number": 1,
        "content": "...",
        "hashtags": [ "...", "..." ]
      }
    ],
    "status": "completed"
  }
  ```
- **Dependencies:** Anthropic API, Supabase

**Implementation:**
```python
# 1. Get transcript from Supabase
transcript = supabase.table('transcripts').select('*').eq('video_id', video_id)

# 2. Call Claude API
prompt = f"""
Generate 9 social media posts (3 per platform) from this transcript:
{transcript.full_text}

Platforms: Twitter (280 chars), LinkedIn (3000 chars), Instagram (2200 chars)

Return JSON:
{{
  "posts": [
    {{"platform": "twitter", "post_number": 1, "content": "...", "hashtags": []}},
    ...
  ]
}}
"""

response = anthropic.messages.create(
  model="claude-3-5-sonnet-20241022",
  max_tokens=2000,
  messages=[{"role": "user", "content": prompt}]
)

# 3. Parse response
posts = json.loads(response.content[0].text)

# 4. Store in Supabase
for post in posts['posts']:
  supabase.table('social_posts').insert({
    'video_id': video_id,
    'platform': post['platform'],
    'post_number': post['post_number'],
    'content': post['content'],
    'hashtags': post['hashtags'],
    'generated_by_model': 'claude-3-5-sonnet'
  })

# 5. Update video status
supabase.table('videos').update({'status': 'posts_generated'}).eq('id', video_id)
```

**Error Handling:**
- If Claude API fails: retry with exponential backoff
- If JSON parsing fails: store raw response, log error
- Timeout: 15 minutes

---

#### GET /api/jobs/:id
**Get processing job status**

- **Method:** GET
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response:**
  ```json
  {
    "id": "uuid",
    "job_type": "transcription|post_generation",
    "status": "pending|processing|completed|failed",
    "progress_percent": 45,
    "error_message": null,
    "created_at": "ISO8601",
    "completed_at": "ISO8601"
  }
  ```
- **Dependencies:** Supabase

---

### Social Posts

#### GET /api/videos/:id/posts
**Get generated posts for video**

- **Method:** GET
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Query Params:** `platform` (optional filter)
- **Response:**
  ```json
  {
    "posts": [
      {
        "id": "uuid",
        "platform": "twitter",
        "post_number": 1,
        "content": "...",
        "hashtags": ["#example"],
        "character_count": 280
      }
    ]
  }
  ```
- **Dependencies:** Supabase

---

#### PATCH /api/posts/:id
**Update post feedback**

- **Method:** PATCH
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Body:**
  ```json
  {
    "user_feedback": "positive|negative|neutral"
  }
  ```
- **Response:** `{ success: true, post: {...} }`
- **Dependencies:** Supabase

**Use Case:** Track which posts users liked to improve future generation

---

#### POST /api/posts/:id/publish
**Publish post to social media**

- **Method:** POST
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Body:**
  ```json
  {
    "platform": "twitter",
    "credentials": { ... }
  }
  ```
- **Response:** `{ success: true, published_url: "..." }`
- **Dependencies:** Twitter API, LinkedIn API, etc.

**Note:** Not implemented yet - requires OAuth for each platform

---

### User Profile

#### GET /api/auth/me
**Get current user profile**

- **Method:** GET
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response:**
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john-doe",
    "avatar_url": "https://...",
    "created_at": "ISO8601"
  }
  ```
- **Dependencies:** Supabase

---

#### PATCH /api/auth/me
**Update user profile**

- **Method:** PATCH
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Body:**
  ```json
  {
    "username": "new-username",
    "avatar_url": "https://..."
  }
  ```
- **Response:** `{ success: true, user: {...} }`
- **Dependencies:** Supabase

---

### Analytics

#### POST /api/analytics/event
**Log usage analytics**

- **Method:** POST
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Body:**
  ```json
  {
    "event_type": "video_uploaded|transcription_started|posts_generated",
    "metadata": { ... }
  }
  ```
- **Response:** `{ success: true }`
- **Dependencies:** PostHog, Supabase

---

## Environment Variables Reference

| Variable | Type | Purpose | Example |
|----------|------|---------|---------|
| `OPENAI_API_KEY` | Secret | Whisper transcription | `sk-proj-...` |
| `ANTHROPIC_API_KEY` | Secret | Social post generation | `sk-ant-...` |
| `SUPABASE_URL` | URL | Database connection | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Secret | Frontend database auth | `eyJx...` |
| `SUPABASE_SERVICE_KEY` | Secret | Backend database auth | `eyJx...` |
| `AWS_ACCESS_KEY_ID` | Secret | S3 authentication | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Secret | S3 authentication | `wJal...` |
| `AWS_S3_BUCKET` | String | S3 bucket name | `vom-video-to-posts-bucket` |
| `AWS_REGION` | String | AWS region | `us-east-1` |
| `JWT_SECRET` | Secret | Token signing | `random-32-char-string` |
| `GITHUB_CLIENT_ID` | String | OAuth app ID | `abc123def456` |
| `GITHUB_CLIENT_SECRET` | Secret | OAuth app secret | `gho_...` |
| `GITHUB_REDIRECT_URI` | URL | OAuth callback | `https://...vercel.app/api/auth/github/callback` |
| `NODE_ENV` | String | Runtime environment | `production` |

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid file format",
    "details": { ... }
  }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_REQUIRED` | 401 | Missing/invalid authentication token |
| `FORBIDDEN` | 403 | User lacks permission |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `NOT_FOUND` | 404 | Resource not found |
| `FILE_TOO_LARGE` | 413 | File exceeds 500MB limit |
| `UNSUPPORTED_FORMAT` | 415 | File format not supported |
| `SERVICE_UNAVAILABLE` | 503 | External service down (OpenAI, etc.) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

Implemented via Supabase `api_usage` table:

- **Free Tier:** 10 videos/month, 100 API calls/day
- **Pro Tier:** 100 videos/month, 1000 API calls/day

**Configuration:**
```typescript
const checkRateLimit = async (userId: string) => {
  const usage = await supabase
    .table('api_usage')
    .select('*')
    .eq('user_id', userId)
    .gte('reset_at', new Date())
  
  if (usage[0]?.request_count >= LIMIT) {
    throw new Error('Rate limit exceeded')
  }
}
```

---

## Deployment Verification Checklist

- [ ] All environment variables added to Vercel
- [ ] Database schema deployed to Supabase
- [ ] S3 bucket created with CORS configured
- [ ] GitHub OAuth app configured with callback URL
- [ ] OpenAI API key active and tested
- [ ] Anthropic API key active and tested
- [ ] JWT_SECRET generated with 32+ random characters
- [ ] All endpoints tested locally with `.env.local`
- [ ] Vercel deployment successful
- [ ] Live endpoints responding correctly
- [ ] Monitoring/error tracking configured

---

Last Updated: August 13, 2026
