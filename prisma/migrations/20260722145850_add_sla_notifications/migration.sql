-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "overdueNotified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slaBreachedAt" TIMESTAMP(3),
ADD COLUMN     "slaCriticalSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slaHours" INTEGER,
ADD COLUMN     "slaWarningSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_userId_createdAt_idx" ON "notification_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_type_status_idx" ON "notification_logs"("type", "status");

-- CreateIndex
CREATE INDEX "notification_logs_ticketId_idx" ON "notification_logs"("ticketId");

-- CreateIndex
CREATE INDEX "tickets_slaBreachedAt_idx" ON "tickets"("slaBreachedAt");

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
