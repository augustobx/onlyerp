-- Apply explicitly after backup/isolated restore; never run the historical migrator.
-- Existing session tokens without a version remain valid at version zero.
ALTER TABLE `Usuario` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;
CREATE TABLE `HubCommand` (
  `id` VARCHAR(191) NOT NULL,
  `hash` CHAR(64) NOT NULL,
  `actor` VARCHAR(120) NOT NULL,
  `operation` VARCHAR(50) NOT NULL,
  `tenantId` INTEGER NULL,
  `result` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `HubCommand_tenantId_createdAt_idx` (`tenantId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
