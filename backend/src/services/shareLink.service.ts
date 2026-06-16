import prisma from '../config/db';
import crypto, { randomUUID } from 'crypto';
import { ExecutiveReportService } from './executiveReport.service';
import { ComplianceService } from './compliance.service';
import { QuantitativeRiskService } from './quantitativeRisk.service';

export const ShareLinkService = {
  async createShareLink(
    orgId: string,
    userId: string,
    resourceType: 'report' | 'compliance' | 'risk' | 'audit',
    resourceId: string | null,
    expiresInDays?: number
  ) {
    const token = crypto.randomBytes(32).toString('hex');
    
    let expiresAt: Date | null = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    return await prisma.share_links.create({
      data: {
        id: randomUUID(),
        orgId,
        createdBy: userId,
        resourceType,
        resourceId: resourceId || null,
        token,
        expiresAt,
        isActive: true,
        viewCount: 0
      }
    });
  },

  async getShareLinksByResource(
    resourceType: 'report' | 'compliance' | 'risk' | 'audit',
    resourceId: string | null,
    orgId: string
  ) {
    return await prisma.share_links.findMany({
      where: {
        orgId,
        resourceType,
        resourceId: resourceId || null,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async resolveShareLink(token: string) {
    const link = await prisma.share_links.findUnique({
      where: { token }
    });

    if (!link) {
      return null;
    }

    if (!link.isActive) {
      return { expired: true, reason: 'Link is inactive' };
    }

    // Expiry check - explicitly instantiating Date and comparing correctly
    if (link.expiresAt) {
      const expiryTime = new Date(link.expiresAt).getTime();
      const currentTime = new Date().getTime();
      if (expiryTime < currentTime) {
        return { expired: true, reason: 'Link has expired' };
      }
    }

    // Increment viewCount
    await prisma.share_links.update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } }
    });

    // Fetch corresponding resource data
    const data = await this.getResourceData(link.resourceType, link.resourceId, link.orgId);

    // Fetch organization info to display Sentraa AI branding
    const organization = await prisma.organizations.findUnique({
      where: { id: link.orgId },
      select: { name: true, slug: true }
    });

    return {
      resourceType: link.resourceType,
      resourceId: link.resourceId,
      expiresAt: link.expiresAt,
      viewCount: link.viewCount + 1,
      createdAt: link.createdAt,
      organization,
      data
    };
  },

  async revokeShareLink(linkId: string, orgId: string) {
    const result = await prisma.share_links.updateMany({
      where: { id: linkId, orgId },
      data: { isActive: false }
    });
    return result.count > 0;
  },

  async getResourceData(
    resourceType: 'report' | 'compliance' | 'risk' | 'audit',
    resourceId: string | null,
    orgId: string
  ) {
    switch (resourceType) {
      case 'report':
        return await ExecutiveReportService.getStats(orgId);
      case 'compliance':
        return await ComplianceService.getAuditProof(orgId);
      case 'risk':
        return await QuantitativeRiskService.getOrgRiskPortfolio(orgId);
      case 'audit':
        return await prisma.audit_logs.findMany({
          where: { organizationId: orgId },
          orderBy: { timestamp: 'desc' },
          take: 50,
          include: {
            user: {
              select: { full_name: true, email: true }
            }
          }
        });
      default:
        return null;
    }
  }
};
