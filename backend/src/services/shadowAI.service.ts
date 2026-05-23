import prisma from '../config/db';
import logger from '../utils/logger';

export interface ShadowAIDetectionsResult {
  unauthorizedToolsCount: number;
  uniqueUsersCount: number;
  securityInterceptionsCount: number;
  timelineData: Array<{ name: string; date: string; detections: number; blocked: number }>;
  deptData: Array<{ name: string; count: number; value: number; color: string }>;
  incidents: Array<{
    id: string;
    user: string;
    dept: string;
    tool: string;
    time: string;
    severity: string;
    action: string;
    reason: string;
  }>;
  scanner_ready: boolean;
  detections: Array<{
    name: string;
    risk_level: string;
    count: number;
    last_detected: Date;
  }>;
}

export const ShadowAIService = {
  async getShadowAIDetections(organizationId: string): Promise<ShadowAIDetectionsResult> {
    try {
      logger.info(`[ShadowAIService] Running shadow AI scan for org: ${organizationId}`);

      // 1. Check if the org has at least one registered agent in ai_agents
      const registeredCount = await prisma.ai_agents.count({
        where: { organizationId },
      });

      if (registeredCount === 0) {
        logger.info(`[ShadowAIService] Org ${organizationId} has 0 registered agents. Skipping Shadow AI detection.`);
        return {
          unauthorizedToolsCount: 0,
          uniqueUsersCount: 0,
          securityInterceptionsCount: 0,
          timelineData: [],
          deptData: [],
          incidents: [],
          scanner_ready: false,
          detections: [],
        };
      }

      // 2. Fetch registered agent names
      const registeredAgents = await prisma.ai_agents.findMany({
        where: { organizationId },
        select: { name: true },
      });
      const registeredNames = registeredAgents.map((a) => a.name);

      // 3. Fetch logs where agent is NOT registered (Shadow AI)
      const shadowLogs = await prisma.logs.findMany({
        where: {
          organizationId,
          agent: {
            notIn: registeredNames,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      // 4. Calculate metrics
      const uniqueTools = new Set<string>();
      const uniqueUsers = new Set<string>();
      let securityInterceptionsCount = 0;

      const byDay: Record<string, { name: string; date: string; detections: number; blocked: number }> = {};
      const byDept: Record<string, number> = {};

      const getDepartment = (agentName: string): string => {
        const agent = agentName.toLowerCase();
        if (agent.includes('gpt') || agent.includes('openai') || agent.includes('completion')) {
          return 'AI/ML';
        }
        if (agent.includes('sql') || agent.includes('db') || agent.includes('database') || agent.includes('query')) {
          return 'Data';
        }
        if (agent.includes('code') || agent.includes('git') || agent.includes('deploy') || agent.includes('ci')) {
          return 'Engineering';
        }
        if (agent.includes('email') || agent.includes('slack') || agent.includes('notify') || agent.includes('message')) {
          return 'Ops';
        }
        return 'General';
      };

      const incidentsList: Array<{
        id: string;
        user: string;
        dept: string;
        tool: string;
        time: string;
        severity: string;
        action: string;
        reason: string;
      }> = [];

      for (const log of shadowLogs) {
        uniqueTools.add(log.agent);
        
        // Derive user identity
        const userVal = log.approvedBy || log.overriddenBy || 'External User';
        uniqueUsers.add(userVal);

        const isBlocked = log.status?.toLowerCase() === 'blocked' || log.risk?.toLowerCase() === 'high';
        if (isBlocked) {
          securityInterceptionsCount++;
        }

        // Timeline aggregation
        const day = new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!byDay[day]) {
          byDay[day] = { name: day, date: day, detections: 0, blocked: 0 };
        }
        byDay[day].detections++;
        if (isBlocked) {
          byDay[day].blocked++;
        }

        // Department aggregation
        const dept = getDepartment(log.agent);
        byDept[dept] = (byDept[dept] || 0) + 1;

        // Populate incident details for blocked items
        if (isBlocked && incidentsList.length < 10) {
          incidentsList.push({
            id: log.id,
            user: userVal,
            dept,
            tool: log.agent,
            time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            severity: log.risk?.toLowerCase() === 'high' ? 'High' : 'Medium',
            action: 'BLOCK',
            reason: log.reason || 'Unauthorized AI Tool Interception',
          });
        }
      }

      // Format department percentages
      const colors = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#eab308'];
      const totalLogs = shadowLogs.length || 1;
      const deptDataFormatted = Object.entries(byDept)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count], index) => ({
          name,
          count,
          value: Math.round((count / totalLogs) * 100),
          color: colors[index % colors.length],
        }));

      const timelineDataSorted = Object.values(byDay).slice(-7);

      logger.info(`[ShadowAIService] Scan completed. Unauthorized tools: ${uniqueTools.size}, Security interceptions: ${securityInterceptionsCount}`);

      // Compute detections list
      const detectionsMap: Record<string, { name: string; risk_level: string; count: number; last_detected: Date }> = {};
      for (const log of shadowLogs) {
        if (!detectionsMap[log.agent]) {
          detectionsMap[log.agent] = {
            name: log.agent,
            risk_level: log.risk || 'MEDIUM',
            count: 0,
            last_detected: log.timestamp,
          };
        }
        detectionsMap[log.agent].count++;
        if (log.risk?.toUpperCase() === 'HIGH') {
          detectionsMap[log.agent].risk_level = 'HIGH';
        }
      }
      const detections = Object.values(detectionsMap);

      return {
        unauthorizedToolsCount: uniqueTools.size,
        uniqueUsersCount: uniqueUsers.size,
        securityInterceptionsCount,
        timelineData: timelineDataSorted,
        deptData: deptDataFormatted,
        incidents: incidentsList,
        scanner_ready: true,
        detections,
      };
    } catch (error) {
      logger.error(`[ShadowAIService] Failed to perform Shadow AI scan:`, error);
      throw error;
    }
  },
};
