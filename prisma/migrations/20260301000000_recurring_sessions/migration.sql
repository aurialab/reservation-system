-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable Session: add new columns (nullable initially to handle existing rows)
ALTER TABLE "Session" ADD COLUMN "startDate" DATE;
ALTER TABLE "Session" ADD COLUMN "endDate" DATE;
ALTER TABLE "Session" ADD COLUMN "weekDays" "WeekDay"[] NOT NULL DEFAULT '{}';

-- Migrate existing date data: copy date → startDate and endDate
UPDATE "Session" SET "startDate" = "date", "endDate" = "date";

-- Make startDate and endDate NOT NULL now that all rows have values
ALTER TABLE "Session" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "Session" ALTER COLUMN "endDate" SET NOT NULL;

-- Drop old date index and column
DROP INDEX IF EXISTS "Session_date_idx";
ALTER TABLE "Session" DROP COLUMN "date";

-- CreateIndex for new date columns
CREATE INDEX "Session_startDate_idx" ON "Session"("startDate");
CREATE INDEX "Session_endDate_idx" ON "Session"("endDate");

-- AlterTable Reservation: add occurrenceDate (nullable — per-occurrence, required at app level for new reservations)
ALTER TABLE "Reservation" ADD COLUMN "occurrenceDate" DATE;

-- CreateIndex for occurrenceDate
CREATE INDEX "Reservation_occurrenceDate_idx" ON "Reservation"("occurrenceDate");
