import prisma from '../config/db';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EvidenceType } from '@prisma/client';

// Initialize S3 Client if configured
const bucketName = process.env.AWS_S3_BUCKET;
let s3Client: S3Client | null = null;
if (bucketName) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
  });
  logger.info(`[Evidence] AWS S3 upload configured with bucket: ${bucketName}`);
} else {
  // Ensure local uploads directory exists
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  if (process.env.NODE_ENV === 'production') {
    logger.warn('********************************************************************************');
    logger.warn('⚠️  CRITICAL STARTUP WARNING: AWS_S3_BUCKET is not configured in production!');
    logger.warn('⚠️  Evidence files will be stored on local EPHEMERAL DISK.');
    logger.warn('⚠️  Files stored locally WILL BE LOST permanently upon container/dyno restart!');
    logger.warn('********************************************************************************');
  } else {
    logger.info('[Evidence] Local filesystem upload configured at: ' + uploadDir);
  }
}

export interface UploadMetadata {
  title: string;
  description?: string;
  entityType: EvidenceType;
  entityId?: string;
  tags?: string[];
}

export const EvidenceService = {
  /**
   * Upload evidence file and save record to DB
   */
  async uploadEvidence(
    file: any, // Express.Multer.File in memory storage
    metadata: UploadMetadata,
    orgId: string,
    userId: string
  ) {
    try {
      const fileId = randomUUID();
      const extension = path.extname(file.originalname);
      const uniqueFileName = `${fileId}${extension}`;
      let fileUrl = '';

      if (s3Client && bucketName) {
        // Upload to S3
        const s3Key = `orgs/${orgId}/evidence/${uniqueFileName}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype
          })
        );
        fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
        logger.info(`[Evidence] File uploaded to S3: ${fileUrl}`);
      } else {
        // Upload locally
        const localPath = path.join(process.cwd(), 'uploads', uniqueFileName);
        await fs.promises.writeFile(localPath, file.buffer);
        fileUrl = `/uploads/${uniqueFileName}`;
        logger.info(`[Evidence] File saved locally to: ${localPath}`);
      }

      // Save to database
      const evidenceRecord = await prisma.evidence.create({
        data: {
          id: fileId,
          orgId,
          uploadedBy: userId,
          title: metadata.title,
          description: metadata.description || null,
          fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          entityType: metadata.entityType,
          entityId: metadata.entityId || null,
          tags: metadata.tags || []
        },
        include: {
          user: {
            select: { full_name: true, email: true }
          }
        }
      });

      logger.info(`[Evidence] Record created in database: ${evidenceRecord.id}`);
      return evidenceRecord;
    } catch (error) {
      logger.error('[Evidence] File upload failed:', error);
      throw error;
    }
  },

  /**
   * Retrieve evidence associated with a specific entity (e.g. policy, risk, etc.)
   */
  async getEvidenceForEntity(entityType: EvidenceType, entityId: string, orgId: string) {
    return prisma.evidence.findMany({
      where: { orgId, entityType, entityId },
      include: {
        user: { select: { full_name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Retrieve all evidence records for the organization (filterable by entityType, entityId, or tags)
   */
  async getAllEvidence(
    orgId: string,
    filters?: {
      entityType?: EvidenceType;
      entityId?: string;
      tags?: string[];
    }
  ) {
    const where: any = { orgId };

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    return prisma.evidence.findMany({
      where,
      include: {
        user: { select: { full_name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Get single evidence record
   */
  async getEvidenceById(evidenceId: string, orgId: string) {
    return prisma.evidence.findFirst({
      where: { id: evidenceId, orgId },
      include: {
        user: { select: { full_name: true, email: true } }
      }
    });
  },

  /**
   * Secure evidence download / stream resolver.
   * Validates organization ownership, streams local file or returns short-lived presigned S3 URL.
   */
  async getEvidenceDownload(evidenceId: string, orgId: string) {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        user: { select: { full_name: true, email: true } }
      }
    });

    if (!evidence) {
      return { status: 404 as const, error: 'Evidence record not found' };
    }

    if (evidence.orgId !== orgId) {
      return { status: 403 as const, error: 'Forbidden: Access denied to evidence belonging to another organization' };
    }

    // Check if S3 is configured and fileUrl points to S3
    if (s3Client && bucketName && evidence.fileUrl && evidence.fileUrl.includes('.amazonaws.com/')) {
      const s3Key = evidence.fileUrl.split('.amazonaws.com/')[1];
      if (s3Key) {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          ResponseContentDisposition: `inline; filename="${encodeURIComponent(evidence.fileName)}"`
        });
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        return {
          status: 200 as const,
          type: 's3' as const,
          url: presignedUrl,
          fileName: evidence.fileName,
          mimeType: evidence.mimeType,
          fileSize: evidence.fileSize
        };
      }
    }

    // Local file storage
    const fileName = path.basename(evidence.fileUrl);
    let localPath = path.join(process.cwd(), 'uploads', fileName);
    if (!fs.existsSync(localPath)) {
      const evidenceSubdir = path.join(process.cwd(), 'uploads', 'evidence', fileName);
      if (fs.existsSync(evidenceSubdir)) {
        localPath = evidenceSubdir;
      }
    }

    if (!fs.existsSync(localPath)) {
      return { status: 404 as const, error: 'Evidence file not found on storage' };
    }

    return {
      status: 200 as const,
      type: 'local' as const,
      localPath,
      fileName: evidence.fileName,
      mimeType: evidence.mimeType,
      fileSize: evidence.fileSize
    };
  },

  /**
   * Delete evidence record and its corresponding file in storage
   */
  async deleteEvidence(evidenceId: string, orgId: string) {
    try {
      const record = await this.getEvidenceById(evidenceId, orgId);
      if (!record) {
        throw new Error('Evidence record not found');
      }

      // 1. Delete actual file in storage
      if (s3Client && bucketName) {
        const s3Key = record.fileUrl.split('.amazonaws.com/')[1];
        if (s3Key) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: s3Key
            })
          );
          logger.info(`[Evidence] File deleted from S3: ${s3Key}`);
        }
      } else {
        const fileName = path.basename(record.fileUrl);
        const localPath = path.join(process.cwd(), 'uploads', fileName);
        if (fs.existsSync(localPath)) {
          await fs.promises.unlink(localPath);
          logger.info(`[Evidence] File deleted locally from: ${localPath}`);
        }
      }

      // 2. Delete database record
      await prisma.evidence.delete({
        where: { id: evidenceId }
      });

      logger.info(`[Evidence] Record deleted from DB: ${evidenceId}`);
      return true;
    } catch (error) {
      logger.error(`[Evidence] Delete failed for ${evidenceId}:`, error);
      throw error;
    }
  }
};
