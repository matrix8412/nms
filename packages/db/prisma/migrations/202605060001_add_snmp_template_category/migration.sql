ALTER TABLE "SnmpOidTemplate"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OVERVIEW';

UPDATE "SnmpOidTemplate"
SET "category" = 'INTERFACES'
WHERE "metricKey" IN ('ifOperStatus', 'ifName', 'ifDescription', 'ifMac')
   OR "metricKey" ILIKE 'if%';
