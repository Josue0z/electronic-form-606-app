/*
  Warnings:

  - The primary key for the `RetentionIsr` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "PurchasesOrExpenses" DROP CONSTRAINT "PurchasesOrExpenses_retentionIsrId_fkey";

-- AlterTable
ALTER TABLE "PurchasesOrExpenses" ALTER COLUMN "retentionIsrId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "RetentionIsr" DROP CONSTRAINT "RetentionIsr_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "RetentionIsr_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RetentionIsr_id_seq";

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_retentionIsrId_fkey" FOREIGN KEY ("retentionIsrId") REFERENCES "RetentionIsr"("id") ON DELETE SET NULL ON UPDATE CASCADE;
