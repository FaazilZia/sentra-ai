// Use explicit factory mocks so Jest never loads the real modules
// (bare jest.mock() triggers auto-mock which instantiates BullMQ Workers)
jest.mock('../services/decisionEngine', () => ({
  makeDecision: jest.fn(),
}));
jest.mock('../services/queue.service', () => ({
  enqueueLog: jest.fn(),
  enqueueConnectorScan: jest.fn(),
  processConnectorScan: jest.fn(),
  setupScheduledJobs: jest.fn(),
  activityQueue: null,
  connectorQueue: null,
  retentionQueue: null,
}));

import { interceptAction } from '../middleware/interceptor';
import { makeDecision } from '../services/decisionEngine';
import { enqueueLog } from '../services/queue.service';

const mockMakeDecision = makeDecision as jest.MockedFunction<typeof makeDecision>;
const mockEnqueueLog = enqueueLog as jest.MockedFunction<typeof enqueueLog>;

const BASE_BLOCKED_DECISION = {
  status: 'blocked' as const,
  risk: 'high' as const,
  reason: 'Policy Violation: blocked_actions match',
  impact: 'Prevented unauthorized access',
  compliance: ['GDPR'],
  explanation: 'Action blocked by policy.',
  confidence: 0.99,
  isPendingApproval: false,
};

const BASE_ALLOWED_DECISION = {
  status: 'allowed' as const,
  risk: 'low' as const,
  reason: 'Allowed: Verified by policy',
  impact: 'N/A',
  compliance: ['Internal Governance Policy'],
  explanation: 'Action is safe.',
  confidence: 0.80,
  isPendingApproval: false,
};

const BASE_INPUT = {
  agent: 'test-agent',
  action: 'delete_record',
  organizationId: 'org-abc',
  metadata: { source: 'unit-test' },
  requestId: 'req-001',
};

describe('Interceptor Middleware — interceptAction()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnqueueLog.mockResolvedValue(undefined as any);
  });

  // ─── BLOCKED PATH ──────────────────────────────────────────────────────────

  describe('when decision is BLOCKED', () => {
    beforeEach(() => {
      mockMakeDecision.mockResolvedValue(BASE_BLOCKED_DECISION);
    });

    it('returns the blocked decision without calling callback', async () => {
      const callback = jest.fn();
      const result = await interceptAction(BASE_INPUT, callback);

      expect(result.status).toBe('blocked');
      expect(callback).not.toHaveBeenCalled();
    });

    it('calls enqueueLog once with correct blocked data', async () => {
      await interceptAction(BASE_INPUT, jest.fn());

      expect(mockEnqueueLog).toHaveBeenCalledTimes(1);
      expect(mockEnqueueLog).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: BASE_INPUT.organizationId,
          agent: BASE_INPUT.agent,
          action: BASE_INPUT.action,
          status: 'blocked',
          risk: 'high',
          requestId: BASE_INPUT.requestId,
          isPendingApproval: false,
        })
      );
    });

    it('includes latency > 0 in the log payload', async () => {
      await interceptAction(BASE_INPUT, jest.fn());

      const logPayload = mockEnqueueLog.mock.calls[0][0];
      expect(typeof logPayload.latency).toBe('number');
      expect(logPayload.latency).toBeGreaterThanOrEqual(0);
    });

    it('passes isPendingApproval from decision to the log', async () => {
      mockMakeDecision.mockResolvedValue({ ...BASE_BLOCKED_DECISION, isPendingApproval: true });
      await interceptAction(BASE_INPUT, jest.fn());

      expect(mockEnqueueLog).toHaveBeenCalledWith(
        expect.objectContaining({ isPendingApproval: true })
      );
    });
  });

  // ─── ALLOWED PATH ──────────────────────────────────────────────────────────

  describe('when decision is ALLOWED', () => {
    beforeEach(() => {
      mockMakeDecision.mockResolvedValue(BASE_ALLOWED_DECISION);
    });

    it('calls the callback and returns result merged with decision', async () => {
      const callbackResult = { records: 5 };
      const callback = jest.fn().mockResolvedValue(callbackResult);

      const result = await interceptAction(BASE_INPUT, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('allowed');
      expect((result as any).result).toEqual(callbackResult);
    });

    it('calls enqueueLog once for an allowed action', async () => {
      await interceptAction(BASE_INPUT, jest.fn().mockResolvedValue({}));

      expect(mockEnqueueLog).toHaveBeenCalledTimes(1);
      expect(mockEnqueueLog).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'allowed',
          risk: 'low',
        })
      );
    });

    it('merges callback result into logged metadata', async () => {
      const callbackResult = { rows: 100 };
      await interceptAction(BASE_INPUT, jest.fn().mockResolvedValue(callbackResult));

      const logPayload = mockEnqueueLog.mock.calls[0][0];
      expect(logPayload.metadata).toEqual(
        expect.objectContaining({ result: callbackResult })
      );
    });

    it('handles callback errors gracefully and still logs', async () => {
      const failingCallback = jest.fn().mockRejectedValue(new Error('DB timeout'));
      const result = await interceptAction(BASE_INPUT, failingCallback);

      expect((result as any).result).toEqual({ error: 'DB timeout' });
      expect(mockEnqueueLog).toHaveBeenCalledTimes(1);
    });
  });

  // ─── ENGINE DELEGATION ─────────────────────────────────────────────────────

  it('forwards all input fields to makeDecision', async () => {
    mockMakeDecision.mockResolvedValue(BASE_ALLOWED_DECISION);
    await interceptAction(BASE_INPUT, jest.fn().mockResolvedValue({}));

    expect(mockMakeDecision).toHaveBeenCalledWith(
      BASE_INPUT.agent,
      BASE_INPUT.action,
      BASE_INPUT.organizationId,
      BASE_INPUT.metadata
    );
  });
});
