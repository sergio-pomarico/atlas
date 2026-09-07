/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Session_open_user_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "Session_open_user_id_key" ON "Session"("user_id") WHERE ("revoked_at" IS NULL);
