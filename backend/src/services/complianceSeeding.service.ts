import prisma from '../config/db';
import logger from '../utils/logger';

export class ComplianceSeedingService {
  static async seedGDPRControls() {
    try {
      const count = await prisma.complianceControl.count();
      if (count === 0) {
        logger.info('ComplianceControl table is empty. Seeding 5 default GDPR controls...');
        await prisma.complianceControl.createMany({
          data: [
            {
              framework: 'gdpr',
              name: 'Data Minimisation',
              description: 'Ensure personal data collected is adequate, relevant and limited to what is necessary.',
              status: 'NOT_STARTED',
            },
            {
              framework: 'gdpr',
              name: 'Right to Erasure',
              description: 'Provide mechanisms for users to request erasure of personal data without undue delay.',
              status: 'NOT_STARTED',
            },
            {
              framework: 'gdpr',
              name: 'Consent Management',
              description: 'Obtain freely given, specific, informed and unambiguous consent from data subjects.',
              status: 'NOT_STARTED',
            },
            {
              framework: 'gdpr',
              name: 'Data Breach Notification',
              description: 'Notify the supervisory authority and affected individuals of personal data breaches.',
              status: 'NOT_STARTED',
            },
            {
              framework: 'gdpr',
              name: 'Privacy by Design',
              description: 'Implement appropriate technical and organizational measures to integrate data protection.',
              status: 'NOT_STARTED',
            },
          ],
        });
        logger.info('GDPR compliance controls seeded successfully.');
      } else {
        logger.info(`ComplianceControl table already has ${count} records. Seeding skipped.`);
      }
    } catch (err) {
      logger.error('Failed to seed compliance controls:', err);
    }
  }
}
