# Lurevo CRM Frontend

React + TypeScript + Vite dashboard for the existing Go backend.

## Stack

- React, TypeScript, Vite
- Tailwind CSS with Rubik
- React Router
- TanStack React Query
- Axios with access-token injection and refresh-token retry queue
- React Hook Form and Zod
- React Icons
- Vitest and React Testing Library

## Setup

```bash
cd lurevo-crm-fe
cp .env.example .env
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`.

Backend URL is configured with:

```env
VITE_API_BASE_URL=http://localhost:8080
```

The app normalizes this to `/api/v1`. A value that already includes `/api/v1` is also supported.

## Backend Notes

The backend returns success responses as `{ "success": true, "data": ... }` and errors as `{ "success": false, "error": { "code", "message", "details" } }`.

Refresh tokens are returned in JSON from login and refresh. The frontend stores access and refresh tokens in one encapsulated localStorage module and sends `Authorization: Bearer <access>` on authenticated requests. On `401`, the Axios interceptor rotates the refresh token through `/auth/refresh`, queues concurrent failures behind one refresh request, retries the original request, and clears the session if refresh fails.

Owner-only collaborator creation is enforced in routes and by the backend. The backend currently exposes `POST /users/collaborators` only, so the frontend does not invent collaborator listing or deletion.

Image uploads use `multipart/form-data` through the backend only. Files are appended as `images`, with a UI limit of 15 images and 10 MB per file, matching backend defaults.

## Routes

- `/login`
- `/app/dashboard`
- `/app/listings`
- `/app/listings/new`
- `/app/listings/:id`
- `/app/listings/:id/edit`
- `/app/categories`
- `/app/listing-statuses`
- `/app/collaborators` owner only
- `/app/account`
- `/app/account/change-password`
- `/app/unauthorized`

## Scripts

```bash
npm run build
npm run lint
npm run test:run
```

## Backend Contract Issues Discovered

- Backend CORS defaults to `http://localhost:3000`, while Vite defaults to `http://localhost:5173`.
- Backend CORS currently advertises only `GET, POST, OPTIONS`, but this frontend needs `PATCH`, `DELETE`, and `PUT`.
- Swagger is not present, so contracts are derived from Go handlers, DTOs, services, and response helpers.

Create the first owner from the backend:

```bash
cd ../lurevo-crm-be
go run ./cmd/bootstrap-owner -email owner@example.com -password 'SecurePassword123!' -full-name 'Store Owner'
```
