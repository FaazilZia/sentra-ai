import { Request, Response, NextFunction } from 'express';
import { IntelligenceService } from '../services/intelligence.service';

export class IntelligenceController {
  static async getExecutiveMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId || req.query.organizationId as string;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const metrics = await IntelligenceService.getExecutiveMetrics(organizationId);
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  static async getTopAttackPatterns(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId || req.query.organizationId as string;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const patterns = await IntelligenceService.getTopAttackPatterns(organizationId);
      res.json(patterns);
    } catch (error) {
      next(error);
    }
  }

  static async getRiskTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId || req.query.organizationId as string;
      const days = parseInt(req.query.days as string) || 7;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const trend = await IntelligenceService.getRiskTrend(organizationId, days);
      res.json(trend);
    } catch (error) {
      next(error);
    }
  }
}
