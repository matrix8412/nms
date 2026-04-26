-- CreateEnum
CREATE TYPE "SnmpVersion" AS ENUM ('V2C', 'V3');

-- CreateEnum
CREATE TYPE "SnmpAuthProtocol" AS ENUM ('MD5', 'SHA');

-- CreateEnum
CREATE TYPE "SnmpPrivProtocol" AS ENUM ('DES', 'AES');

-- CreateEnum
CREATE TYPE "SnmpStatus" AS ENUM ('UNKNOWN', 'UP', 'DOWN');

-- AlterTable Device: add SNMP monitoring configuration and cached data
ALTER TABLE "Device"
ADD COLUMN "snmpVersion" "SnmpVersion",
ADD COLUMN "snmpPort" INTEGER NOT NULL DEFAULT 161,
ADD COLUMN "snmpCommunity" TEXT,
ADD COLUMN "snmpUsername" TEXT,
ADD COLUMN "snmpAuthProtocol" "SnmpAuthProtocol",
ADD COLUMN "snmpAuthPassword" TEXT,
ADD COLUMN "snmpPrivProtocol" "SnmpPrivProtocol",
ADD COLUMN "snmpPrivPassword" TEXT,
ADD COLUMN "snmpStatus" "SnmpStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "snmpLastSyncAt" TIMESTAMP(3),
ADD COLUMN "snmpLastError" TEXT,
ADD COLUMN "snmpHostname" TEXT,
ADD COLUMN "snmpSoftwareVersion" TEXT,
ADD COLUMN "snmpUptimeTicks" INTEGER,
ADD COLUMN "snmpInterfaces" JSONB;

-- CreateTable SnmpOidTemplate
CREATE TABLE "SnmpOidTemplate" (
  "id" TEXT NOT NULL,
  "vendor" TEXT,
  "deviceType" TEXT,
  "metricKey" TEXT NOT NULL,
  "oid" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SnmpOidTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SnmpOidTemplate_vendor_deviceType_idx" ON "SnmpOidTemplate"("vendor", "deviceType");
CREATE UNIQUE INDEX "SnmpOidTemplate_vendor_deviceType_metricKey_key" ON "SnmpOidTemplate"("vendor", "deviceType", "metricKey");
