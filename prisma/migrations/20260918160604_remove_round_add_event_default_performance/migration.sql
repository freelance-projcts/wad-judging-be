-- DropIndex
DROP INDEX "mark_entries_studentId_eventId_performanceId_round_key";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "defaultPerformanceId" TEXT;

-- AlterTable
ALTER TABLE "mark_entries" DROP COLUMN "dSupervisor",
DROP COLUMN "e1Supervisor",
DROP COLUMN "e2Supervisor",
DROP COLUMN "e3Supervisor",
DROP COLUMN "e4Supervisor",
DROP COLUMN "penaltySupervisor",
DROP COLUMN "round",
ALTER COLUMN "dScore" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "e1Score" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "e2Score" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "e3Score" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "e4Score" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "penaltyScore" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "finalScore" SET DATA TYPE DECIMAL(10,3);

-- CreateIndex
CREATE INDEX "events_defaultPerformanceId_idx" ON "events"("defaultPerformanceId");

-- CreateIndex
CREATE UNIQUE INDEX "mark_entries_studentId_eventId_performanceId_key" ON "mark_entries"("studentId", "eventId", "performanceId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_defaultPerformanceId_fkey" FOREIGN KEY ("defaultPerformanceId") REFERENCES "performances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
