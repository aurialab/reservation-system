-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Business" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" INTEGER NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "locationId" INTEGER;

-- Backfill: assign a placeholder location so NOT NULL can be enforced
-- (Remove this block if the Session table is empty in production)
DO $$
DECLARE
    default_business_id INTEGER;
    default_location_id INTEGER;
BEGIN
    -- Only backfill if there are existing sessions without a locationId
    IF EXISTS (SELECT 1 FROM "Session" WHERE "locationId" IS NULL) THEN
        INSERT INTO "Business" ("name", "status")
        VALUES ('Default Business', 'ACTIVE')
        RETURNING "id" INTO default_business_id;

        INSERT INTO "Location" ("name", "city", "postalCode", "address", "isActive", "businessId")
        VALUES ('Default Location', 'Unknown', '00000', 'Unknown', true, default_business_id)
        RETURNING "id" INTO default_location_id;

        UPDATE "Session" SET "locationId" = default_location_id WHERE "locationId" IS NULL;
    END IF;
END $$;

-- Now enforce NOT NULL
ALTER TABLE "Session" ALTER COLUMN "locationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Location_businessId_idx" ON "Location"("businessId");

-- CreateIndex
CREATE INDEX "Session_locationId_idx" ON "Session"("locationId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
