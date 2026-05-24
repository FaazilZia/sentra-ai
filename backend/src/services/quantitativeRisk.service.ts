import prisma from '../config/db';
import { randomUUID } from 'crypto';

export interface AgentRiskSummary {
  agentId: string;
  agentName: string;
  compositeScore: number;
  likelihood: number;
  impact: number;
  lastUpdated: Date;
}

export const QuantitativeRiskService = {
  calculateCompositeScore(likelihood: number, impact: number): number {
    return Math.round(((likelihood * impact) / 100) * 10) / 10;
  },

  async updateRiskScore(
    orgId: string,
    agentId: string | null,
    likelihood: number,
    impact: number,
    methodology: string | null,
    scoredBy: 'system' | 'manual' = 'system'
  ) {
    // 1. Fetch previous scores for comparison
    const [latestComposite, latestLikelihood, latestImpact] = await Promise.all([
      prisma.risk_scores.findFirst({
        where: { orgId, agentId: agentId || null, scoreType: 'composite' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.risk_scores.findFirst({
        where: { orgId, agentId: agentId || null, scoreType: 'likelihood' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.risk_scores.findFirst({
        where: { orgId, agentId: agentId || null, scoreType: 'impact' },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const newComposite = this.calculateCompositeScore(likelihood, impact);

    // 2. Insert records in transaction or serial
    const timestamp = new Date();
    
    await prisma.risk_scores.createMany({
      data: [
        {
          id: randomUUID(),
          orgId,
          agentId: agentId || null,
          scoreType: 'likelihood',
          score: likelihood,
          previousScore: latestLikelihood ? latestLikelihood.score : null,
          scoredBy,
          methodology,
          createdAt: timestamp
        },
        {
          id: randomUUID(),
          orgId,
          agentId: agentId || null,
          scoreType: 'impact',
          score: impact,
          previousScore: latestImpact ? latestImpact.score : null,
          scoredBy,
          methodology,
          createdAt: timestamp
        },
        {
          id: randomUUID(),
          orgId,
          agentId: agentId || null,
          scoreType: 'composite',
          score: newComposite,
          previousScore: latestComposite ? latestComposite.score : null,
          scoredBy,
          methodology,
          createdAt: timestamp
        }
      ]
    });

    return {
      likelihood,
      impact,
      composite: newComposite
    };
  },

  async getAgentRiskScore(agentId: string, orgId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [latestComposite, latestLikelihood, latestImpact, history] = await Promise.all([
      prisma.risk_scores.findFirst({
        where: { orgId, agentId, scoreType: 'composite' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.risk_scores.findFirst({
        where: { orgId, agentId, scoreType: 'likelihood' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.risk_scores.findFirst({
        where: { orgId, agentId, scoreType: 'impact' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.risk_scores.findMany({
        where: {
          orgId,
          agentId,
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Group history by date
    const historyMap: Record<string, { date: string; composite?: number; likelihood?: number; impact?: number }> = {};
    for (const record of history) {
      const dateStr = record.createdAt.toISOString().split('T')[0];
      if (!historyMap[dateStr]) {
        historyMap[dateStr] = { date: dateStr };
      }
      if (record.scoreType === 'composite') historyMap[dateStr].composite = record.score;
      if (record.scoreType === 'likelihood') historyMap[dateStr].likelihood = record.score;
      if (record.scoreType === 'impact') historyMap[dateStr].impact = record.score;
    }

    return {
      current: {
        composite: latestComposite ? latestComposite.score : 9.0,
        likelihood: latestLikelihood ? latestLikelihood.score : 30.0,
        impact: latestImpact ? latestImpact.score : 30.0,
        lastUpdated: latestComposite ? latestComposite.createdAt : new Date()
      },
      history: Object.values(historyMap).sort((a, b) => a.date.localeCompare(b.date))
    };
  },

  async getOrgRiskPortfolio(orgId: string) {
    const agents = await prisma.ai_agents.findMany({
      where: { organizationId: orgId }
    });

    if (agents.length === 0) {
      return {
        averageScore: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        trend: 0,
        scoresByAgent: []
      };
    }

    const scoresByAgent: AgentRiskSummary[] = await Promise.all(
      agents.map(async (agent) => {
        const [comp, like, imp] = await Promise.all([
          prisma.risk_scores.findFirst({
            where: { orgId, agentId: agent.id, scoreType: 'composite' },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.risk_scores.findFirst({
            where: { orgId, agentId: agent.id, scoreType: 'likelihood' },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.risk_scores.findFirst({
            where: { orgId, agentId: agent.id, scoreType: 'impact' },
            orderBy: { createdAt: 'desc' }
          })
        ]);

        return {
          agentId: agent.id,
          agentName: agent.name,
          compositeScore: comp ? comp.score : 9.0,
          likelihood: like ? like.score : 30.0,
          impact: imp ? imp.score : 30.0,
          lastUpdated: comp ? comp.createdAt : agent.created_at
        };
      })
    );

    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let totalComposite = 0;

    for (const item of scoresByAgent) {
      totalComposite += item.compositeScore;
      if (item.compositeScore <= 33) {
        lowRiskCount++;
      } else if (item.compositeScore <= 66) {
        mediumRiskCount++;
      } else {
        highRiskCount++;
      }
    }

    const averageScore = Math.round((totalComposite / agents.length) * 10) / 10;

    // Trend calculation compared to 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const scores7DaysAgo = await Promise.all(
      agents.map(async (agent) => {
        const comp = await prisma.risk_scores.findFirst({
          where: {
            orgId,
            agentId: agent.id,
            scoreType: 'composite',
            createdAt: { lte: sevenDaysAgo }
          },
          orderBy: { createdAt: 'desc' }
        });
        return comp ? comp.score : 9.0; // fallback to default
      })
    );

    const avg7DaysAgo = scores7DaysAgo.length > 0 
      ? Math.round((scores7DaysAgo.reduce((sum, val) => sum + val, 0) / scores7DaysAgo.length) * 10) / 10
      : 9.0;

    const trend = Math.round((averageScore - avg7DaysAgo) * 10) / 10;

    return {
      averageScore,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      trend,
      scoresByAgent
    };
  },

  async getRiskTrend(orgId: string, days: number) {
    const agents = await prisma.ai_agents.findMany({
      where: { organizationId: orgId }
    });

    if (agents.length === 0) {
      return [];
    }

    // Handled orgs with no scores yet to prevent 500
    const checkAny = await prisma.risk_scores.findFirst({
      where: { orgId, scoreType: 'composite' }
    });
    if (!checkAny) {
      return [];
    }

    const trend: Array<{ date: string; score: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(23, 59, 59, 999);

      const dailyAgentScores = await Promise.all(
        agents.map(async (agent) => {
          const score = await prisma.risk_scores.findFirst({
            where: {
              orgId,
              agentId: agent.id,
              scoreType: 'composite',
              createdAt: { lte: date }
            },
            orderBy: { createdAt: 'desc' }
          });
          return score ? score.score : 9.0; // default 9.0
        })
      );

      const dayAvg = dailyAgentScores.length > 0 
        ? dailyAgentScores.reduce((sum, s) => sum + s, 0) / dailyAgentScores.length
        : 0;

      trend.push({
        date: date.toISOString().split('T')[0],
        score: Math.round(dayAvg * 10) / 10
      });
    }

    return trend;
  }
};
