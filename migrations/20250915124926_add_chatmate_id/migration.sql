-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "sendbirdUserId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "sendbirdChannelUrl" TEXT NOT NULL,
    "channelType" TEXT NOT NULL DEFAULT 'group',
    "name" TEXT,
    "createdBy" TEXT NOT NULL,
    "chatmateId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "totalMessageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_members" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sendbirdUserId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "sendbirdUserId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_sendbirdUserId_key" ON "users"("sendbirdUserId");

-- CreateIndex
CREATE UNIQUE INDEX "channels_sendbirdChannelUrl_key" ON "channels"("sendbirdChannelUrl");

-- CreateIndex
CREATE UNIQUE INDEX "channel_members_channelId_userId_key" ON "channel_members"("channelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "user_sessions"("sessionToken");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("sendbirdUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
