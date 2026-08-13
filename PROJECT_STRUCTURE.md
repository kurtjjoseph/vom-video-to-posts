# Project Structure

## Complete File Listing

### Root Directory
```
video-to-posts/
├── README.md                          # Main documentation
├── DEPLOYMENT.md                      # Deployment guide
├── PROJECT_STRUCTURE.md              # This file
├── .env.example                       # Environment variables template
├── .gitignore                         # Git ignore rules
├── .npmrc                            # NPM configuration
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Actions CI/CD
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── vercel.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── .env.example
│   ├── public/                        # Static assets
│   └── src/
│       ├── main.tsx                   # Entry point
│       ├── App.tsx                    # Root component
│       ├── types/
│       │   └── index.ts              # TypeScript types
│       ├── styles/
│       │   └── index.css             # Global styles
│       ├── services/
│       │   └── api.ts                # API client
│       ├── hooks/
│       │   └── useApi.ts             # API hook
│       ├── components/
│       │   ├── Layout.tsx            # Main layout
│       │   ├── UploadZone.tsx        # File upload component
│       │   └── PostEditor.tsx        # Post editor modal
│       └── pages/
│           ├── Dashboard.tsx         # Dashboard page
│           ├── Upload.tsx            # Upload page
│           ├── Posts.tsx             # Posts listing
│           └── VideoDetail.tsx       # Video detail page
│
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── vercel.json
    ├── src/
    │   ├── server.ts                 # Express server
    │   ├── index.ts                  # Exports
    │   ├── types/
    │   │   └── index.ts              # TypeScript types
    │   ├── middleware/
    │   │   └── auth.ts               # Clerk authentication
    │   ├── services/
    │   │   ├── transcription.ts      # Whisper transcription
    │   │   ├── postGeneration.ts     # Claude post generation
    │   │   ├── storage.ts            # Vercel Blob/S3 upload
    │   │   └── export.ts             # JSON/CSV export
    │   └── routes/
    │       ├── videos.ts             # Video endpoints
    │       ├── posts.ts              # Post endpoints
    │       └── dashboard.ts          # Dashboard endpoints
    └── prisma/
        ├── schema.prisma             # Database schema
        └── migrations/
            ├── migration_lock.toml
            └── 0_init/
                └── migration.sql     # Initial schema
```

## Key Files Description

### Frontend
- **App.tsx**: Router setup with Clerk authentication
- **Layout.tsx**: Navigation sidebar and header
- **pages/Dashboard.tsx**: Stats, recent videos, activity
- **pages/Upload.tsx**: Drag-drop upload, processing status
- **pages/Posts.tsx**: Post management, export functionality
- **components/UploadZone.tsx**: File upload with validation
- **components/PostEditor.tsx**: Modal editor for posts
- **services/api.ts**: Axios client with all API methods
- **hooks/useApi.ts**: React hook for API client initialization

### Backend
- **server.ts**: Express app with middleware and routes
- **middleware/auth.ts**: Clerk JWT verification
- **services/transcription.ts**: OpenAI Whisper API integration
- **services/postGeneration.ts**: Anthropic Claude API calls
- **services/storage.ts**: Vercel Blob or AWS S3 upload
- **services/export.ts**: JSON/CSV generation
- **routes/videos.ts**: Video upload, transcription, generation
- **routes/posts.ts**: Post CRUD, export
- **routes/dashboard.ts**: Statistics and analytics

### Database
- **prisma/schema.prisma**: 6 models (User, Video, Post, Metrics, UploadLog)
- **migrations/**: SQL migration with foreign keys, indexes

## Technology Stack

### Frontend
- React 18
- TypeScript 5
- Tailwind CSS 3
- Vite 5
- Clerk React
- Lucide React (icons)
- React Hot Toast (notifications)

### Backend
- Express.js 4
- TypeScript 5
- Prisma ORM 5
- Multer (file uploads)
- Axios (HTTP client)
- Clerk SDK

### Database
- PostgreSQL (Supabase)
- Prisma migrations

### External APIs
- OpenAI Whisper (transcription)
- Anthropic Claude 3.5 (post generation)
- Clerk (authentication)
- Vercel Blob or AWS S3 (storage)

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No implicit any
- All types exported

### Error Handling
- Try-catch blocks on async operations
- Proper HTTP status codes
- User-friendly error messages

### Database
- Indexed frequently queried fields
- Foreign key constraints
- Cascade delete for data integrity

### Security
- OAuth via Clerk
- API authentication middleware
- CORS configuration
- Environment variables for secrets

## Deployment Targets

- **Frontend**: https://vom-video-to-posts.vercel.app
- **Backend**: https://vom-video-to-posts-api.vercel.app
- **Database**: Supabase PostgreSQL
- **Storage**: Vercel Blob or AWS S3

## Environment Variables Required

### Backend (.env)
- DATABASE_URL
- CLERK_SECRET_KEY
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- VERCEL_BLOB_READ_WRITE_TOKEN (or AWS S3 creds)
- CORS_ORIGIN
- NODE_ENV

### Frontend (.env)
- VITE_API_URL
- VITE_CLERK_PUBLISHABLE_KEY

## API Endpoints (22 total)

### Videos (6)
- POST /api/videos
- GET /api/videos
- GET /api/videos/:id
- POST /api/videos/:id/transcribe
- POST /api/videos/:id/generate-posts
- DELETE /api/videos/:id

### Posts (6)
- GET /api/posts
- GET /api/posts/:id
- PUT /api/posts/:id
- DELETE /api/posts/:id
- POST /api/posts/export/:videoId

### Dashboard (3)
- GET /api/dashboard/stats
- GET /api/dashboard/analytics
- GET /api/dashboard/activity

### Auth (1)
- GET /api/auth/test

### Health (1)
- GET /health

## Database Schema (6 Tables)

### User
- id, clerkId, email, name, image

### Video
- id, userId, title, filename, size, duration
- blobUrl, s3Url, transcription, status, errorMessage

### Post
- id, userId, videoId, platform, content, imageUrl
- status, scheduledFor

### Metrics
- id, postId, views, likes, comments, shares, clicks

### UploadLog
- id, userId, videoId, action, status, duration, errorMessage, metadata

## Performance Optimizations

- Pagination on list endpoints (default 10-20)
- Database indexes on userId, status, platform, createdAt
- Response compression via Express
- Client-side caching in API client
- Image lazy loading in frontend

## Security Features

- GitHub OAuth via Clerk
- JWT token verification
- CORS middleware
- Environment variable encryption
- SQL injection prevention via Prisma
- XSS protection via React

## Development Workflow

1. Local development: `npm run dev` in both directories
2. Run migrations: `npm run prisma:migrate`
3. Build: `npm run build`
4. Test: `npm test` (hooks available)
5. Deploy: Push to main → GitHub Actions → Vercel

## Maintenance Tasks

- Update dependencies monthly: `npm update`
- Monitor API quotas (OpenAI, Anthropic)
- Rotate API keys quarterly
- Review database performance
- Archive old processing logs
- Update CORS allowlist as needed
