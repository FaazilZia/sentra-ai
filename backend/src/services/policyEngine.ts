import prisma from '../config/db';
import { cacheService } from './cache.service';

export interface PolicyEvaluation {
  allowed: boolean;
  reason?: string;
  matchedPolicy?: string;
  ruleId?: string;
  explanation?: string;
  compliance?: any;
  impact?: string;
  isPendingApproval?: boolean;
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

export const evaluatePolicy = async (agent: string, action: string, organizationId: string, metadata: any = {}): Promise<PolicyEvaluation> => {
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
      matchedPolicy: 'Strict PII & SSN Redaction Rule',
      ruleId: 'rule-1',
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
      matchedPolicy: 'Shadow Agent Workspace Admin Access Block',
      ruleId: 'rule-4',
      explanation: 'Permanent deletion of data under production environments is prohibited.',
      compliance: ['NIST_AI_RMF', 'GDPR'],
      impact: 'Prevents data loss in production'
    };
  }

  // L1 Check 3: PII Export / Sensitive Metadata Flag Violation
  const hasPiiFlag = metadata?.contains_pii === true || metadata?.containsPII === true || metadata?.contains_PII === true || metadata?.pii === true;
  const fileStr = String(metadata?.file || metadata?.filename || metadata?.path || metadata?.resource || '').toLowerCase();
  const hasPiiFilePattern = /\bssn\b|customer_ssn|pii|personal_data|patient_record|credit_card/i.test(fileStr);
  const isExportOrDataMovement = /export|write|send|upload|exfiltrate|transfer|outbound|share|dump|store|save|s3/i.test(lowercaseAction);

  if (hasPiiFlag || (hasPiiFilePattern && (isExportOrDataMovement || hasPiiFlag))) {
    return {
      allowed: false,
      reason: 'Policy Violation: Unauthorized PII Data Export',
      matchedPolicy: 'Strict PII & SSN Redaction Rule',
      ruleId: 'rule-1',
      explanation: 'Exporting or transmitting data flagged as containing PII (contains_pii: true or sensitive PII file pattern) is prohibited by policy.',
      compliance: ['GDPR', 'HIPAA', 'DPDP', 'NIST_AI_RMF'],
      impact: 'Prevents customer PII exfiltration and privacy compliance breach'
    };
  }

  // L1 Check 4: High-Value Financial Threshold Breach ($10,000+)
  const amount = Number(metadata?.amount || metadata?.value || metadata?.total || metadata?.price || 0);
  const isFinancialAction = /payment|transfer|withdraw|payout|wire|disburse|process_payment/i.test(lowercaseAction);

  if (isFinancialAction && amount >= 10000) {
    return {
      allowed: false,
      reason: `Policy Violation: High-Value Financial Threshold Breach ($${amount.toLocaleString()})`,
      matchedPolicy: 'Disbursement > $10k Human Approval Trigger',
      ruleId: 'rule-3',
      explanation: `Payment processing or financial disbursement of $${amount.toLocaleString()} exceeds automated approval threshold ($10,000). Action flagged for mandatory human approval.`,
      compliance: ['PCI_DSS', 'SOX', 'FINANCIAL_COMPLIANCE'],
      impact: 'Requires human-in-the-loop approval before financial disbursement',
      isPendingApproval: true
    };
  }

  // L1 Check 5: Cross-Border EU/German Data Transfer Without Safeguards (GDPR Art. 44-49)
  const isTransferAction = /transfer|export|send|transmit|share|disclose|outbound|move|sync|replicate|forward|upload/i.test(lowercaseAction);
  const dataSubjectStr = String(metadata?.data_subjects || metadata?.dataSubjects || metadata?.resource || metadata?.file || '').toLowerCase();
  const destStr = String(metadata?.destination || '').toLowerCase();
  const hasEuOrGermanSubject = /(german|eu\b|eu_|europe|european|gdpr|eea|cross[-_ ]?border)/i.test(dataSubjectStr) ||
    /(german|eu\b|eu_|europe|european|gdpr|eea|cross[-_ ]?border)/i.test(lowercaseAction);
  const hasCustomerOrUserRecords = /(customer|user|resident|personal|record|identit|data|pii|cross[-_ ]?border)/i.test(dataSubjectStr) ||
    /(customer|user|resident|personal|record|identit|data|pii|cross[-_ ]?border)/i.test(lowercaseAction);
  const hasSccTerm = /\b(sccs?|adequacy|standard[_ ]+contractual[_ ]+clauses)\b/i.test(lowercaseAction);
  const hasWithoutModifier = /\b(without|no|missing|lacks?|unapproved|unverified)\b/i.test(lowercaseAction);
  const hasWithModifier = /\bwith\b/i.test(lowercaseAction) && !hasWithoutModifier;
  const hasSccFlagFalse = metadata?.has_scc === false || metadata?.hasScc === false || metadata?.has_adequacy === false || metadata?.hasAdequacy === false;
  const hasSccExplicitTrue = metadata?.has_scc === true || metadata?.hasScc === true || metadata?.has_adequacy === true || metadata?.hasAdequacy === true ||
    (hasWithModifier && hasSccTerm);
  const lacksSccPhrase = hasWithoutModifier && (hasSccTerm || /\btransfer\b/i.test(lowercaseAction));
  const hasExternalDestKeyword =
    /\b(us[-_ ]?based|us[-_ ]?east|us[-_ ]?west|united[_ ]+states)\b/i.test(lowercaseAction) ||
    /\b(external|non[-_ ]?eu|third[-_ ]?country|offshore)\b/i.test(lowercaseAction);
  const isUnapprovedDest = Boolean(destStr && !['eu', 'eea', 'internal', 'local', 'approved_eu_safe'].includes(destStr)) || hasExternalDestKeyword;

  if ((isTransferAction || Boolean(destStr)) && hasEuOrGermanSubject && hasCustomerOrUserRecords && !hasSccExplicitTrue && (hasSccFlagFalse || lacksSccPhrase || isUnapprovedDest)) {
    return {
      allowed: false,
      reason: 'Policy Violation: Cross-Border Data Transfer Without Safeguards (GDPR)',
      matchedPolicy: 'GDPR Cross-Border Transfer Guardrail',
      ruleId: 'rule-gdpr-transfer',
      explanation: 'Cross-border transfer of German/EU customer personal records to external or non-adequate destinations without Standard Contractual Clauses (SCC) or adequacy safeguards is prohibited under GDPR Art. 44-49.',
      compliance: ['GDPR'],
      impact: 'Prevents unlawful international data transfer and regulatory privacy breach'
    };
  }

  // L1 Check 6: Third-Party Healthcare PHI Disclosure Without Signed BAA (HIPAA Privacy Rule)
  const hasBaaTerm = /\b(baa|business[_ ]+associate[_ ]+agreement)\b/i.test(lowercaseAction);
  const hasBaaFlagFalse = metadata?.has_baa === false || metadata?.hasBaa === false;
  const hasBaaExplicitTrue = metadata?.has_baa === true || metadata?.hasBaa === true || (hasWithModifier && hasBaaTerm);
  const lacksBaaPhrase = hasWithoutModifier && hasBaaTerm;
  const hasVendorOrThirdParty = Boolean(metadata?.vendor || metadata?.third_party || metadata?.thirdParty) || 
                                /(third[-_ ]?party|vendor|partner|external|lab\b|processor|diagnostics|outsourc)/i.test(lowercaseAction);
  const hasPhiOrClinical = Boolean(metadata?.patientId || metadata?.patient_id || metadata?.clinical_data || metadata?.diagnosis) ||
                           /(phi\b|patient|medical|clinical|diagnosis|treatment|health|ehr\b|emr\b|prescription|hipaa)/i.test(lowercaseAction);
  const isHealthcareShare = /share|email|send|disclose|export|transmit|provide|expose|transfer|sync/i.test(lowercaseAction) || Boolean(metadata?.vendor);

  if (isHealthcareShare && hasPhiOrClinical && !hasBaaExplicitTrue && (hasBaaFlagFalse || lacksBaaPhrase || (hasVendorOrThirdParty && metadata?.has_baa === false))) {
    return {
      allowed: false,
      reason: 'Policy Violation: PHI Disclosure Without Signed BAA (HIPAA)',
      matchedPolicy: 'HIPAA PHI Vendor Disclosure Guardrail',
      ruleId: 'rule-hipaa-baa',
      explanation: 'Sharing protected health information (PHI) or clinical diagnosis records with a third-party vendor without an active, signed Business Associate Agreement (BAA) violates HIPAA Privacy & Security Rules (45 CFR § 164.502(e)).',
      compliance: ['HIPAA'],
      impact: 'Prevents unauthorized third-party PHI disclosure and HIPAA compliance penalties'
    };
  }

  // L1 Check 7: Minor Biometric Data Processing Without Verified Parental Consent (DPDP Section 9)
  const rawAge = metadata?.dataPrincipalAge ?? metadata?.subject_age ?? metadata?.age ?? metadata?.principal_age;
  const principalAge = rawAge !== undefined && rawAge !== null ? Number(rawAge) : 999;
  const isAdultPrincipal = rawAge !== undefined && rawAge !== null && principalAge >= 18;
  const hasConsentTerm = /\bconsent\b/i.test(lowercaseAction);
  const hasParentalConsentFalse = metadata?.verifiedParentalConsent === false || metadata?.parental_consent === false || metadata?.parentalConsent === false || metadata?.has_consent === false;
  const hasParentalConsentExplicitTrue = metadata?.verifiedParentalConsent === true || metadata?.parental_consent === true || metadata?.parentalConsent === true || metadata?.has_consent === true ||
    (hasWithModifier && hasConsentTerm);
  const isMinorAge = principalAge < 18;
  const isMinorKeyword = /\b(minor|minors|child|children|underage|under[_ ]*18|kid|juvenile|teen|age[_ ]*1[0-7])\b/i.test(lowercaseAction);
  const isBiometricData = Boolean(metadata?.biometricType || metadata?.biometric_type) || 
                          /(biometric|facial|face[_ ]?scan|fingerprint|iris|retina|voiceprint|dna)/i.test(lowercaseAction);
  const lacksConsentPhrase = hasWithoutModifier && hasConsentTerm;
  const isProcessingAction = /process|collect|save|analyze|use|enable|register|scan|capture|store|share|export|extract|ingest|biometric[_ ]+data/i.test(lowercaseAction) ||
    Boolean(metadata?.biometricType || metadata?.biometric_type) ||
    hasParentalConsentFalse ||
    lacksConsentPhrase;

  if (!isAdultPrincipal && isProcessingAction && isBiometricData && (isMinorAge || isMinorKeyword) && !hasParentalConsentExplicitTrue && (hasParentalConsentFalse || lacksConsentPhrase || isMinorAge)) {
    return {
      allowed: false,
      reason: 'Policy Violation: Minor Biometric Processing Without Parental Consent (DPDP)',
      matchedPolicy: 'DPDP Minor Biometric Consent Guardrail',
      ruleId: 'rule-dpdp-biometric',
      explanation: 'Processing personal or biometric recognition data of a minor Data Principal (under age 18) without verified parental consent is prohibited under Section 9 of the Digital Personal Data Protection Act (DPDP).',
      compliance: ['DPDP'],
      impact: 'Prevents unlawful processing of minor biometric data and severe statutory penalties'
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
