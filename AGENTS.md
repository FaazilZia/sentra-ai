# Permanent Agent Rules

1. **Database Migration Safety**: NEVER run `prisma migrate resolve`, `prisma db push`, `prisma migrate reset`, or `prisma migrate dev` against production or any shared database. Never edit the `_prisma_migrations` table.
2. **Production Schema Approval**: Production schema changes only with explicit written approval from the user, and only after a fresh backup run is confirmed.
3. **Rigorous Verification**: Never mark anything "applied", "fixed", or "verified" from local output alone. Back every claim with real GitHub Actions, SonarCloud, or Render evidence. Mark each claim `VERIFIED` or `CLAIMED`.
4. **Secret Protection**: Never print, echo, log, or screenshot secrets. Stop and ask the user for logins or MFA.
5. **No Unauthorized Merges**: Merge nothing unless the user explicitly commands it.
6. **API Pagination Verification**: Whenever querying a list API (Render, GitHub, cloud providers, or internal services), always paginate or specify the maximum page size (`limit`/`per_page`), and explicitly report the item count received versus the total count. Never assume an unpaginated first page contains the complete set of entities.
