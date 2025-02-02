-- CreateTable
CREATE TABLE "EmailVerifications" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "isVerify" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifications_email_key" ON "EmailVerifications"("email");
