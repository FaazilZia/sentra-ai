# Sentra AI Node Backend - API Testing Guide

This guide provides instructions and examples for testing the newly implemented Node.js/Express backend.

## Base URL
The backend is currently running at `http://localhost:5001`.

## Endpoints

### 1. Authentication

#### Register a new user
**POST** `/api/auth/register`
```json
{
  "email": "admin@sentra.ai",
  "password": "password123",
  "fullName": "Admin User",
  "role": "ADMIN"
}
```

#### Login
**POST** `/api/auth/login`
```json
{
  "email": "admin@sentra.ai",
  "password": "password123"
}
```
*Response includes `accessToken` and `refreshToken`.*

#### Refresh Token
**POST** `/api/auth/refresh-token`
```json
{
  "token": "YOUR_REFRESH_TOKEN_HERE"
}
```

#### Get Current User
**GET** `/api/auth/me`
*Headers:* `Authorization: Bearer <ACCESS_TOKEN>`

---

### 2. Incidents

#### List Incidents
**GET** `/api/incidents`
*Headers:* `Authorization: Bearer <ACCESS_TOKEN>`

#### Get Incident by ID
**GET** `/api/incidents/<incident_id>`
*Headers:* `Authorization: Bearer <ACCESS_TOKEN>`

#### Resolve Incident (Admin Only)
**PATCH** `/api/incidents/<incident_id>/resolve`
*Headers:* `Authorization: Bearer <ACCESS_TOKEN>`
*Body:*
```json
{
  "status": "RESOLVED"
}
```

---

### 3. Public / Utility

#### Health Check
**GET** `/api/health`

#### Root Route
**GET** `/`

## Security Features Tested
- **Rate Limiting**: Auth routes limit to 20 reqs/15m. API routes limit to 100 reqs/15m.
- **Input Validation**: Zod ensures correct data types and email formats.
- **RBAC**: Unauthorized roles will receive a 403 Forbidden error for admin-only routes.
- **Headers**: Helmet is used to set secure HTTP headers.
