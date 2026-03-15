-- AlterTable
ALTER TABLE "Instructor" ADD COLUMN "schedule" JSONB;
ALTER TABLE "Instructor" ADD COLUMN "holidays" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InstructorToService" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_InstructorToService_AB_unique" ON "_InstructorToService"("A", "B");

-- CreateIndex
CREATE INDEX "_InstructorToService_B_index" ON "_InstructorToService"("B");

-- AddForeignKey
ALTER TABLE "_InstructorToService" ADD CONSTRAINT "_InstructorToService_A_fkey" FOREIGN KEY ("A") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorToService" ADD CONSTRAINT "_InstructorToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
