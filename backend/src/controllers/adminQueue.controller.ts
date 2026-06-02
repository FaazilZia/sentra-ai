import { Request, Response } from 'express';
import {
  activityQueue,
  connectorQueue,
  driftQueue,
  evaluationQueue,
  automationsQueue,
  intakeLLMQueue,
  alertQueue,
  retentionQueue,
} from '../services/queue.service';
import { postMarketQueue } from '../services/postMarketMonitoring.service';

const ALL_QUEUES: Record<string, any> = {
  'activity-logs': activityQueue,
  'connector-scans': connectorQueue,
  'drift-scans': driftQueue,
  'evaluation-runs': evaluationQueue,
  'automations': automationsQueue,
  'intake-llm': intakeLLMQueue,
  'alerts': alertQueue,
  'data-retention': retentionQueue,
  'post-market-monitoring': postMarketQueue,
};

export const listQueues = async (req: Request, res: Response): Promise<any> => {
  try {
    const stats = await Promise.all(
      Object.entries(ALL_QUEUES).map(async ([name, queue]) => {
        if (!queue) {
          return { name, status: 'offline', counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 } };
        }
        try {
          const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
          return { name, status: 'online', counts };
        } catch (err: any) {
          return { name, status: 'error', error: err.message, counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 } };
        }
      })
    );
    return res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const listFailedJobs = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.params as { name: string };
  const queue = ALL_QUEUES[name];
  if (!queue) {
    return res.status(404).json({ success: false, message: `Queue '${name}' not found` });
  }
  try {
    const failedJobs = await queue.getFailed(0, 100);
    const data = failedJobs.map((job: any) => ({
      id: job.id,
      name: job.name,
      payload: job.data,
      error: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const retryFailedJob = async (req: Request, res: Response): Promise<any> => {
  const { name, jobId } = req.params as { name: string; jobId: string };
  const queue = ALL_QUEUES[name];
  if (!queue) {
    return res.status(404).json({ success: false, message: `Queue '${name}' not found` });
  }
  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: `Job '${jobId}' not found` });
    }
    await job.retry();
    return res.status(200).json({ success: true, message: `Job '${jobId}' retried successfully` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const flushFailedJobs = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.params as { name: string };
  const queue = ALL_QUEUES[name];
  if (!queue) {
    return res.status(404).json({ success: false, message: `Queue '${name}' not found` });
  }
  try {
    await queue.clean(0, 0, 'failed');
    return res.status(200).json({ success: true, message: `All failed jobs in queue '${name}' flushed successfully` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
