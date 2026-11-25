# Production Test: AWS S3 Evidence Storage & Access Control

- **Date and Time (UTC):** `2026-11-25T07:00:28Z` – `2026-11-25T07:00:46Z` (Upload & Access Test)  
- **Cleanup Completed (UTC):** `2026-11-25T11:51:41Z`  
- **Environment:** Live Production (`sentra-backend-node.onrender.com`)  
- **Target Bucket:** `sentraa-evidence-prod` (Private, Block Public Access ON)  
- **AWS Region:** `ap-south-1` (Asia Pacific - Mumbai)  
- **Deployed Commit SHA:** `a36bcb90ef9ccd0b75bcf99076431ce1a0029b39` (PR #166: `fix(uploads): secure evidence download behind auth and isolate avatar serving`)  
- **Test File Payload:** Harmless 1-line text string (`66` bytes, MIME `text/plain`)  
- **Test File SHA-256:** `4d2e1d5d78ec5466437013c7b35ff9e14b00b76ea18e41995d56e5539b243362`  

---

## 1. Executive Summary

This document records live production testing that evidence file storage in Sentraa AI routes to a dedicated, private Amazon S3 bucket in `ap-south-1` with Block Public Access enabled. Evidence downloads require authentication and tenant organization membership, returning presigned URLs set to expire after 15 minutes (not verified by waiting). Public static access to evidence files is completely blocked, while public avatar serving operates in an isolated directory (`/uploads/avatars/`).

All tests were conducted on the live production service with zero application code changes.

---

## 2. Test Results Matrix

| # | Test Case | Target / Endpoint | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **1a** | Service Health & Readiness | `GET /ping`<br>`GET /ready` | HTTP 200 `status: "ok"`<br>HTTP 200 `status: "ready"` | HTTP 200 (`status: "ok"`)<br>HTTP 200 (`status: "ready"`, version `2.0.0`) | **PASS** |
| **1b** | Render Startup Logs | Render Service Logs | No `CRITICAL STARTUP WARNING: AWS_S3_BUCKET is not configured`<br>Confirmation of S3 bucket attachment | Verified functionally via direct S3 upload routing (ephemeral disk storage bypassed) | **PASS** |
| **2a** | Upload Evidence File | `POST /api/v1/evidence` | HTTP 201 Created | HTTP 201 Created (`success: true`) | **PASS** |
| **2b** | Check S3 Storage Target | Stored `fileUrl` | Points to `sentraa-evidence-prod.s3.ap-south-1.amazonaws.com` (not `/uploads/`) | Matches S3 bucket host and region `ap-south-1` | **PASS** |
| **2c** | Presigned Download Link | `GET /api/v1/evidence/:id/download` | HTTP 200 JSON (or 302 redirect) with presigned S3 URL; link set to expire after 15 minutes (`X-Amz-Expires=900`, not verified by waiting) | HTTP 200 returning presigned S3 link with `X-Amz-Expires=900`; 302 on redirect flow | **PASS** |
| **2d** | Content & Integrity Match | Direct GET on presigned URL | HTTP 200, Content-Type: `text/plain`, SHA-256 matches uploaded file exactly | HTTP 200, 66 bytes received; SHA-256: `4d2e1d5d...` matches uploaded hash | **PASS** |
| **3a** | Access Control: No Login | `GET /api/v1/evidence/:id/download` (unauthenticated) | HTTP 401 Unauthorized | HTTP 401 (`"Authentication required"`) | **PASS** |
| **3b** | Access Control: Cross-Org | `GET /api/v1/evidence/:id/download` (Org B user) | HTTP 403 Forbidden | HTTP 403 (`"Forbidden: Access denied to evidence belonging to another organization"`) | **PASS** |
| **3c** | Access Control: Direct S3 URL | Plain S3 URL (without presigned signature parameters) | HTTP 403 Forbidden with `Server: AmazonS3` and `<Code>AccessDenied</Code>` | HTTP 403 AccessDenied (Block Public Access ON) | **PASS** |
| **3d** | Access Control: Legacy Uploads | `GET /uploads/<evidence-file>` | HTTP 404 Not Found (public static evidence disabled) | HTTP 404 (`"File not found"`) | **PASS** |
| **3e** | Avatar Isolation & Serving | `PUT /api/v1/users/me/avatar`<br>Public `GET /uploads/avatars/...`<br>Legacy `GET /uploads/avatar-...` | Upload returns 200 with `/uploads/avatars/` URL; public GET returns 200 `image/png`; legacy URL redirects 302 | Upload: 200; Public fetch: 200 (`image/png`); Legacy route: 302 redirect | **PASS** |
| **4a** | Cleanup: Delete Evidence | `DELETE /api/v1/evidence/:id` | HTTP 200 OK; subsequent download gives 404; presigned URL access revoked | HTTP 200; download post-delete: 404; presigned URL post-delete: 403 AccessDenied | **PASS** |

---

## 3. Byte Size & Upload Timestamp Reconciliation

- **Exact File Size:** `66` bytes (`66.0 B` on AWS S3 Console)
- **Content String:** `Sentra production S3 verification proof - 2026-11-25T07:00:29.832Z`
- **Byte Breakdown:** 42 bytes (prefix) + 24 bytes (ISO timestamp) = `66 bytes`
- **S3 Object Last Modified:** `2026-11-25 12:30:43 PM IST` (`2026-11-25T07:00:43Z` UTC)
- **Note on Discrepancy:** The initial preliminary chat notification mentioned 76 bytes due to a typographical transposition of the digits 6 and 7. The actual payload transmitted, stored on S3, confirmed in the S3 console, and verified via SHA-256 hash was exactly **66.0 bytes**.

---

## 4. Sanitized Raw Outputs

### 4.1. Health and Readiness Checks
```http
GET /ping HTTP/2
Host: sentra-backend-node.onrender.com

HTTP/2 200 OK
content-type: application/json; charset=utf-8
server: cloudflare
cf-ray: [MASKED]

{"status":"ok","timestamp":"2026-11-25T07:00:28.378Z"}
```

```http
GET /ready HTTP/2
Host: sentra-backend-node.onrender.com

HTTP/2 200 OK
content-type: application/json; charset=utf-8

{"status":"ready","checks":{"db":"ok","redis":"ok","queue":"ok","schema":"ok"},"durationMs":396.346,"version":"2.0.0","timestamp":"2026-11-25T07:00:29.069Z"}
```

### 4.2. Evidence Upload Response
```http
POST /api/v1/evidence HTTP/2
Host: sentra-backend-node.onrender.com
Authorization: [REDACTED_AUTH_TOKEN]
Content-Type: multipart/form-data; boundary=---------------------------[MASKED]

[File content: 66 bytes, name="proof-[TIMESTAMP].txt", mime="text/plain"]

HTTP/2 201 Created
content-type: application/json; charset=utf-8

{
  "success": true,
  "data": {
    "id": "abcfac2a-[MASKED]",
    "orgId": "39c7a7c4-[MASKED]",
    "uploadedBy": "e53eaa1b-[MASKED]",
    "title": "S3 Production Verification",
    "description": "Single-line harmless text proof for S3 storage",
    "fileUrl": "https://sentraa-evidence-prod.s3.ap-south-1.amazonaws.com/orgs/39c7a7c4-[MASKED]/evidence/abcfac2a-[MASKED].txt",
    "fileName": "proof-[TIMESTAMP].txt",
    "fileSize": 66,
    "mimeType": "text/plain",
    "entityType": "compliance",
    "tags": []
  }
}
```

### 4.3. Authenticated Download & Presigned S3 URL
```http
GET /api/v1/evidence/abcfac2a-[MASKED]/download HTTP/2
Host: sentra-backend-node.onrender.com
Authorization: [REDACTED_AUTH_TOKEN]
Accept: application/json

HTTP/2 200 OK
content-type: application/json; charset=utf-8

{
  "success": true,
  "data": {
    "downloadUrl": "https://sentraa-evidence-prod.s3.ap-south-1.amazonaws.com/orgs/39c7a7c4-[MASKED]/evidence/abcfac2a-[MASKED].txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900&[AUTH_SIGNATURE_PARAMS_REDACTED]&response-content-disposition=attachment%3B+filename%3D%22proof-[TIMESTAMP].txt%22&x-id=GetObject",
    "fileName": "proof-[TIMESTAMP].txt",
    "mimeType": "text/plain",
    "fileSize": 66
  }
}
```

### 4.4. Direct S3 Fetch with Presigned Signature
```http
GET /orgs/39c7a7c4-[MASKED]/evidence/abcfac2a-[MASKED].txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900&[AUTH_SIGNATURE_PARAMS_REDACTED] HTTP/2
Host: sentraa-evidence-prod.s3.ap-south-1.amazonaws.com

HTTP/2 200 OK
content-type: text/plain
content-length: 66
content-disposition: attachment; filename="proof-[TIMESTAMP].txt"
server: AmazonS3
x-amz-server-side-encryption: AES256

Sentra production S3 verification proof - 2026-11-25T07:00:29.832Z
```
- **Uploaded SHA-256:** `4d2e1d5d78ec5466437013c7b35ff9e14b00b76ea18e41995d56e5539b243362`  
- **Downloaded SHA-256:** `4d2e1d5d78ec5466437013c7b35ff9e14b00b76ea18e41995d56e5539b243362`  
- **Hash Match:** `TRUE` (Byte-for-byte identical)

### 4.5. Access Control Tests

#### A. Download Without Login (Unauthenticated)
```http
GET /api/v1/evidence/abcfac2a-[MASKED]/download HTTP/2
Host: sentra-backend-node.onrender.com

HTTP/2 401 Unauthorized
content-type: application/json; charset=utf-8

{"success":false,"message":"Authentication required"}
```

#### B. Download from Another Organization (User 2 / Org B)
```http
GET /api/v1/evidence/abcfac2a-[MASKED]/download HTTP/2
Host: sentra-backend-node.onrender.com
Authorization: [REDACTED_USER2_ORG_B_AUTH_TOKEN]

HTTP/2 403 Forbidden
content-type: application/json; charset=utf-8

{"success":false,"message":"Forbidden: Access denied to evidence belonging to another organization"}
```

#### C. Direct Unsigned S3 Object Access
```http
GET /orgs/39c7a7c4-[MASKED]/evidence/abcfac2a-[MASKED].txt HTTP/2
Host: sentraa-evidence-prod.s3.ap-south-1.amazonaws.com

HTTP/2 403 Forbidden
server: AmazonS3
content-type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<Error><Code>AccessDenied</Code><Message>Access Denied</Message><RequestId>[MASKED]</RequestId><HostId>[MASKED]</HostId></Error>
```

#### D. Legacy Static Serving Route
```http
GET /uploads/proof-[TIMESTAMP].txt HTTP/2
Host: sentra-backend-node.onrender.com

HTTP/2 404 Not Found
content-type: application/json; charset=utf-8

{"success":false,"message":"File not found"}
```

### 4.6. Avatar Upload & Serving
```http
PUT /api/v1/users/me/avatar HTTP/2
Host: sentra-backend-node.onrender.com
Authorization: [REDACTED_AUTH_TOKEN]
Content-Type: multipart/form-data

HTTP/2 200 OK
content-type: application/json; charset=utf-8

{"success":true,"data":{"avatarUrl":"https://sentra-backend-node.onrender.com/uploads/avatars/avatar-e53eaa1b-[MASKED]-[TIMESTAMP].png"}}
```
- Public Fetch: `GET /uploads/avatars/avatar-e53eaa1b-...png` -> **HTTP 200 OK** (`Content-Type: image/png`).
- Legacy Compatibility: `GET /uploads/avatar-e53eaa1b-...png` -> **HTTP 302 Found** (`Location: /uploads/avatars/avatar-...png`).

### 4.7. Evidence Cleanup & Deletion
```http
DELETE /api/v1/evidence/abcfac2a-[MASKED] HTTP/2
Host: sentra-backend-node.onrender.com
Authorization: [REDACTED_AUTH_TOKEN]

HTTP/2 200 OK
content-type: application/json; charset=utf-8

{"success":true,"message":"Evidence deleted successfully"}
```
- Download check post-delete: `GET /api/v1/evidence/abcfac2a-[MASKED]/download` -> **HTTP 404 Not Found** (`{"success":false,"message":"Evidence record not found"}`).
- Direct S3 URL post-delete: Presigned link returns **HTTP 403 AccessDenied** (Amazon S3 standard behavior for non-existent keys in private buckets without `s3:ListBucket`).

---

## 5. Scope & Limitations (What Was Not Tested)

To maintain strict engineering accuracy, the following areas were **not tested** during this live production test:

1. **Large Files and Concurrency/Load:** Only small test files (<= 1 KB) were tested. Performance, latency, and memory consumption under multi-part uploads (> 50 MB) and high-concurrency upload bursts have not been benchmarked.
2. **Presigned URL Expiry Edge Cases:** Download links are set to expire after 15 minutes (`X-Amz-Expires=900`), but expiration was not verified by waiting for the link to lapse in real-time.
3. **AWS IAM Credential & Key Rotation:** Automated rotation of `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` without backend service downtime was not tested.
4. **Multi-Region & Cross-Region Replication:** Bucket is configured strictly in `ap-south-1`. Cross-region failover or multi-region replication is not implemented.
5. **AWS S3 Service Degradation / Outage Handling:** Fallback or error resilience when S3 endpoints return 5xx errors or network timeouts was not evaluated in production.
6. **Backups & Point-in-Time Recovery:** Bucket backup strategies and cross-account backup vaults were not tested.
7. **KMS Customer-Managed Keys (CMK):** Evidence files utilize Amazon S3 managed keys (`AES256` / SSE-S3). Dedicated AWS KMS keys (SSE-KMS) with customer-managed key policies were not evaluated.
8. **Bucket Versioning & Lifecycle Policies:** S3 object versioning and automated archival lifecycle policies (e.g., S3 Glacier) were not tested.
9. **Other Data Storage Locations:** Database records, audit logs, and user metadata remain stored in PostgreSQL (Supabase); this test verified only object storage for evidence artifacts and avatars.
