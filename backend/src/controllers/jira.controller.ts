import { Response } from 'express';
import { JiraService } from '../services/jira.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getJiraConfig = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const config = await JiraService.getMaskedConfig(orgId);
  return sendSuccess(res, config || {
    enabled: false,
    siteUrl: '',
    projectKey: '',
    userEmail: '',
    apiToken: '',
    issueType: 'Task',
    hourlyCap: 10
  });
});

export const saveJiraConfig = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const { siteUrl, projectKey, userEmail, apiToken, issueType, enabled, hourlyCap } = req.body;
  
  if (!siteUrl || !projectKey || !userEmail || !apiToken) {
    return sendError(res, 400, 'Site URL, Project Key, User Email, and API Token are all required.');
  }

  // Validate site URL format
  const cleanUrl = siteUrl.trim().toLowerCase();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return sendError(res, 400, 'Site URL must begin with https:// (e.g. https://your-domain.atlassian.net)');
  }

  const config = await JiraService.saveConfig(orgId, {
    siteUrl,
    projectKey,
    userEmail,
    apiToken,
    issueType: issueType || 'Task',
    enabled: enabled ?? true,
    hourlyCap: hourlyCap ? Number(hourlyCap) : 10
  });

  return sendSuccess(res, config, 200, 'Jira configuration saved successfully');
});

export const deleteJiraConfig = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  await JiraService.deleteConfig(orgId);
  return sendSuccess(res, null, 200, 'Jira configuration deleted successfully');
});

export const testJiraConnection = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  const { siteUrl, projectKey, userEmail, apiToken } = req.body;

  let resolvedToken = apiToken;
  let resolvedSiteUrl = siteUrl;
  let resolvedProjectKey = projectKey;
  let resolvedEmail = userEmail;

  // If token is masked, retrieve stored configuration
  if ((!resolvedToken || resolvedToken.includes('••••')) && orgId) {
    const existing = await JiraService.getConfig(orgId);
    if (existing) {
      resolvedToken = existing.apiToken;
      resolvedSiteUrl = resolvedSiteUrl || existing.siteUrl;
      resolvedProjectKey = resolvedProjectKey || existing.projectKey;
      resolvedEmail = resolvedEmail || existing.userEmail;
    }
  }

  if (!resolvedSiteUrl || !resolvedProjectKey || !resolvedEmail || !resolvedToken) {
    return sendError(res, 400, 'Site URL, Project Key, User Email, and API Token are required for connection test');
  }

  try {
    const result = await JiraService.testConnection({
      siteUrl: resolvedSiteUrl,
      projectKey: resolvedProjectKey,
      userEmail: resolvedEmail,
      apiToken: resolvedToken
    });
    return sendSuccess(res, result, 200, result.message);
  } catch (error: any) {
    return sendError(res, 400, `Connection test failed: ${error.message || error}`);
  }
});
