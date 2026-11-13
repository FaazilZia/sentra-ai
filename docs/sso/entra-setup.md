# Sentraa AI — Microsoft Entra ID SAML 2.0 & SCIM 2.0 Setup Guide

This guide provides customer administrators with step-by-step instructions for configuring Microsoft Entra ID (formerly Azure Active Directory) Single Sign-On (SAML 2.0) and automated user lifecycle provisioning (SCIM 2.0) in Sentraa AI.

---

## Prerequisites

Before starting, ensure you have:
1. Administrator access to the **Microsoft Entra Admin Center** (`https://entra.microsoft.com`) or **Azure Portal** (`https://portal.azure.com`) with **Application Administrator**, **Cloud Application Administrator**, or **Global Administrator** privileges.
2. An **Admin** account in Sentraa AI.
3. Your Sentraa **Organization Slug** (e.g., `acme-corp`), visible in Sentraa **Settings → Single Sign-On (SSO)**.

---

## Part 1: Create the Microsoft Entra Enterprise Application

### Step 1: Open Enterprise Applications in Entra
1. Sign in to the **Microsoft Entra Admin Center** (`https://entra.microsoft.com`).
2. In the left navigation menu, navigate to **Identity → Applications → Enterprise applications**.
3. Click **+ New application**.

### Step 2: Create a Custom Non-Gallery Application
1. At the top of the gallery page, click **+ Create your own application**.
2. Under **What's the name of your app?**, enter: `Sentraa AI`.
3. Under **What are you looking to do with your application?**, select:
   * **"Integrate any other application you don't find in the gallery (Non-gallery)"**.
4. Click **Create** and wait a few moments while Entra provisions the application.

---

## Part 2: Configure SAML 2.0 Single Sign-On in Entra ID

### Step 1: Enable SAML Single Sign-On
1. In the application overview dashboard, select **Manage → Single sign-on** from the left sidebar.
2. In the **Select a single sign-on method** panel, click **SAML**.

### Step 2: Configure Basic SAML Settings
Click **Edit** (pencil icon) in the **Basic SAML Configuration** box (Section 1), then fill in the following exact values (replace `<ORG_SLUG>` with your tenant slug, and `<SENTRAA_BACKEND_URL>` with your Sentraa backend URL, e.g. `https://sentra-backend-node.onrender.com` or your custom domain):

| Entra Setting | Value to Enter | Notes |
| :--- | :--- | :--- |
| **Identifier (Entity ID)** | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/metadata` | Click **Add identifier** and check **Default** |
| **Reply URL (Assertion Consumer Service URL)** | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/callback` | Click **Add reply URL** and check **Default** |
| **Sign on URL** *(optional)* | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>` | SP-initiated login trigger URL |
| **Relay State** *(optional)* | *(leave blank)* | Optional |
| **Logout Url** *(optional)* | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/slo` | Single Logout (SLO) endpoint |

Click **Save** at the top of the pane and close the panel.

### Step 3: Configure Attributes & Claims
Click **Edit** in the **Attributes & Claims** box (Section 2).

#### 1. Unique User Identifier (Name ID)
* **Name identifier format**: `Email address` (or `Default`)
* **Source attribute**: `user.userprincipalname` (or `user.mail`)

#### 2. Additional Claims
Verify or add the standard Microsoft Entra claims:

| Claim Name | Namespace | Source Attribute | Sentraa Mapping |
| :--- | :--- | :--- | :--- |
| `emailaddress` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims` | `user.mail` | Primary corporate login email |
| `givenname` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims` | `user.givenname` | User first name |
| `surname` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims` | `user.surname` | User surname |
| `name` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims` | `user.userprincipalname` | User principal name / identity |
| `displayname` | `http://schemas.microsoft.com/identity/claims` | `user.displayname` | Formatted full name |

#### 3. Group Claims vs. Entra App Roles (Role Mapping)

> [!IMPORTANT]
> **Why Entra Group Claims Emit GUIDs by Default**:
> By default in Microsoft Entra ID, group claims emit directory Object IDs (GUIDs, e.g. `c7b8d451-9f22-48a5-8164-5969502b4d96`) rather than human-readable group names.
> Sentraa AI strictly enforces exact name matching against `DOCUMENTED_SAML_ROLE_MAP`. **Raw GUIDs will not match any role and will safely default to `VIEWER`**.
>
> **The Enterprise-Recommended Solution is Entra App Roles**:
> Defining App Roles in Microsoft Entra ID delivers deterministic, zero-configuration role assignment emitted directly in the standard role claim (`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`).

##### Option A: Configure Entra App Roles (Recommended)
1. In the Microsoft Entra Admin Center, navigate to **Identity → Applications → App registrations → All applications**.
2. Select your `Sentraa AI` application.
3. In the left navigation menu, select **App roles**, then click **+ Create app role**.
4. Create the required roles using the exact values from the table below:

| Display Name | Allowed Member Types | Value | Description | Sentraa Role |
| :--- | :--- | :--- | :--- | :--- |
| `Sentraa Admin` | Users/Groups | `SENTRA_ADMIN` | Organization administration, SSO settings, policies, and API keys | `ADMIN` |
| `Sentraa Engineer` | Users/Groups | `SENTRA_ENGINEER` | Agent discovery, LLM keys, SDK integration, and policy testing | `ENGINEER` |
| `Sentraa Auditor` | Users/Groups | `SENTRA_AUDITOR` | Read-only compliance frameworks, audit trails, and evidence | `AUDITOR` |
| `Sentraa Member` | Users/Groups | `SENTRA_MEMBER` | Standard workspace member | `MEMBER` |
| `Sentraa Viewer` | Users/Groups | `SENTRA_VIEWER` | Read-only dashboard view | `VIEWER` |

5. Click **Apply** for each role.
6. Now return to **Enterprise applications → Sentraa AI → Users and groups**:
   * Click **+ Add user/group**.
   * Select a user or corporate security group.
   * Under **Select a role**, choose the appropriate Sentraa App Role (e.g. `Sentraa Admin` or `Sentraa Engineer`).
   * Click **Assign**.
7. When assigned users authenticate, Entra emits the role value under `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`, which Sentraa immediately maps to the matching system role.

##### Option B: Cloud-Only Group Display Names (Alternative)
If your organization prefers using security groups without App Roles:
1. In the SAML Single Sign-On setup screen, under **Attributes & Claims**, click **+ Add a group claim**.
2. Select **Groups assigned to the application**.
3. Under **Source attribute**, change the dropdown from `Group ID` to **Cloud-only group display names** (requires Microsoft Entra ID P1/P2 license and cloud-managed groups).
4. Name your groups to match the exact documented names below (e.g. `SENTRA_ADMIN`, `SENTRA_ENGINEER`).

#### Documented Supported Role & Group Names
Sentraa matches incoming role and group claims strictly against an exact documented allowlist (case-insensitive). Loose substring matches (e.g. `Administrator`, `*_ADMIN`, `:ADMIN`, `Engineering-Team`) or raw GUIDs are rejected and default to `VIEWER`.

| Entra App Role / Group Value | Sentraa System Role | Permissions |
| :--- | :--- | :--- |
| `ADMIN` or `SENTRA_ADMIN` | `ADMIN` | Organization administration, SSO settings, policies, and API keys |
| `ENGINEER` or `SENTRA_ENGINEER` | `ENGINEER` | Agent discovery, LLM keys, SDK integration, and policy testing |
| `AUDITOR` or `SENTRA_AUDITOR` | `AUDITOR` | Read-only compliance frameworks, audit trails, and evidence |
| `MEMBER` or `SENTRA_MEMBER` | `MEMBER` | Standard workspace member |
| `VIEWER` or `SENTRA_VIEWER` | `VIEWER` | Read-only dashboard view (default for GUIDs and unmapped groups) |

> **Security Guard on Roles**:
> Sentraa strictly enforces tenant isolation.
> **Privilege Escalation Protection**: The platform-wide `SUPER_ADMIN` role can **never** be granted via SAML assertions. Any assertion attempting to grant `SUPER_ADMIN` is demoted to `VIEWER` with a security audit warning.

### Step 4: Download Federation Metadata XML
1. Scroll to **SAML Certificates** (Section 3).
2. Locate **Federation Metadata XML**.
3. Click **Download** to save the metadata XML document to your local machine (or copy the **App Federation Metadata Url**).

---

## Part 3: Connect Microsoft Entra ID to Sentraa AI

### Step 1: Configure SSO in Sentraa
1. In Sentraa AI, log in as an **Admin** and navigate to **Settings → Single Sign-On (SSO)**.
2. **SSO Provider Name**: `Microsoft Entra ID (SAML 2.0)`.
3. **Attribute Mapping Preset**: Select **Microsoft Entra ID / SAML 2.0** from the dropdown. This automatically sets:
   * `email` → `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
   * `firstName` → `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname`
   * `lastName` → `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname`
   * `name` → `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name`
   * `displayName` → `http://schemas.microsoft.com/identity/claims/displayname`
   * `role` → `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`
   * `groups` → `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups` (or `http://schemas.xmlsoap.org/claims/Group`)
4. **IdP Metadata XML**: Open the downloaded `FederationMetadata.xml` file in a text editor, copy its entire contents, and paste into this field.
5. **Allowed Email Domains** *(optional)*: Enter your corporate domains (e.g. `acme.com`).
   * When specified, any SAML assertion with an unauthorized email domain is blocked with an `EMAIL_DOMAIN_NOT_ALLOWED` audit log.

### Step 2: Test Connection
Click **Test SSO Connection**:
* Sentraa performs 4 automated validation checks:
  1. **Metadata XML Structure**: Validates `<EntityDescriptor>` and `<IDPSSODescriptor>` tags.
  2. **SingleSignOnService Endpoint**: Verifies Microsoft Entra ID SSO login URL (`https://login.microsoftonline.com/...`).
  3. **Signing Certificate**: Checks X.509 certificate validity dates and remaining days before expiration.
  4. **Required Attribute Mapping**: Confirms email claim URI is present.
* Confirm that all 4 checks return green passing statuses.

### Step 3: Save & Enable SSO
Click **Save & Enable SSO**.
Upon saving:
* SAML 2.0 authentication is active for your tenant.
* A secure SCIM 2.0 Bearer token is generated and displayed once in plaintext. Save this token securely for user lifecycle provisioning.

---

## Part 4: Configure SCIM 2.0 User Lifecycle Provisioning (Optional)

Microsoft Entra ID supports SCIM 2.0 automated provisioning to synchronize user creation, profile updates, and immediate deactivation.

### Step 1: Configure Provisioning in Entra
1. In your Entra Enterprise Application, navigate to **Manage → Provisioning**.
2. Click **Get started** (or **Edit provisioning**).
3. Set **Provisioning Mode** to **Automatic**.
4. Expand **Admin Credentials**:
   * **Tenant URL**: `<SENTRAA_BACKEND_URL>/api/v1/scim/v2`
   * **Secret Token**: Paste the SCIM Bearer token generated by Sentraa.
5. Click **Test Connection**:
   * Entra tests connectivity against `/scim/v2/Users`.
   * Confirm the connection succeeds.
6. Click **Save**.

### Step 2: Set Provisioning Status to On
1. Under **Settings**, set **Provisioning Status** to **On**.
2. Click **Save**.

---

## Part 5: Testing & Verification

### 1. Assign Users in Entra ID
1. In Entra Admin Center, navigate to **Manage → Users and groups**.
2. Click **+ Add user/group**.
3. Select the users or security groups (e.g., `SENTRA_ADMIN`, `SENTRA_ENGINEER`, `SENTRA_MEMBER`) you wish to grant access to Sentraa AI.
4. Click **Assign**.

### 2. Test Single Sign-On Login
1. Open a new Incognito / Private browser window.
2. Navigate directly to your organization login URL:
   `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>`
   *(or visit the Sentraa login page and click "Continue with SSO", entering your tenant slug)*.
3. You will be redirected to the Microsoft Entra ID sign-in page.
4. Authenticate using your Microsoft Entra ID corporate credentials and complete MFA.
5. Upon successful authentication, Microsoft Entra ID posts the signed SAML response to Sentraa ACS.
6. You will be logged into the Sentraa AI Dashboard with your mapped system role.

### 3. Verify Security Controls
* **Cross-Organization Protection**: An Entra user whose email belongs to a different Sentraa organization is rejected (`ORGANIZATION_MISMATCH` audit event).
* **Deactivated Account Blocking**: A deactivated user (`is_active: false`) is denied access (`USER_DEACTIVATED` audit event).
* **Domain Restrictions**: Users with emails outside `allowedEmailDomains` are rejected (`EMAIL_DOMAIN_NOT_ALLOWED` audit event).
* **Instant Session Revocation**: When SCIM deactivates a user, all active JWT and refresh token sessions are immediately invalidated via Redis blacklist.

---

## Summary of Values to Copy

| Direction | Setting Name | Value |
| :--- | :--- | :--- |
| **Sentraa → Entra** | Identifier (SP Entity ID) | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/metadata` |
| **Sentraa → Entra** | Reply URL (ACS URL) | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/callback` |
| **Sentraa → Entra** | Sign on URL (Optional) | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>` |
| **Sentraa → Entra** | SCIM Tenant URL | `<SENTRAA_BACKEND_URL>/api/v1/scim/v2` |
| **Sentraa → Entra** | SCIM Secret Token | Generated upon saving SSO config in Sentraa (`****`) |
| **Entra → Sentraa** | IdP Metadata XML | Downloaded from Section 3 (Federation Metadata XML) |
| **Entra → Sentraa** | Attribute Mapping Preset | Select `Microsoft Entra ID (SAML 2.0)` |
