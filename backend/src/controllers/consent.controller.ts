import { Response, NextFunction } from 'express';
import { randomUUID, createHash } from 'crypto';
import prisma from '../config/db';

export const getConsentHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const history = await prisma.consent_records.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });

    const formattedHistory = history.map(record => ({
      id: record.id,
      action: record.action,
      timestamp: record.created_at,
      version: record.notice_version,
      hash: record.hashing_chain,
    }));

    res.status(200).json({
      success: true,
      data: formattedHistory,
    });
  } catch (error) {
    next(error);
  }
};

export const grantConsent = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const action = 'GRANT';
    const noticeVersion = '1.0.0';
    
    // Generate a simple hash for the "Ledger" effect
    const timestamp = new Date().toISOString();
    const hashInput = `${userId}-${action}-${timestamp}-${noticeVersion}`;
    const hash = createHash('sha256').update(hashInput).digest('hex');

    await prisma.consent_records.create({
      data: {
        id: randomUUID(),
        user_id: userId,
        action,
        notice_version: noticeVersion,
        hashing_chain: hash,
        metadata_json: { ip: req.ip, userAgent: req.get('user-agent') },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Consent granted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawConsent = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const action = 'WITHDRAW';
    const noticeVersion = '1.0.0';
    
    const timestamp = new Date().toISOString();
    const hashInput = `${userId}-${action}-${timestamp}-${noticeVersion}`;
    const hash = createHash('sha256').update(hashInput).digest('hex');

    await prisma.consent_records.create({
      data: {
        id: randomUUID(),
        user_id: userId,
        action,
        notice_version: noticeVersion,
        hashing_chain: hash,
        metadata_json: { ip: req.ip, userAgent: req.get('user-agent'), reason: 'user_request' },
      },
    });

    // Option: Mark user as inactive or delete data
    // For now, mirroring the "Purge" logic by just recording it
    
    res.status(201).json({
      success: true,
      message: 'Consent withdrawn successfully',
    });
  } catch (error) {
    next(error);
  }
};
