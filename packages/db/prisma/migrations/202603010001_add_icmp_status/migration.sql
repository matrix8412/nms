-- CreateEnum IcmpStatus
CREATE TYPE "IcmpStatus" AS ENUM ('UNKNOWN', 'UP', 'DOWN');

-- AlterTable Device: add ICMP monitoring columns
ALTER TABLE "Device"
  ADD COLUMN "icmpStatus" "IcmpStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "lastPingAt" TIMESTAMP(3),
  ADD COLUMN "lastPingDuration" DOUBLE PRECISION;
