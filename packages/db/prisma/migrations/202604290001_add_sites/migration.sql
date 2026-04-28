CREATE TABLE "Site" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "descriptiveNumber" TEXT NOT NULL,
  "orientationNumber" TEXT,
  "zipNumber" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

ALTER TABLE "Device"
ADD COLUMN "siteId" TEXT;

CREATE INDEX "Device_siteId_idx" ON "Device"("siteId");

ALTER TABLE "Device"
ADD CONSTRAINT "Device_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
