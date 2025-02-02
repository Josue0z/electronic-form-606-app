/*
  Warnings:

  - Added the required column `documentTypeId` to the `Documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Documents" ADD COLUMN     "documentTypeId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_id_key" ON "DocumentType"("id");

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
