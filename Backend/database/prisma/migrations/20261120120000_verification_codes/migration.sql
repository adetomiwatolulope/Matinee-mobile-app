ALTER TABLE "User" RENAME COLUMN "emailVerificationTokenHash" TO "emailVerificationCodeHash";

UPDATE "User"
SET "emailVerificationCodeHash" = NULL,
    "emailVerificationExpiresAt" = NULL;

ALTER TABLE "User" ADD COLUMN "emailVerificationFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "emailVerificationJobId" TEXT;

CREATE UNIQUE INDEX "User_emailVerificationCodeHash_key" ON "User"("emailVerificationCodeHash");

ALTER TABLE "EmailJob" ADD COLUMN "reference" TEXT;
ALTER TABLE "EmailJob" ADD COLUMN "leaseOwner" TEXT;
ALTER TABLE "EmailJob" ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);

UPDATE "EmailJob"
SET "reference" = "payload" ->> 'userId'
WHERE "type" = 'send_verification_email' AND "reference" IS NULL;

WITH ranked_jobs AS (
    SELECT "id",
           ROW_NUMBER() OVER (
             PARTITION BY "reference"
             ORDER BY "createdAt" DESC, "id" DESC
           ) AS "rank"
    FROM "EmailJob"
    WHERE "type" = 'send_verification_email'
      AND "status" IN ('pending', 'processing')
      AND "reference" IS NOT NULL
)
UPDATE "EmailJob" AS "job"
SET "status" = 'manual_review',
    "leaseOwner" = NULL,
    "leaseExpiresAt" = NULL
FROM ranked_jobs
WHERE "job"."id" = ranked_jobs."id"
  AND ranked_jobs."rank" > 1;

ALTER TABLE "EmailJob"
ADD CONSTRAINT "EmailJob_status_check"
CHECK ("status" IN ('pending', 'processing', 'completed', 'failed', 'manual_review'));

CREATE INDEX "EmailJob_status_leaseExpiresAt_idx" ON "EmailJob"("status", "leaseExpiresAt");

CREATE UNIQUE INDEX "EmailJob_one_active_verification_per_user_idx"
ON "EmailJob"("reference")
WHERE "type" = 'send_verification_email'
  AND "status" IN ('pending', 'processing')
  AND "reference" IS NOT NULL;
