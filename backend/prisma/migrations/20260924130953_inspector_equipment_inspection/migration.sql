-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('ROUTINE', 'CORROSION', 'DAMAGE', 'POSSIBLE_LEAK', 'EQUIPMENT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "InspectionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "EnergyTrendClassification" AS ENUM ('NORMAL', 'EFFICIENCY_DEGRADATION_SUSPECTED', 'ENERGY_ANOMALY', 'INSPECTION_RECOMMENDED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'INSPECTOR';

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "description" TEXT,
    "baselinePowerW" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyBaseline" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "avgPowerShortW" DOUBLE PRECISION NOT NULL,
    "avgPowerLongW" DOUBLE PRECISION NOT NULL,
    "deviationPct" DOUBLE PRECISION NOT NULL,
    "classification" "EnergyTrendClassification" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "locationCode" TEXT,
    "component" TEXT,
    "inspectionType" "InspectionType" NOT NULL,
    "severity" "InspectionSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'OPEN',
    "aiResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionImage" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_label_key" ON "Equipment"("label");

-- CreateIndex
CREATE INDEX "EnergyBaseline_equipmentId_recordedAt_idx" ON "EnergyBaseline"("equipmentId", "recordedAt");

-- CreateIndex
CREATE INDEX "Inspection_equipmentId_createdAt_idx" ON "Inspection"("equipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "Inspection_inspectorId_createdAt_idx" ON "Inspection"("inspectorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyBaseline" ADD CONSTRAINT "EnergyBaseline_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionImage" ADD CONSTRAINT "InspectionImage_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
