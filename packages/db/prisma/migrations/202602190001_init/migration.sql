CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "emailVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Group" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupMember" (
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "roleInGroup" TEXT,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("userId", "groupId")
);

CREATE TABLE "Device" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "vendor" TEXT,
  "type" TEXT,
  "zabbixHostId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeviceGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeviceGroupDevice" (
  "deviceId" TEXT NOT NULL,
  "deviceGroupId" TEXT NOT NULL,
  CONSTRAINT "DeviceGroupDevice_pkey" PRIMARY KEY ("deviceId", "deviceGroupId")
);

CREATE TABLE "GroupDeviceAccess" (
  "groupId" TEXT NOT NULL,
  "deviceGroupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupDeviceAccess_pkey" PRIMARY KEY ("groupId", "deviceGroupId")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionTokenHash" TEXT NOT NULL,
  "csrfSecret" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "meta" JSONB,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeviceMetric" (
  "id" BIGSERIAL NOT NULL,
  "deviceId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "itemKey" TEXT NOT NULL,
  "itemName" TEXT,
  "valueNumeric" DOUBLE PRECISION,
  "valueText" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "DeviceMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZabbixItemMapping" (
  "id" TEXT NOT NULL,
  "vendor" TEXT,
  "deviceType" TEXT,
  "itemKey" TEXT NOT NULL,
  "itemName" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZabbixItemMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");
CREATE UNIQUE INDEX "Device_ip_key" ON "Device"("ip");
CREATE UNIQUE INDEX "DeviceGroup_name_key" ON "DeviceGroup"("name");
CREATE UNIQUE INDEX "Session_sessionTokenHash_key" ON "Session"("sessionTokenHash");
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE UNIQUE INDEX "ZabbixItemMapping_vendor_deviceType_itemKey_key"
ON "ZabbixItemMapping"("vendor", "deviceType", "itemKey");

CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");
CREATE INDEX "DeviceGroupDevice_deviceGroupId_idx" ON "DeviceGroupDevice"("deviceGroupId");
CREATE INDEX "GroupDeviceAccess_deviceGroupId_idx" ON "GroupDeviceAccess"("deviceGroupId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken"("userId");
CREATE INDEX "VerificationToken_expiresAt_idx" ON "VerificationToken"("expiresAt");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "DeviceMetric_deviceId_recordedAt_idx" ON "DeviceMetric"("deviceId", "recordedAt" DESC);
CREATE INDEX "DeviceMetric_itemKey_recordedAt_idx" ON "DeviceMetric"("itemKey", "recordedAt" DESC);
CREATE INDEX "ZabbixItemMapping_vendor_deviceType_idx" ON "ZabbixItemMapping"("vendor", "deviceType");

ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceGroupDevice" ADD CONSTRAINT "DeviceGroupDevice_deviceId_fkey"
FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceGroupDevice" ADD CONSTRAINT "DeviceGroupDevice_deviceGroupId_fkey"
FOREIGN KEY ("deviceGroupId") REFERENCES "DeviceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupDeviceAccess" ADD CONSTRAINT "GroupDeviceAccess_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupDeviceAccess" ADD CONSTRAINT "GroupDeviceAccess_deviceGroupId_fkey"
FOREIGN KEY ("deviceGroupId") REFERENCES "DeviceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeviceMetric" ADD CONSTRAINT "DeviceMetric_deviceId_fkey"
FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

SELECT create_hypertable('"DeviceMetric"', 'recordedAt', if_not_exists => TRUE);
