-- El plan gratuito pasa de 1 GB a 5 GB.

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "storageLimit" SET DEFAULT 5368709120;

-- El default solo afecta a las filas nuevas, asi que se sube tambien el limite
-- de las cuentas que ya existen. Se acota al valor por defecto anterior para no
-- pisar ningun limite ajustado a mano.
UPDATE "User" SET "storageLimit" = 5368709120 WHERE "storageLimit" = 1073741824;
