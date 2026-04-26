ALTER TABLE "DeviceType"
ADD COLUMN "vendor" TEXT;

CREATE INDEX "DeviceType_vendor_idx" ON "DeviceType"("vendor");