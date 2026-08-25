-- Reconcile databases where the earlier SLA type migration was recorded but
-- the physical column remained INTEGER. This is safe when already converted.
ALTER TABLE "tickets"
  ALTER COLUMN "slaHours" TYPE DOUBLE PRECISION
  USING "slaHours"::DOUBLE PRECISION;
