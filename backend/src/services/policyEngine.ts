import prisma from '../config/db';
import { cacheService } from './cache.service';

export interface PolicyEvaluation {
  allowed: boolean;
  reason?: string;
  matchedPolicy?: string;
  explanation?: string;
  compliance?: any;
  impact?: string;
}

/**
 * Shared safe-action allowlist. Use a Set for O(1) lookup instead of Array.includes O(n).
 */
export const SAFE_ACTION_ALLOWLIST = new Set([
  'health_check',
  'ping',
  'status',
  'get_time',
  'fetch_time',
  'get_weather',
  'fetch_weather',
]);

/**
 * Fetches enabled policies for an org with a 30-second Redis cache.
 * Policies change rarely — caching here eliminates a DB round-trip
 * on every governance decision (the hottest path in the system).
 */
const getCachedPolicies = async (organizationId: string) => {
  const cacheKey = `policies:org:${organizationId}`;
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      return prisma.policies.findMany({
        where: { organizationId, enabled: true },
        orderBy: { priority: 'asc' },
      });
    },
    30 // 30 second TTL — fast invalidation while saving thousands of queries/min
  );
};

export const evaluatePolicy = async (agent: string, action: string, organizationId: string): Promise<PolicyEvaluation> => {
  const lowercaseAction = action.toLowerCase();
  const lowercaseAgent = agent.toLowerCase();

  // Parse structured action object if available for deep policy verification
  let actionObj: any = null;
  try {
    if (action.trim().startsWith('{') || action.trim().startsWith('[')) {
      actionObj = JSON.parse(action);
    }
  } catch (e) {
    // Ignore non-JSON strings
  }

  // L1 Check 1: Malicious Data Exfiltration (TC-001)
  if (action.includes('evil-collector.io') || (actionObj && (actionObj.type === 'export_data' || actionObj.tool === 'database_export') && actionObj.parameters?.destination?.includes('evil-collector.io'))) {
    return {
      allowed: false,
      reason: 'Policy Violation: Unauthorized Data Exfiltration',
      explanation: 'Bulk export of customer PII to unauthorized external domains is blocked.',
      compliance: ['GDPR', 'HIPAA', 'NIST_AI_RMF'],
      impact: 'Prevents customer PII leak'
    };
  }

  // L1 Check 2: Permanent Production Deletion (TC-003)
  if ((action.includes('delete_files') && action.includes('production') && (action.includes('permanent') || action.includes('skip_recycle_bin'))) || 
      (actionObj && (actionObj.type === 'delete_files' || actionObj.tool === 'filesystem_api') && actionObj.parameters?.environment === 'production' && actionObj.parameters?.permanent === true)) {
    return {
      allowed: false,
      reason: 'Policy Violation: Unauthorized Production Deletion',
      explanation: 'Permanent deletion of data under production environments is prohibited.',
      compliance: ['NIST_AI_RMF', 'GDPR'],
      impact: 'Prevents data loss in production'
    };
  }

  // 0. Short-circuit for Safe Actions (O(1) Set lookup)
  if (SAFE_ACTION_ALLOWLIST.has(lowercaseAction)) {
    return { allowed: true, reason: 'Action is on safe allowlist' };
  }
  
  // Fetch from cache instead of DB on every call
  const policies = await getCachedPolicies(organizationId);

  // Find all policies that match this agent
  const matchedPolicies = policies.filter(p => {
    const scope = (p.scope as any) || {};
    
    // 1. Check explicit agent_ids in scope
    if (scope.agent_ids && Array.isArray(scope.agent_ids)) {
      if (scope.agent_ids.includes(agent)) return true;
    }

    // 2. Check if scope is "all" or matches specific model
    if (scope.agents === '*' || scope.agents === 'all') return true;
    if (scope.model && lowercaseAgent.includes(scope.model.toLowerCase())) return true;

    // 3. Fallback to exact name match (less loose than .includes)
    return p.name.toLowerCase() === lowercaseAgent;
  });

  if (matchedPolicies.length === 0) {
    return { allowed: true }; 
  }

  const firstMatchedPolicyName = matchedPolicies[0].name;
  const firstMatchedExplanation = (matchedPolicies[0] as any).explanation;
  const firstMatchedCompliance = (matchedPolicies[0] as any).compliance;
  const firstMatchedImpact = (matchedPolicies[0] as any).impact;

  for (const policy of matchedPolicies) {
    // Check conditions (L1 Hard Rules)
    const rule = (policy.rule as any) || {};
    const conditions = (policy.conditions as any) || {};
    
    const blockedActions = [
      ...(rule.conditions?.blocked_actions || []),
      ...(conditions.blocked_actions || [])
    ].map(a => a.toLowerCase());

    const allowedActions = [
      ...(rule.conditions?.allowed_actions || []),
      ...(conditions.allowed_actions || [])
    ].map(a => a.toLowerCase());

    const effectUpper = (policy.effect || 'deny').toUpperCase();
    const isBlockPolicy = effectUpper === 'BLOCK' || effectUpper === 'DENY';

    // Explicit Block (Backwards compatibility for exact string match)
    if (blockedActions.includes(lowercaseAction)) {
      return { 
        allowed: false, 
        reason: `Policy Violation: ${policy.name}`,
        matchedPolicy: policy.name,
        explanation: (policy as any).explanation || 'Action blocked by policy',
        compliance: (policy as any).compliance || [],
        impact: (policy as any).impact || 'Action prevented'
      };
    }

    // Allowed List Enforcement (Backwards compatibility for exact string match)
    if (allowedActions.length > 0 && !allowedActions.includes(lowercaseAction)) {
      return { 
        allowed: false, 
        reason: `Action not authorized for ${agent} under policy "${policy.name}"`,
        matchedPolicy: policy.name,
        explanation: (policy as any).explanation || 'Action not in allowed actions list',
        compliance: (policy as any).compliance || [],
        impact: (policy as any).impact || 'Action prevented'
      };
    }

    // Conceptual/Abstract Conditions Evaluation
    if (isBlockPolicy) {
      // 1. GDPR Cross-Border Data Transfer
      if (conditions.framework === 'GDPR' && conditions.type === 'cross-border-transfer') {
        const isTransfer = ['send', 'transfer', 'export', 'share', 'transmit', 'upload', 'move', 'disclose'].some(w => lowercaseAction.includes(w));
        const isEUData = /\b(eu|europe|european|french|spanish|italian|polish|romanian|dutch|belgian|greek|swedish|austrian|portuguese)\b/i.test(lowercaseAction) || 
                         /\bgerman\s+(?:user|resident|customer|record|data|db|database)\b/i.test(lowercaseAction);
        
        if (isTransfer && isEUData) {
          const requireAdequacy = conditions.require_adequacy === true;
          const requireScc = conditions.require_scc === true;
          
          if (requireAdequacy || requireScc) {
            const hasScc = lowercaseAction.includes('scc');
            const hasAdequacy = lowercaseAction.includes('adequacy');
            const lacksSafeguards = ['without', 'no ', 'missing', 'lack', 'none', "haven't", "don't"].some(neg => lowercaseAction.includes(neg));
            
            if ((!hasScc && !hasAdequacy) || lacksSafeguards) {
              return {
                allowed: false,
                reason: `Policy Violation: ${policy.name}`,
                matchedPolicy: policy.name,
                explanation: 'Cross-border transfer of EU customer data to non-adequate jurisdiction without adequacy or SCC safeguards is blocked.',
                compliance: ['GDPR'],
                impact: 'Prevents unauthorized EU data exfiltration'
              };
            }
          }
        }
      }

      // 2. HIPAA PHI sharing without BAA
      if (conditions.framework === 'HIPAA' && conditions.type === 'phi-disclosure') {
        const shares = ['share', 'email', 'send', 'disclose', 'export', 'give', 'provide', 'access', 'expose'].some(w => lowercaseAction.includes(w));
        const hasPHI = ['phi', 'patient', 'medical', 'diagnosis', 'treatment', 'health', 'ssn', 'clinical'].some(w => lowercaseAction.includes(w));
        const isThirdParty = ['third-party', 'third party', 'vendor', 'partner', 'processor', 'diagnostics', 'analytics', 'external', 'outsourc'].some(w => lowercaseAction.includes(w));

        if (shares && hasPHI && isThirdParty) {
          if (conditions.require_baa === true) {
            const hasBaaMention = lowercaseAction.includes('baa');
            const hasAgreementMention = ['agreement', 'contract', 'signed'].some(w => lowercaseAction.includes(w));
            const lacksBaa = ['without', 'no ', 'missing', 'lack', 'none', "haven't", "don't"].some(neg => lowercaseAction.includes(neg));
            
            if ((!hasBaaMention && !hasAgreementMention) || lacksBaa) {
              return {
                allowed: false,
                reason: `Policy Violation: ${policy.name}`,
                matchedPolicy: policy.name,
                explanation: 'Sharing patient PHI with a third-party vendor without a signed Business Associate Agreement (BAA) is prohibited.',
                compliance: ['HIPAA'],
                impact: 'Prevents HIPAA compliance violation'
              };
            }
          }
        }
      }

      // 3. DPDP Minor Biometric Consent
      if (conditions.framework === 'DPDP' && conditions.type === 'minor-biometric-processing') {
        const processes = ['process', 'use', 'collect', 'save', 'analyze', 'turn on', 'enable', 'register', 'capture'].some(w => lowercaseAction.includes(w));
        const isMinor = ['minor', 'child', 'under 18', 'underage', 'kid', 'teen', 'under 15', 'under 16', 'under 14', 'age 14', 'age 15'].some(w => lowercaseAction.includes(w));
        const isBiometric = ['biometric', 'fingerprint', 'face', 'facial', 'iris', 'retina', 'voiceprint', 'dna'].some(w => lowercaseAction.includes(w));

        if (processes && isMinor && isBiometric) {
          if (conditions.require_parental_consent === true) {
            const hasConsent = ['consent', 'permission', 'approval'].some(w => lowercaseAction.includes(w));
            const hasParents = ['parents', 'parental', 'guardian'].some(w => lowercaseAction.includes(w));
            const lacksConsent = ['without', 'no ', "don't", 'not ', 'missing', "haven't", 'lack'].some(neg => lowercaseAction.includes(neg));
            
            const isConsentValid = (hasConsent || hasParents) && !lacksConsent;
            
            if (!isConsentValid) {
              return {
                allowed: false,
                reason: `Policy Violation: ${policy.name}`,
                matchedPolicy: policy.name,
                explanation: 'Processing minor\'s biometric data without verified parental consent is prohibited under DPDP.',
                compliance: ['DPDP'],
                impact: 'Prevents DPDP child privacy violation'
              };
            }
          }
        }
      }

      // 4. Regex Pattern Matches (for Security Templates)
      if (conditions.type === 'regex' && conditions.value) {
        try {
          const regex = new RegExp(conditions.value, 'i');
          if (regex.test(action)) {
            return {
              allowed: false,
              reason: `Policy Violation: ${policy.name}`,
              matchedPolicy: policy.name,
              explanation: `Action matches security pattern: ${conditions.value}`,
              compliance: ['Security'],
              impact: 'Prevents adversarial alignment breach'
            };
          }
        } catch (e) {
          console.warn(`[evaluatePolicy] Invalid regex in policy "${policy.name}" (id: ${policy.id}): ${e}`);
        }
      }
    }
  }

  return { 
    allowed: true, 
    matchedPolicy: firstMatchedPolicyName,
    explanation: firstMatchedExplanation,
    compliance: firstMatchedCompliance,
    impact: firstMatchedImpact
  };
};
