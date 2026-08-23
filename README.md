# Nexoratel

Nexoratel is a production-oriented IT operations and employee work-management platform. It combines ticket workflows, SLA monitoring, activity journals, team analytics, audit trails, role-based administration, and email notifications.

## Stack

- React 18, Vite, Tailwind CSS, Recharts
- Node.js 20+, Express 5, Prisma
- PostgreSQL
- Docker and Render Blueprint deployment

## Project layout

```text
./                    Express API and Prisma schema
frontend/             React single-page application
render.yaml            Render infrastructure blueprint
```

## Local setup

1. Copy `.env.example` to `.env` and configure PostgreSQL and a strong JWT secret.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. In the backend directory, run `npm ci`, `npx prisma migrate dev`, and `npm run dev`.
4. In the frontend directory, run `npm ci` and `npm run dev`.

The API runs on port 3000 and the frontend on port 5173 by default.

## First administrator

Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` of at least 12 characters, then run `npm run seed` in the backend. No default or demo credentials are included.

## Security model

- Access tokens expire after 25 minutes.
- Refresh tokens are stored in `HttpOnly` cookies and backed by database sessions.
- Production boot validates critical environment variables.
- CORS accepts only configured origins.
- Passwords use bcrypt with a work factor of 12.
- Login throttling, account lockout, Helmet headers, RBAC, audit logs, and soft deletion are enabled.

## Verification

```bash
cd nexoratel
npm test
npm run check

cd frontend
npm run lint
npm run build
```

## Deployment

The included `render.yaml` provisions PostgreSQL, the API, and the static frontend. In Render:

1. Create a Blueprint from this repository.
2. Set `FRONTEND_URL` and `CORS_ORIGINS` to the frontend URL.
3. Set `VITE_API_BASE_URL` to the API URL.
4. Configure SMTP variables if email delivery is required.
5. Deploy and confirm `/health` and `/ready` on the API.

Database migrations run through `prisma migrate deploy` during the API build. Only one service instance should have `RUN_CRON=true`.

## Production checklist

- Use a custom domain and HTTPS.
- Configure verified SMTP credentials.
- Create the first administrator using environment-provided credentials.
- Enable managed PostgreSQL backups and test restoration.
- Add error monitoring and central log retention.
- Run the verification commands before every release.

## License

Proprietary unless a license is added by the repository owner.
