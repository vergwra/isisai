-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."PredictionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'ERROR');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."PredictionStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "volumeTon" DECIMAL(12,4) NOT NULL,
    "leadTimeDays" INTEGER,
    "fuelIndex" DECIMAL(12,4),
    "taxMultiplier" DECIMAL(12,4),
    "inputJson" JSONB NOT NULL,
    "costTotal" DECIMAL(18,4),
    "euroPerKg" DECIMAL(18,6),
    "outputJson" JSONB,
    "modelUsed" TEXT,
    "modelVersion" TEXT,
    "artifactPath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
