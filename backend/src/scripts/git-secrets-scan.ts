import { execSync } from 'child_process';
import path from 'path';

const KEYWORDS = [
  'jwt_secret',
  'refresh_secret',
  'smtp_pass',
  'database_url',
  'redis_url',
  'aws_secret_access_key',
  'sso_provider',
  'scimbearertoken'
];

const IGNORE_PATTERNS = [
  /placeholder/i,
  /example/i,
  /your_/i,
  /change_me/i,
  /mock/i,
  /test/i,
  /dummy/i,
  /setup/i,
  /localhost/i,
  /127\.0\.0\.1/i,
  /postgres:\/\/postgres:postgres/i // default local test DB
];

function runScan() {
  console.log('=== STARTING GIT HISTORY SECRETS AUDIT ===');
  const repoDir = path.join(__dirname, '..', '..', '..');

  try {
    // Get full git diff history
    const output = execSync('git log -p --all', { cwd: repoDir, maxBuffer: 50 * 1024 * 1024 }).toString();
    const lines = output.split('\n');

    let currentCommit = 'Initial state / Uncommitted';
    let currentAuthor = 'Unknown';
    let currentDate = 'Unknown';
    let currentSubject = 'Unknown';
    const leaks: Array<{ commit: string; author: string; date: string; subject: string; line: string }> = [];

    for (const line of lines) {
      if (line.startsWith('commit ')) {
        currentCommit = line.substring(7).trim();
      } else if (line.startsWith('Author: ')) {
        currentAuthor = line.substring(8).trim();
      } else if (line.startsWith('Date: ')) {
        currentDate = line.substring(6).trim();
      } else if (line.startsWith('    ') && !line.trim().startsWith('Co-authored-by:')) {
        currentSubject = line.trim();
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        const content = line.substring(1).trim();
        
        // Skip imports, typescript types, empty lines
        if (content.startsWith('import ') || content.startsWith('export ') || content.length < 5) {
          continue;
        }

        // Check if any keyword matches
        const lowerContent = content.toLowerCase();
        const matchesKeyword = KEYWORDS.some(k => lowerContent.includes(k));
        
        if (matchesKeyword) {
          // Extract potential secret value
          const eqIndex = content.indexOf('=');
          const colonIndex = content.indexOf(':');
          const splitIndex = eqIndex !== -1 ? eqIndex : colonIndex;

          if (splitIndex !== -1) {
            const val = content.substring(splitIndex + 1).replace(/['";,]/g, '').trim();
            if (val.length >= 8) {
              const isIgnored = IGNORE_PATTERNS.some(pat => pat.test(val) || pat.test(content));
              if (!isIgnored) {
                leaks.push({
                  commit: currentCommit,
                  author: currentAuthor,
                  date: currentDate,
                  subject: currentSubject,
                  line: content
                });
              }
            }
          }
        }
      }
    }

    if (leaks.length === 0) {
      console.log('✅ SUCCESS: Zero secrets or leaked credentials found in the entire git history!');
    } else {
      console.warn(`⚠️ WARNING: Found ${leaks.length} potential historical secret leak(s) in git history!`);
      for (const leak of leaks) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Commit:  ${leak.commit}`);
        console.log(`Author:  ${leak.author}`);
        console.log(`Date:    ${leak.date}`);
        console.log(`Subject: ${leak.subject}`);
        console.log(`Line:    ${leak.line}`);
      }
      console.log(`\n⚠️ ACTION REQUIRED: If any of the above are production credentials, rotate them immediately at the provider level!`);
    }
  } catch (err: any) {
    console.error('Failed to run git history secrets scan:', err.message);
  }
}

runScan();
