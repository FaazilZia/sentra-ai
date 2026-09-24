import { SentraClient, ActionRequest, ActionResponse } from '@sentra-ai/sdk';

const BASE_URL = process.env.SENTRA_BASE_URL || 'https://sentra-backend-node.onrender.com/api/v1';
const API_KEY = process.env.SENTRA_API_KEY || 'sentra_9143d22e_5QCbC-2sMIqzAc_5GASjtXbCFZMRNCXI';

const client = new SentraClient({
  apiKey: API_KEY,
  baseUrl: BASE_URL,
  maxRetries: 2,
  timeout: 15000,
});

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('===============================================================');
  console.log('🚀 EXECUTING 4 REPRESENTATIVE SDK SCENARIOS AGAINST LIVE BACKEND');
  console.log('===============================================================');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`API Key:     ${API_KEY.slice(0, 10)}...`);

  // 1. Case #5: SSN / PII export
  console.log('\n--- SCENARIO 1: Case #5 (SSN/PII Export) ---');
  const req5: ActionRequest = {
    agent: 'data-export-agent',
    action: 'export_to_s3',
    metadata: {
      bucket: 'finance-data-archive',
      file: 'customer_ssn_list.csv',
      contains_pii: true,
      ssn_sample: '000-12-3456',
      department: 'Finance',
    },
  };
  const res5 = await client.checkAction(req5);
  console.log('Result #5:', JSON.stringify(res5, null, 2));

  await sleep(1500);

  // 2. Case #9: $75,000 payment
  console.log('\n--- SCENARIO 2: Case #9 ($75,000 Financial Payment) ---');
  const req9: ActionRequest = {
    agent: 'billing-payment-agent',
    action: 'process_payment',
    metadata: {
      amount: 75000,
      currency: 'USD',
      invoiceId: 'INV-9021',
      recipient: 'Acme Supplies Corp',
      department: 'Finance',
    },
  };
  const res9 = await client.checkAction(req9);
  console.log('Result #9:', JSON.stringify(res9, null, 2));

  await sleep(1500);

  // 3. Case #15: GDPR transfer without SCC
  console.log('\n--- SCENARIO 3: Case #15 (GDPR Transfer w/o SCC) ---');
  const req15: ActionRequest = {
    agent: 'gdpr-compliance-agent',
    action: 'transfer german customer personal records to external analytics server without scc',
    metadata: {
      destination: 'us_east_analytics',
      data_subjects: 'german_user_records',
      has_scc: false,
      department: 'Privacy',
    },
  };
  const res15 = await client.checkAction(req15);
  console.log('Result #15:', JSON.stringify(res15, null, 2));

  await sleep(1500);

  // 4. Case #1: Safe read
  console.log('\n--- SCENARIO 4: Case #1 (Safe Documentation Read) ---');
  const req1: ActionRequest = {
    agent: 'doc-assistant',
    action: 'read_public_docs',
    metadata: { resource: 'api_quickstart.html', department: 'Engineering' },
  };
  const res1 = await client.checkAction(req1);
  console.log('Result #1:', JSON.stringify(res1, null, 2));

  console.log('\n===============================================================');
  console.log('SUMMARY OF 4 SCENARIOS:');
  console.log(`Case #5  (SSN/PII Export)        : status=${res5.status}, risk=${res5.risk}, ruleId=${(res5 as any).ruleId || (res5 as any).matchedPolicy || (res5 as any).policy || 'N/A'}`);
  console.log(`Case #9  ($75,000 Payment)       : status=${res9.status}, risk=${res9.risk}, isPendingApproval=${(res9 as any).isPendingApproval}`);
  console.log(`Case #15 (GDPR Transfer w/o SCC) : status=${res15.status}, risk=${res15.risk}, ruleId=${(res15 as any).ruleId || (res15 as any).matchedPolicy || (res15 as any).policy || 'N/A'}`);
  console.log(`Case #1  (Safe Read)             : status=${res1.status}, risk=${res1.risk}`);
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
