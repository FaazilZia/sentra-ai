# Sentra AI — SAML 2.0 SSO Integration & Testing Guide

This developer guide provides comprehensive, step-by-step instructions for configuring and testing real SAML 2.0 Single Sign-On (SSO) and SCIM provisioning in Sentra AI against production Identity Providers (IdPs) like Okta and Microsoft Entra ID (formerly Azure Active Directory).

---

## 1. Okta SAML 2.0 App Setup

To configure Okta as your SAML Identity Provider for Sentra AI:

1. **Log in to the Okta Admin Console** as an administrator.
2. **Navigate to Applications** → **Applications** → click **Create App Integration**.
3. **Select Integration Type**:
   - Choose **SAML 2.0** and click **Next**.
4. **General Settings**:
   - **App name**: `Sentra AI`
   - **App logo** (Optional): Upload Sentra's logo.
   - Click **Next**.
5. **Configure SAML**:
   - **Single sign-on URL (ACS)**: Set this to your Sentra instance's ACS callback URL:
     `{BACKEND_URL}/api/v1/saml/{orgSlug}/callback`
     *(e.g., `http://localhost:10000/api/v1/saml/my-org/callback`)*
   - **Audience URI (SP Entity ID)**: Set this to Sentra's Service Provider entity metadata URL:
     `{BACKEND_URL}/api/v1/saml/{orgSlug}/metadata`
     *(e.g., `http://localhost:10000/api/v1/saml/my-org/metadata`)*
   - **Name ID format**: Select **EmailAddress**.
   - **Application username**: Select **Email**.
6. **Attribute Statements (Claims Mapping)**:
   Add the following statements to map assertion claims:
   - **Name**: `email` | **Value**: `user.email`
   - **Name**: `name` | **Value**: `user.firstName + " " + user.lastName`
7. Click **Next** → Select **"I'm an Okta customer adding an internal app"** → click **Finish**.
8. **Retrieve IdP Metadata XML**:
   - On the newly created app page, go to the **Sign On** tab.
   - Under the **SAML Setup** section, locate the **Metadata URL** or click **View SAML setup instructions**.
   - Save or copy the **Identity Provider Metadata XML** content completely.

---

## 2. Microsoft Entra ID (Azure AD) Setup

To configure Microsoft Entra ID as your SAML Identity Provider:

1. **Log in to the Microsoft Entra Admin Center** (or Azure Portal).
2. Navigate to **Identity** → **Applications** → **Enterprise applications** → click **New application** → **Create your own application**.
3. **App Creation**:
   - **Name**: `Sentra AI`
   - **Integration Option**: Select **"Integrate any other application you don't find in the gallery (Non-gallery)"** and click **Create**.
4. **Configure Single Sign-On**:
   - Under the **Getting Started** dashboard, select **2. Set up single sign on** → click **SAML**.
5. **Basic SAML Configuration**:
   - Click **Edit** and enter:
     - **Identifier (Entity ID)**: `{BACKEND_URL}/api/v1/saml/{orgSlug}/metadata`
     - **Reply URL (Assertion Consumer Service URL)**: `{BACKEND_URL}/api/v1/saml/{orgSlug}/callback`
     - **Sign on URL** (Optional): `{BACKEND_URL}/api/v1/saml/{orgSlug}`
   - Click **Save**.
6. **Attributes & Claims**:
   - Ensure the required claims are mapped:
     - `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` mapped to `user.mail`
     - `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` mapped to `user.displayname`
7. **SAML Certificates**:
   - Find the **Federation Metadata XML** option.
   - Click **Download** next to **Federation Metadata XML** (or copy its link) and extract the full XML document.

---

## 3. Configuring Sentra AI SSO

Once you have downloaded the **IdP Metadata XML** string from Okta or Entra ID, you need to configure Sentra using our secure JWT-authenticated administrative configuration endpoint.

### Configuration Endpoint
*   **Method**: `PUT`
*   **URL**: `/api/v1/sso/config`
*   **Authentication**: Required (JWT Bearer Token with `ADMIN` role role mapping)

### Example Curl Request

```bash
curl -X PUT http://localhost:10000/api/v1/sso/config \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sso_provider": "Okta",
    "idpMetadataXml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><EntityDescriptor ... > ... </EntityDescriptor>",
    "allowedEmailDomains": ["acme.com", "subsidiary.com"],
    "attributeMapping": {
      "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
    }
  }'
```

### Request Payload Description
- `sso_provider`: String identifier for the provider (e.g. `Okta`, `EntraID`, `Ping`).
- `idpMetadataXml`: The escaped, raw XML metadata string downloaded from your Identity Provider.
- `allowedEmailDomains`: (Optional) Array or comma-separated string of permitted email domains (e.g., `["acme.com", "subsidiary.com"]` or `"acme.com, subsidiary.com"`).
  > **Domain Restriction Note**: When `allowedEmailDomains` contains one or more domains, SAML assertions with email addresses outside these domains are rejected with `SAML_SSO_LOGIN_REJECTED` audit logs. If the list is empty (`[]`) or omitted on initial setup, the domain rule is **OFF**, and assertions for any domain signed by the trusted IdP are accepted. When updating other SSO configuration fields later, omitting `allowedEmailDomains` keeps the existing configured domains intact.
- `attributeMapping`: Claims mapping dictionary matching assertion attributes to Sentra's internal structure:
  - `email`: Claim URI/Name containing user emails.
  - `name`: Claim URI/Name containing user full names.

---

## 4. Testing the Login Flow

With the configuration active, test the authentication round-trip:

1. **Trigger SSO Login**:
   - Navigate your browser directly to:
     `{BACKEND_URL}/api/v1/saml/{orgSlug}`
     *(e.g., `http://localhost:10000/api/v1/saml/my-org`)*
2. **Redirection to IdP**:
   - Sentra will parse your tenant configuration, build a secure SAML Request payload, and redirect your browser to the Okta or Entra ID login portal.
3. **Authenticate**:
   - Enter your credentials on your Identity Provider's secure login screen.
4. **Assertion Callback**:
   - Upon successful credentials verification, the IdP will POST an XML assertion token back to your ACS Endpoint:
     `{BACKEND_URL}/api/v1/saml/{orgSlug}/callback`
5. **Dashboard Transition (Success)**:
   - Sentra's backend processes the signature assertion, registers the user if they are logging in for the first time (provisioned as a standard `MEMBER`), sets secure JWT cookies (`sentra_access_token` and `sentra_refresh_token`), and redirects your browser to:
     `{FRONTEND_URL}/dashboard`
6. **Error Redirection (Failure)**:
   - If signature verification, issuer validations, or attribute mapping parsing fail, the callback will redirect you to:
     `{FRONTEND_URL}/login?error=sso_failed`

---

## 5. Troubleshooting & Gotchas

### Common Problems & Solutions

#### 1. Clock Skew Error (`SAML assertion expired`)
- **Symptoms**: Immediate failure and redirect to `/login?error=sso_failed` with logs printing expired timestamps.
- **Cause**: The server time is out of sync with your IdP server time.
- **Solution**: Synchronize your server time using NTP (`ntpdate` or system clock synchronization). In development, verify your system clock is accurate.

#### 2. Invalid ACS Location (`404 Not Found` or `500 Server Error`)
- **Symptoms**: Redirect fails on the callback POST.
- **Cause**: The Single Sign-On ACS URL set in Okta/Entra ID does not match the exact route format or org slug.
- **Solution**: Ensure your routes are registered correctly. Under Sentra's routing architecture, SSO routes are mounted directly without `/auth` or `/sso` prefixes (e.g., `/api/v1/saml/:orgSlug/callback`).

#### 3. Missing Attributes Mapping
- **Symptoms**: Authentication succeeds, but logged-in user profiles are populated with incomplete/blank fields or email placeholders.
- **Cause**: Attributes mapped in Okta/Entra do not match the keys defined in Sentra's `attributeMapping` dictionary.
- **Solution**: Inspect the IdP Metadata XML and assertion XML trace, verify the claim URIs, and run the `PUT /api/v1/sso/config` update with exact matching claim URIs.

#### 4. Checking the Immutable Audit Logs
- Every successful login records a `SAML_SSO_LOGIN_SUCCESS` event in Sentra's audit logs.
- Search the `audit_logs` table for:
  ```sql
  SELECT * FROM audit_logs WHERE action = 'SAML_SSO_LOGIN_SUCCESS' ORDER BY timestamp DESC;
  ```
- If an assertion fails, check the Node.js process stdout for `[SAML-SSO] SAML callback processing failed:` logs to obtain the detailed error stack trace.
