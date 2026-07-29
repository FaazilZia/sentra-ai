import prisma from '../config/db';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

export class DatasetService {
  static async listDatasets(organizationId: string) {
    return await prisma.datasets.findMany({
      where: { organizationId },
      include: { ai_system: true, tags: true },
      orderBy: { created_at: 'desc' }
    });
  }

  static async createDataset(organizationId: string, data: any) {
    const dataset = await prisma.datasets.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: data.name,
        description: data.description,
        dataset_type: data.dataset_type,
        data_classification: data.data_classification,
        status: data.status || 'ACTIVE',
        source_url: data.source_url,
        ai_system_id: data.ai_system_id,
        record_count: data.record_count ? parseInt(data.record_count) : null,
        created_by: data.created_by || 'system',
        last_updated: new Date()
      }
    });

    if (data.tags && Array.isArray(data.tags)) {
      await prisma.dataset_tags.createMany({
        data: data.tags.map((t: string) => ({
          id: randomUUID(),
          dataset_id: dataset.id,
          tag: t
        }))
      });
    }

    if (data.ai_system_id) {
      await this.checkAndTriggerDataGovernanceAutolink(organizationId, data.ai_system_id);
    }

    return dataset;
  }

  static async updateDataset(organizationId: string, datasetId: string, data: any) {
    const dataset = await prisma.datasets.update({
      where: { id: datasetId, organizationId },
      data: {
        name: data.name,
        description: data.description,
        dataset_type: data.dataset_type,
        data_classification: data.data_classification,
        status: data.status,
        source_url: data.source_url,
        ai_system_id: data.ai_system_id,
        record_count: data.record_count ? parseInt(data.record_count) : null,
        last_updated: new Date()
      }
    });

    if (data.tags && Array.isArray(data.tags)) {
      // Re-create tags
      await prisma.dataset_tags.deleteMany({ where: { dataset_id: datasetId } });
      await prisma.dataset_tags.createMany({
        data: data.tags.map((t: string) => ({
          id: randomUUID(),
          dataset_id: datasetId,
          tag: t
        }))
      });
    }

    if (data.ai_system_id) {
      await this.checkAndTriggerDataGovernanceAutolink(organizationId, data.ai_system_id);
    }

    return dataset;
  }

  static async deleteDataset(organizationId: string, datasetId: string) {
    return await prisma.datasets.delete({
      where: { id: datasetId, organizationId }
    });
  }

  static async archiveDataset(organizationId: string, datasetId: string) {
    return await prisma.datasets.update({
      where: { id: datasetId, organizationId },
      data: { status: 'ARCHIVED' }
    });
  }

  static async linkToSystem(organizationId: string, datasetId: string, aiSystemId: string) {
    const dataset = await prisma.datasets.update({
      where: { id: datasetId, organizationId },
      data: { ai_system_id: aiSystemId }
    });

    await this.checkAndTriggerDataGovernanceAutolink(organizationId, aiSystemId);
    return dataset;
  }

  static async getDatasetsBySystem(aiSystemId: string) {
    return await prisma.datasets.findMany({
      where: { ai_system_id: aiSystemId },
      include: { tags: true }
    });
  }

  private static async checkAndTriggerDataGovernanceAutolink(organizationId: string, aiSystemId: string) {
    try {
      const system = await prisma.ai_systems.findUnique({
        where: { id: aiSystemId }
      });

      // Link to NIST AI RMF Data Governance if linked to a HIGH_RISK system
      if (system && system.risk_tier === 'HIGH') {
        logger.info(`System ${system.name} is HIGH risk. Auto-linking NIST AI RMF Data Governance control to IN_PROGRESS.`);
        
        const subcategory = await prisma.nist_ai_rmf_subcategories.findFirst({
          where: { subcategory_code: 'GV-1.1' }
        });

        if (subcategory) {
          await prisma.nist_ai_rmf_implementations.upsert({
            where: {
              organizationId_subcategory_id: {
                organizationId,
                subcategory_id: subcategory.id
              }
            },
            update: { status: 'IN_PROGRESS', last_reviewed: new Date() },
            create: {
              organizationId,
              subcategory_id: subcategory.id,
              status: 'IN_PROGRESS',
              last_reviewed: new Date()
            }
          });
        }
      }
    } catch (err) {
      logger.error('Failed to trigger data governance autolink:', err);
    }
  }
}
