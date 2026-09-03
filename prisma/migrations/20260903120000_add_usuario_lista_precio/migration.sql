-- AlterTable
ALTER TABLE `Usuario` ADD COLUMN `listaPrecioId` INTEGER NULL,
    ADD COLUMN `listas_permitidas` TEXT NULL;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_listaPrecioId_fkey` FOREIGN KEY (`listaPrecioId`) REFERENCES `ListaPrecio`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
