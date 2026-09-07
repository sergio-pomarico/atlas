BEGIN;

-- Add the new lifecycle columns as nullable so unexpected legacy rows can be backfilled.
ALTER TABLE "Session"
ADD COLUMN "expires_at" TIMESTAMP(3),
ADD COLUMN "revoked_at" TIMESTAMP(3);

UPDATE "Session"
SET
    "expires_at" = "last_login" + INTERVAL '30 days',
    "revoked_at" = CASE
        WHEN "active" = false THEN COALESCE("updated_at", "last_login", "created_at", CURRENT_TIMESTAMP)
        ELSE NULL
    END,
    "last_login_ip" = LEFT(COALESCE("last_login_ip", 'unknown'), 45),
    "user_agent" = LEFT("user_agent", 512);

ALTER TABLE "Session"
ALTER COLUMN "expires_at" SET NOT NULL;

ALTER TABLE "Session"
RENAME COLUMN "last_login_ip" TO "ip_address";

ALTER TABLE "Session"
ALTER COLUMN "ip_address" TYPE VARCHAR(45),
ALTER COLUMN "ip_address" SET NOT NULL,
ALTER COLUMN "user_agent" TYPE VARCHAR(512),
ALTER COLUMN "updated_at" DROP DEFAULT;

DROP INDEX "Session_user_id_key";

ALTER TABLE "Session"
DROP COLUMN "active",
DROP COLUMN "last_login";

CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");
CREATE UNIQUE INDEX "Session_open_user_id_key"
ON "Session"("user_id")
WHERE "revoked_at" IS NULL;

COMMIT;
