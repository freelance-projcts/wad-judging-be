-- DropIndex
DROP INDEX "mark_entries_studentId_eventId_performanceId_key";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "supportsMultipleRounds" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "mark_entries" ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "mark_entries_studentId_eventId_performanceId_round_key" ON "mark_entries"("studentId", "eventId", "performanceId", "round");
