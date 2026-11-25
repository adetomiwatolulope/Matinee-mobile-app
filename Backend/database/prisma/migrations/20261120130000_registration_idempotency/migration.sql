CREATE TABLE "RegistrationIdempotency" (
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "responseStatus" INTEGER,
    "responseJson" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationIdempotency_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "RegistrationIdempotency_status_check"
        CHECK ("status" IN ('pending', 'completed', 'failed')),
    CONSTRAINT "RegistrationIdempotency_response_check" CHECK (
        ("status" = 'pending' AND "responseStatus" IS NULL AND "responseJson" IS NULL)
        OR ("status" IN ('completed', 'failed') AND "responseStatus" IS NOT NULL AND "responseJson" IS NOT NULL)
    ),
    CONSTRAINT "RegistrationIdempotency_responseStatus_check"
        CHECK ("responseStatus" IS NULL OR ("responseStatus" >= 200 AND "responseStatus" <= 599))
);

CREATE INDEX "RegistrationIdempotency_status_expiresAt_idx"
    ON "RegistrationIdempotency"("status", "expiresAt");
