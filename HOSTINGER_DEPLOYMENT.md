# Hostinger deployment

This repository contains the backend application backed by the existing
Supabase PostgreSQL database. The deployed frontend is maintained separately:

- Backend: repository root (`/`), Express/Node.js

Deploy this backend as its own Hostinger Web App so its build, environment,
domain, and deployment lifecycle remain isolated from the frontend.

## Backend web app

Recommended domain: `api.nexorateltechnologies.com`

- Repository: `Darvince11/Tracking`
- Branch: `main`
- Root directory: `/`
- Node.js: 22
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm start`
- Health check: `/ready`

Hostinger's Express preset may hide the custom command fields. In that
interface, choose npm as the package manager and `src/app.js` as the entry
file. The `postinstall` script automatically generates Prisma Client and
applies pending migrations during dependency installation.

Production variables:

```env
NODE_ENV=production
DATABASE_URL=<SUPABASE_SESSION_POOLER_URL_PORT_5432>
JWT_SECRET=<AT_LEAST_32_RANDOM_CHARACTERS>
JWT_EXPIRES_IN=25m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://tracking.nexorateltechnologies.com
CORS_ORIGINS=https://tracking.nexorateltechnologies.com
RUN_CRON=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=nexorateltechnologies@gmail.com
SMTP_PASS=<GOOGLE_APP_PASSWORD>
SMTP_FROM=nexorateltechnologies@gmail.com
```

Use the Supabase Session pooler URL on port 5432 for this persistent Node.js
service. The build command applies committed Prisma migrations before the new
application version starts. Run exactly one backend instance while the internal
SLA scheduler is enabled.

## Verification

1. Open `https://api.nexorateltechnologies.com/health`.
2. Open `https://api.nexorateltechnologies.com/ready` and confirm HTTP 200.
3. Open `https://tracking.nexorateltechnologies.com` and sign in.
4. Confirm the browser Network panel sends API calls to the API subdomain.
5. Confirm backend logs show email initialization and one SLA scheduler.
