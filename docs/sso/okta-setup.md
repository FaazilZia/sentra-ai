# Sentraa AI — Okta SAML 2.0 & SCIM 2.0 Setup Guide

This guide provides customer administrators with step-by-step instructions for configuring Okta Single Sign-On (SAML 2.0) and automated user lifecycle provisioning (SCIM 2.0) in Sentraa AI.

---

## Prerequisites

Before starting, ensure you have:
1. Administrator access to your **Okta Admin Console** (`https://<your-org>-admin.okta.com`).
2. An **Admin** account in Sentraa AI.
3. Your Sentraa **Organization Slug** (e.g., `acme-corp`), visible in Sentraa **Settings → Organization / SSO**.

---

## Part 1: Create the Okta SAML 2.0 Application

### Step 1: Create App Integration in Okta
1. Sign in to your **Okta Admin Console**.
2. In the left navigation menu, go to **Applications → Applications**.
3. Click **Create App Integration**.
4. In the dialog, select **SAML 2.0** and click **Next**.

### Step 2: General Settings
* **App name**: `Sentraa AI`
* **App logo** *(optional)*: Upload the Sentraa logo.
* **App visibility**: Leave default options checked.
* Click **Next**.

### Step 3: Configure SAML Settings
Under **General**, enter the following exact values (replace `<ORG_SLUG>` with your organization slug, and `<SENTRAA_BACKEND_URL>` with your Sentraa backend host, e.g. `https://api.sentraa.ai` or your custom domain):

| Okta Setting | Value to Enter | Notes |
| :--- | :--- | :--- |
| **Single sign-on URL** | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/callback` | Check *"Use this for Recipient URL and Destination URL"* |
| **Recipient URL** | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/callback` | Auto-populated |
| **Destination URL** | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/callback` | Auto-populated |
| **Audience URI (SP Entity ID)** | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/metadata` | Unique identifier for your tenant Service Provider |
| **Default RelayState** | *(leave blank)* | Optional |
| **Name ID format** | `EmailAddress` | Required |
| **Application username** | `Email` | Identifies user by primary corporate email |
| **Update application username on** | `Create and update` | Ensures email changes synchronize |

### Step 4: Attribute Statements (Claims Mapping)
Under **Attribute Statements (optional)**, configure the following claims:

| Name | Name format | Value | Sentraa Mapping |
| :--- | :--- | :--- | :--- |
| `email` | `Unspecified` | `user.email` | Primary login email |
| `firstName` | `Unspecified` | `user.firstName` | User given name |
| `lastName` | `Unspecified` | `user.lastName` | User surname |
| `role` | `Unspecified` | `appuser.role` *(or static `MEMBER`)* | System role (`ADMIN`, `MEMBER`, `VIEWER`, `AUDITOR`, `ENGINEER`) |

> **Security Note on Roles**:
> Sentraa strictly maps SAML roles to tenant-level roles: `ADMIN`, `MEMBER`, `VIEWER`, `AUDITOR`, `ENGINEER`.
> Any missing or unrecognized role automatically defaults to `VIEWER`.
> **Privilege Escalation Protection**: The platform-wide `SUPER_ADMIN` role can **never** be granted via SAML assertions. Any attempt to pass `SUPER_ADMIN` is demoted to `VIEWER` with a security audit warning.

### Step 5: Group Attribute Statements (Optional)
If assigning roles via Okta Groups:
* **Name**: `groups`
* **Name format**: `Unspecified`
* **Filter**: `Matches regex` → `.*` (or specific filter for Sentraa groups, e.g. `Sentraa_.*`)

### Step 6: Feedback & Finish
1. Select **"I'm an Okta customer adding an internal app"**.
2. Click **Finish**.

---

## Part 2: Connect Okta to Sentraa AI

### Step 1: Copy IdP Metadata from Okta
1. In Okta, open the newly created **Sentraa AI** application and go to the **Sign On** tab.
2. In the right panel under **SAML 2.0**, locate the **Metadata URL** or click **View SAML setup instructions**.
3. Download the XML file or copy the raw **Identity Provider metadata** XML.

### Step 2: Paste Metadata in Sentraa
1. In Sentraa AI, navigate to **Settings → SAML SSO**.
2. **SSO Provider Name**: Select or enter `Okta`.
3. **Attribute Preset**: Select `Okta` from the preset dropdown.
   * `email` → `email`
   * `firstName` → `firstName`
   * `lastName` → `lastName`
   * `role` → `role`
   * `groups` → `groups`
4. **IdP Metadata XML**: Paste the complete XML string copied from Okta.
5. **Allowed Email Domains** *(optional)*: Enter your corporate domains (e.g. `acme.com`).
6. Click **Test SSO Connection**:
   * Sentraa parses the XML, verifies the signing certificate validity dates, checks the single sign-on redirect binding, and validates required attribute claims.
   * Verify all 4 checks pass with green badges.
7. Click **Save & Enable SSO**.
8. **Copy your SCIM Bearer Token**: Upon saving, a secure SCIM Bearer token is displayed. Store it securely (it will be displayed only once in plaintext, then encrypted at rest).

---

## Part 3: Configure SCIM 2.0 User Lifecycle Provisioning

SCIM allows Okta to automatically create, update, and deactivate users in Sentraa in real time.

### Step 1: Enable SCIM in Okta
1. In the Okta application page, navigate to the **General** tab.
2. Under **App Settings**, click **Edit**.
3. In **Provisioning**, check **SCIM** and click **Save**.
4. A new **Provisioning** tab will appear at the top.

### Step 2: Configure SCIM Connection
1. Click the **Provisioning** tab and click **Edit**.
2. Set the following parameters:
   * **SCIM connector base URL**: `<SENTRAA_BACKEND_URL>/api/v1/scim/v2`
   * **Unique identifier field for users**: `userName`
   * **Supported provisioning actions**:
     * [x] **Push New Users**
     * [x] **Push Profile Updates**
     * [x] **Push Groups**
   * **Authentication Mode**: `HTTP Header`
   * **Bearer Token**: Paste the SCIM Bearer token generated by Sentraa (`****`).
3. Click **Test Connector Configuration**:
   * Okta queries `/scim/v2/Users` with the Bearer token.
   * Confirm the test completes successfully.
4. Click **Save**.

### Step 3: Enable Provisioning Actions
1. Under **Provisioning → To App**, click **Edit**.
2. Enable:
   * [x] **Create Users**
   * [x] **Update User Attributes**
   * [x] **Deactivate Users**
3. Click **Save**.

---

## Part 4: Testing & Verification

### 1. Test Single Sign-On Login
1. In Okta, assign a test user to the Sentraa application (**Assignments → Assign → Assign to People**).
2. Open an incognito browser window.
3. Navigate directly to your tenant login URL:
   `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>`
   *(or enter `<ORG_SLUG>` on the Sentraa Login page under "Continue with SSO")*.
4. Authenticate in Okta.
5. You should be redirected directly to the Sentraa AI Dashboard.

### 2. Verify SCIM Deactivation
1. When a user is unassigned or deactivated in Okta:
   * Okta issues a SCIM `PATCH` or `DELETE` request to Sentraa.
   * Sentraa immediately sets `is_active = false`.
   * An immutable audit entry `SCIM_USER_DEACTIVATED` is recorded.
   * Existing active JWT sessions and refresh tokens are immediately revoked.
   * Subsequent attempts to log in via SAML are blocked with `SAML_SSO_LOGIN_REJECTED` (`USER_DEACTIVATED`).

---

## Summary of Values to Copy

| Direction | Setting Name | Value |
| :--- | :--- | :--- |
| **Sentraa → Okta** | Single Sign-On (ACS) URL | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/callback` |
| **Sentraa → Okta** | Audience URI (SP Entity ID) | `<SENTRAA_BACKEND_URL>/api/v1/saml/<ORG_SLUG>/metadata` |
| **Sentraa → Okta** | SCIM Connector Base URL | `<SENTRAA_BACKEND_URL>/api/v1/scim/v2` |
| **Sentraa → Okta** | SCIM Bearer Token | Generated upon saving SSO config in Sentraa (`****`) |
| **Okta → Sentraa** | IdP Metadata XML | Copied from Okta Sign On tab |
| **Okta → Sentraa** | Attribute Mapping Preset | Select `Okta` preset |
