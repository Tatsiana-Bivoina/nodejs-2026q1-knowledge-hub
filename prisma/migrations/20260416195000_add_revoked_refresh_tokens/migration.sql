-- CreateTable
CREATE TABLE "RevokedRefreshToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevokedRefreshToken_token_key" ON "RevokedRefreshToken"("token");

-- CreateIndex
CREATE INDEX "RevokedRefreshToken_userId_idx" ON "RevokedRefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RevokedRefreshToken_expiresAt_idx" ON "RevokedRefreshToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "RevokedRefreshToken" ADD CONSTRAINT "RevokedRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
