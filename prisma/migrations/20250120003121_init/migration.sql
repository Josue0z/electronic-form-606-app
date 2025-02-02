-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordChangeMode" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Serial" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Serial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ClassificationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concepts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "invoiceTypeId" TEXT NOT NULL,
    "classificationTypeId" INTEGER NOT NULL,

    CONSTRAINT "Concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requests" (
    "id" TEXT NOT NULL,
    "requestNum" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestStatusId" INTEGER NOT NULL,

    CONSTRAINT "Requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "downloadURL" TEXT NOT NULL,
    "fileFormatType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasesOrExpenses" (
    "id" TEXT NOT NULL,
    "rncOrId" TEXT NOT NULL,
    "ncf" TEXT NOT NULL,
    "ncfAffected" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "retentionDate" TIMESTAMP(3),
    "total" DECIMAL(65,30) NOT NULL,
    "tax" DECIMAL(65,30) NOT NULL,
    "costTax" DECIMAL(65,30) DEFAULT 0,
    "taxPayerTypesId" INTEGER NOT NULL,
    "paymentsMethodsId" TEXT NOT NULL,
    "ncfsTypesId" TEXT NOT NULL,
    "ncfsAffectTypeId" TEXT,
    "retentionTaxId" INTEGER,
    "retentionIsrId" INTEGER,
    "costTaxStatusId" INTEGER,
    "conceptId" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "netAmount" DECIMAL(65,30) DEFAULT 0,
    "retentionTaxValue" DECIMAL(65,30) DEFAULT 0,
    "retentionIsrValue" DECIMAL(65,30) DEFAULT 0,

    CONSTRAINT "PurchasesOrExpenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPayerTypes" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxPayerTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentsMethods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentsMethods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NcfsTypes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NcfsTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionTax" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionTax_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "RetentionIsr" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionIsr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostTaxStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostTaxStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPayer" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "tradeName" TEXT,
    "about" TEXT,
    "col1" TEXT,
    "col2" TEXT,
    "col3" TEXT,
    "col4" TEXT,
    "createdAt" TEXT,
    "state" TEXT,
    "status" TEXT,

    CONSTRAINT "TaxPayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_id_key" ON "Users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Serial_code_key" ON "Serial"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassificationType_id_key" ON "ClassificationType"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Concepts_id_key" ON "Concepts"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RequestStatus_id_key" ON "RequestStatus"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Requests_id_key" ON "Requests"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Requests_email_key" ON "Requests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Documents_id_key" ON "Documents"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasesOrExpenses_id_key" ON "PurchasesOrExpenses"("id");

-- CreateIndex
CREATE UNIQUE INDEX "TaxPayerTypes_id_key" ON "TaxPayerTypes"("id");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceType_id_key" ON "InvoiceType"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentsMethods_id_key" ON "PaymentsMethods"("id");

-- CreateIndex
CREATE UNIQUE INDEX "NcfsTypes_id_key" ON "NcfsTypes"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionTax_id_key" ON "RetentionTax"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionTax_name_key" ON "RetentionTax"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionIsr_id_key" ON "RetentionIsr"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionIsr_name_key" ON "RetentionIsr"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CostTaxStatus_id_key" ON "CostTaxStatus"("id");

-- CreateIndex
CREATE UNIQUE INDEX "TaxPayer_id_key" ON "TaxPayer"("id");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_username_fkey" FOREIGN KEY ("username") REFERENCES "TaxPayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concepts" ADD CONSTRAINT "Concepts_classificationTypeId_fkey" FOREIGN KEY ("classificationTypeId") REFERENCES "ClassificationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concepts" ADD CONSTRAINT "Concepts_invoiceTypeId_fkey" FOREIGN KEY ("invoiceTypeId") REFERENCES "InvoiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concepts" ADD CONSTRAINT "Concepts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requests" ADD CONSTRAINT "Requests_username_fkey" FOREIGN KEY ("username") REFERENCES "TaxPayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requests" ADD CONSTRAINT "Requests_requestStatusId_fkey" FOREIGN KEY ("requestStatusId") REFERENCES "RequestStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_rncOrId_fkey" FOREIGN KEY ("rncOrId") REFERENCES "TaxPayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_taxPayerTypesId_fkey" FOREIGN KEY ("taxPayerTypesId") REFERENCES "TaxPayerTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_paymentsMethodsId_fkey" FOREIGN KEY ("paymentsMethodsId") REFERENCES "PaymentsMethods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_ncfsTypesId_fkey" FOREIGN KEY ("ncfsTypesId") REFERENCES "NcfsTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_ncfsAffectTypeId_fkey" FOREIGN KEY ("ncfsAffectTypeId") REFERENCES "NcfsTypes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_retentionTaxId_fkey" FOREIGN KEY ("retentionTaxId") REFERENCES "RetentionTax"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_retentionIsrId_fkey" FOREIGN KEY ("retentionIsrId") REFERENCES "RetentionIsr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesOrExpenses" ADD CONSTRAINT "PurchasesOrExpenses_costTaxStatusId_fkey" FOREIGN KEY ("costTaxStatusId") REFERENCES "CostTaxStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NcfsTypes" ADD CONSTRAINT "NcfsTypes_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "Serial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
