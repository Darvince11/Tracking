-- Preserve fractional estimates such as 0.5 hours for accurate SLA timing.
ALTER TABLE "tickets" ALTER COLUMN "slaHours" TYPE DOUBLE PRECISION;
