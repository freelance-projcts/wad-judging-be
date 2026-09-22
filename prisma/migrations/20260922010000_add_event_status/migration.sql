-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'PERFORMANCE_1_COMPLETE', 'PERFORMANCE_2_COMPLETE');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");
