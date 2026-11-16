# Git Conventions — Matinee

## 1. Repository authority

- Inspect the repository's existing Git workflow before creating branches or changing history.
- Follow established branch names, commit conventions, hooks, and release procedures when they exist.
- Do not introduce a new branching model without team approval.
- Read `AGENTS.md` before committing changes.
- Keep each change focused on one coherent task.

## 2. Branching

- Do not commit directly to a protected production or release branch.
- Use the repository's approved feature, fix, chore, or release branch convention.
- Keep branches short-lived where practical.
- Rebase or merge according to the repository's established policy.
- Do not rewrite shared branch history without explicit agreement.
- Do not force-push shared branches unless the team workflow explicitly permits it.
- Do not mix unrelated refactors, features, and fixes in one branch.

## 3. Commit messages

- Write commit messages that describe the change and its purpose.
- Follow the repository's existing commit-message format.
- If no convention exists, use a concise imperative subject.
- Keep each commit focused and reviewable.
- Do not use vague messages such as `updates`, `changes`, or `fix stuff`.
- Do not claim a test, migration, or integration was completed unless it was actually completed.
- Do not include secrets, credentials, customer data, or provider payloads in commit messages.

## 4. Pull requests and review

- Explain the problem, implementation, and relevant PRD requirement.
- Identify affected modules and API contracts.
- Describe database migrations and data backfills.
- Call out concurrency, security, money, privacy, and operational implications.
- Include screenshots or recordings for meaningful UI changes where useful.
- List tests and checks actually run.
- List checks not run and why.
- Identify unresolved decisions and blockers.
- Do not merge a change that violates an `AGENTS.md` invariant.
- Require review for changes to payment, inventory, database constraints, authentication, authorization, refunds, settlement, or data retention.
- Review generated code and AI-assisted changes as carefully as handwritten code.

## 5. Migration and financial change discipline

- Never hide a schema change inside an unrelated commit.
- Include versioned migrations with schema changes.
- Call out destructive migrations explicitly.
- Do not silently drop columns, constraints, financial history, or audit records.
- Include backfill and recovery instructions when existing data is affected.
- Test migrations on a clean database and an upgrade path.
- Review changes to booking, payment, refund, ledger, and settlement state transitions with the appropriate domain owner.
- Do not deploy a financial-policy change before the required Product/Finance approval.

## 6. Secrets and sensitive files

- Never commit `.env` files containing secrets, API keys, credentials, signing keys, or webhook secrets.
- Commit safe example configuration only, with placeholder values.
- Do not commit production database dumps or real customer/payment data.
- Check staged files before committing.
- If a secret is committed, treat it as exposed: notify the responsible owner and rotate/revoke it. Removing it in a later commit does not make it safe.

## 7. Generated and dependency files

- Follow the repository's package-manager and lockfile conventions.
- Include lockfile changes when dependency changes require them.
- Do not commit generated build output unless the repository explicitly requires it.
- Do not manually edit generated files when their source should be changed instead.
- Keep dependency changes focused and explain why each new dependency is required.

## 8. Before pushing

- Inspect `git status`.
- Inspect the complete diff.
- Check for accidental secrets and sensitive data.
- Run relevant tests, formatting, linting, type checks, and builds.
- Verify migration files and generated artifacts.
- Confirm no unrelated files are included.
- Confirm the branch is based on the expected target branch.

## 9. Before release

- Confirm the approved release gate is satisfied.
- Confirm migrations and invariant checks pass.
- Confirm payment-provider environment configuration is correct for the target environment.
- Confirm no sandbox credentials or test endpoints are used in production.
- Confirm rollback/recovery procedures exist for risky changes.
- Confirm monitoring and runbooks cover the changed workflow.
- Record the release commit and migration version.
- Never describe a release as safe solely because the build succeeded.