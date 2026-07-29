import fs from 'fs';
import path from 'path';
import prisma from '../config/db';
import logger from '../utils/logger';

export class FileIngestionService {
  /**
   * Saves uploaded evidence file metadata to the database and ensures directory exists.
   */
  static async uploadEvidenceFile(
    organizationId: string,
    controlType: string,
    controlId: string,
    file: Express.Multer.File,
    userId: string
  ) {
    if (!['GDPR', 'DPDP', 'HIPAA', 'PCI_DSS', 'NIST_AI_RMF'].includes(controlType)) {
      throw new Error(`Invalid control type: ${controlType}`);
    }

    // Ensure uploads directory exists
    const targetDir = path.join(process.cwd(), 'uploads', 'evidence');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Write file metadata to DB
    const evidenceFile = await prisma.evidence_files.create({
      data: {
        organizationId,
        control_type: controlType,
        control_id: controlId,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        storage_path: file.path,
        uploaded_by: userId,
      }
    });

    return evidenceFile;
  }

  /**
   * Lists all evidence files for a given control.
   */
  static async listEvidenceFiles(organizationId: string, controlType: string, controlId: string) {
    return prisma.evidence_files.findMany({
      where: {
        organizationId,
        control_type: controlType,
        control_id: controlId
      },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Deletes an evidence file from storage and database.
   */
  static async deleteEvidenceFile(id: string, organizationId: string) {
    const record = await prisma.evidence_files.findFirst({
      where: { id, organizationId }
    });

    if (!record) {
      throw new Error(`Evidence file not found or access denied: ${id}`);
    }

    // Try deleting physical file
    try {
      if (fs.existsSync(record.storage_path)) {
        fs.unlinkSync(record.storage_path);
      }
    } catch (err: any) {
      logger.warn(`[FileIngestionService] Failed to delete file on disk at ${record.storage_path}:`, err.message);
    }

    // Delete DB record
    return prisma.evidence_files.delete({
      where: { id }
    });
  }
}
