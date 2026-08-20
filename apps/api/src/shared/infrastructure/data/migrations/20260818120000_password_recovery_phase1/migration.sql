-- This migration is executed transactionally by Prisma Migrate.

-- Detect canonical email collisions before changing any row. A raised exception
-- rolls back this migration, including all schema changes below.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "User"
        GROUP BY lower(trim("email") COLLATE "C")
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize User.email: canonical email collision detected';
    END IF;
END
$$;

-- Keep the existing unique index while replacing values with their canonical form.
UPDATE "User"
SET "email" = lower(trim("email") COLLATE "C");

ALTER TABLE "User"
    DROP COLUMN "password_reset_requested_at";

ALTER TABLE "User"
    ADD CONSTRAINT "User_email_canonical_check"
    CHECK (
        "email" ~ '^[[:ascii:]]+$'
        AND "email" COLLATE "C" = lower("email" COLLATE "C")
        AND "email" !~ '^[[:space:]]'
        AND "email" !~ '[[:space:]]$'
    );

DROP INDEX "PasswordResetRequest_code_hash_key";
DROP INDEX "PasswordResetRequest_user_id_created_at_idx";

CREATE TYPE "PasswordResetRequestStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'USED',
    'INVALIDATED'
);

ALTER TABLE "PasswordResetRequest"
    ADD COLUMN "status" "PasswordResetRequestStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "activated_at" TIMESTAMP(3);

ALTER TABLE "PasswordResetRequest"
    ALTER COLUMN "expires_at" DROP NOT NULL;

-- Existing rows were usable as soon as they were created. Preserve their
-- lifecycle while giving them an explicit activation timestamp.
UPDATE "PasswordResetRequest"
SET "activated_at" = "created_at",
    "status" = CASE
        WHEN "used_at" IS NOT NULL THEN 'USED'::"PasswordResetRequestStatus"
        WHEN "invalidated_at" IS NOT NULL THEN 'INVALIDATED'::"PasswordResetRequestStatus"
        ELSE 'ACTIVE'::"PasswordResetRequestStatus"
    END
WHERE "expires_at" IS NOT NULL;

-- The old schema had no partial unique index. If it contains more than one
-- active row for a user, retain the newest one and invalidate the others.
WITH ranked_active AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "user_id"
            ORDER BY "created_at" DESC, "id" DESC
        ) AS row_number
    FROM "PasswordResetRequest"
    WHERE "status" = 'ACTIVE'
)
UPDATE "PasswordResetRequest" AS request
SET "status" = 'INVALIDATED',
    "invalidated_at" = COALESCE("invalidated_at", "created_at")
FROM ranked_active
WHERE request."id" = ranked_active."id"
  AND ranked_active.row_number > 1;

ALTER TABLE "PasswordResetRequest"
    ADD CONSTRAINT "PasswordResetRequest_lifecycle_check"
    CHECK (
        (
            "status" = 'PENDING'
            AND "activated_at" IS NULL
            AND "expires_at" IS NULL
            AND "used_at" IS NULL
            AND "invalidated_at" IS NULL
        )
        OR (
            "status" = 'ACTIVE'
            AND "activated_at" IS NOT NULL
            AND "expires_at" IS NOT NULL
            AND "expires_at" >= "activated_at"
            AND "used_at" IS NULL
            AND "invalidated_at" IS NULL
        )
        OR (
            "status" = 'USED'
            AND "activated_at" IS NOT NULL
            AND "expires_at" IS NOT NULL
            AND "expires_at" >= "activated_at"
            AND "used_at" IS NOT NULL
            AND "used_at" >= "activated_at"
            AND "invalidated_at" IS NULL
        )
        OR (
            "status" = 'INVALIDATED'
            AND "used_at" IS NULL
            AND "invalidated_at" IS NOT NULL
            AND (
                ("activated_at" IS NULL AND "expires_at" IS NULL)
                OR (
                    "activated_at" IS NOT NULL
                    AND "expires_at" IS NOT NULL
                    AND "expires_at" >= "activated_at"
                )
            )
        )
    );

ALTER TABLE "PasswordResetRequest"
    ADD CONSTRAINT "PasswordResetRequest_attempts_check"
    CHECK ("attempts" >= 0);

CREATE UNIQUE INDEX "PasswordResetRequest_one_active_per_user_idx"
    ON "PasswordResetRequest"("user_id")
    WHERE "status" = 'ACTIVE';

CREATE INDEX "PasswordResetRequest_user_id_status_activated_at_idx"
    ON "PasswordResetRequest"("user_id", "status", "activated_at");

CREATE INDEX "PasswordResetRequest_created_at_idx"
    ON "PasswordResetRequest"("created_at");

CREATE INDEX "PasswordResetRequest_status_expires_at_idx"
    ON "PasswordResetRequest"("status", "expires_at");
