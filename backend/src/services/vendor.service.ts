import prisma from '../config/db';

export class VendorService {
  /**
   * List all vendor risk assessments for the organization.
   */
  static async listVendors(organizationId: string) {
    return prisma.vendor_risk_assessments.findMany({
      where: { organizationId },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Create a new vendor risk assessment.
   */
  static async createVendor(
    organizationId: string,
    data: {
      vendor_name: string;
      vendor_type: string;
      risk_score: number;
      risk_level: string;
      data_access: string[];
      compliance_frameworks: string[];
      assessment_notes: string;
    }
  ) {
    return prisma.vendor_risk_assessments.create({
      data: {
        organizationId,
        vendor_name: data.vendor_name,
        vendor_type: data.vendor_type,
        risk_score: data.risk_score,
        risk_level: data.risk_level,
        data_access: data.data_access,
        compliance_frameworks: data.compliance_frameworks,
        assessment_notes: data.assessment_notes,
        status: 'PENDING',
      }
    });
  }

  /**
   * Update an existing vendor risk assessment.
   */
  static async updateVendor(
    organizationId: string,
    id: string,
    data: {
      vendor_name?: string;
      vendor_type?: string;
      risk_score?: number;
      risk_level?: string;
      data_access?: string[];
      compliance_frameworks?: string[];
      assessment_notes?: string;
      status?: string;
    }
  ) {
    // Verify ownership
    const vendor = await prisma.vendor_risk_assessments.findFirst({
      where: { id, organizationId }
    });

    if (!vendor) {
      throw new Error(`Vendor assessment not found or access denied: ${id}`);
    }

    return prisma.vendor_risk_assessments.update({
      where: { id },
      data: {
        vendor_name: data.vendor_name !== undefined ? data.vendor_name : undefined,
        vendor_type: data.vendor_type !== undefined ? data.vendor_type : undefined,
        risk_score: data.risk_score !== undefined ? data.risk_score : undefined,
        risk_level: data.risk_level !== undefined ? data.risk_level : undefined,
        data_access: data.data_access !== undefined ? data.data_access : undefined,
        compliance_frameworks: data.compliance_frameworks !== undefined ? data.compliance_frameworks : undefined,
        assessment_notes: data.assessment_notes !== undefined ? data.assessment_notes : undefined,
        status: data.status !== undefined ? data.status : undefined,
      }
    });
  }

  /**
   * Delete a vendor risk assessment.
   */
  static async deleteVendor(organizationId: string, id: string) {
    const vendor = await prisma.vendor_risk_assessments.findFirst({
      where: { id, organizationId }
    });

    if (!vendor) {
      throw new Error(`Vendor assessment not found or access denied: ${id}`);
    }

    return prisma.vendor_risk_assessments.delete({
      where: { id }
    });
  }

  /**
   * Review a vendor (Approve or Reject).
   */
  static async reviewVendor(organizationId: string, id: string, status: string, reviewerName: string) {
    const vendor = await prisma.vendor_risk_assessments.findFirst({
      where: { id, organizationId }
    });

    if (!vendor) {
      throw new Error(`Vendor assessment not found or access denied: ${id}`);
    }

    if (!['APPROVED', 'REJECTED', 'REVIEWED'].includes(status)) {
      throw new Error(`Invalid review status: ${status}`);
    }

    return prisma.vendor_risk_assessments.update({
      where: { id },
      data: {
        status,
        reviewed_by: reviewerName,
      }
    });
  }

  /**
   * Get risk counts summary.
   */
  static async getRiskSummary(organizationId: string) {
    const counts = await prisma.vendor_risk_assessments.groupBy({
      by: ['risk_level'],
      where: { organizationId },
      _count: {
        id: true
      }
    });

    const summary: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };

    counts.forEach((item: any) => {
      summary[item.risk_level] = item._count.id;
    });

    return summary;
  }
}
