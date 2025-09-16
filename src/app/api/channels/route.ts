import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { createApiResponse, createApiError } from "@/lib/utils";

const CreateChannelSchema = z.object({
  sendbirdChannelUrl: z.string().min(1, "Channel URL is required"),
  channelType: z.enum(["group", "open", "direct"]).default("group"),
  name: z.string().optional(),
  coverUrl: z.string().optional(),
  createdBy: z.string().min(1, "Creator user ID is required"),
  chatmateId: z.string().optional(), // For 1-1 channels only
  members: z.array(z.string()).optional().default([]),
  totalMessageCount: z.number().optional().default(0),
});

const UpdateChannelSchema = z.object({
  name: z.string().optional(),
  coverUrl: z.string().optional(),
  totalMessageCount: z.number().optional(),
  isDeleted: z.boolean().optional(),
});

/**
 * GET /api/channels - Get all channels or specific channel
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelUrl = searchParams.get("channelUrl");
    const userId = searchParams.get("userId");

    if (channelUrl) {
      // Get specific channel
      const channel = await db.channel.findUnique({
        where: { sendbirdChannelUrl: decodeURIComponent(channelUrl) },
        include: {
          creator: {
            select: {
              sendbirdUserId: true,
              nickname: true,
              profileImageUrl: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  sendbirdUserId: true,
                  nickname: true,
                  profileImageUrl: true,
                },
              },
            },
            where: { isActive: true },
          },
        },
      });

      if (!channel) {
        return NextResponse.json(createApiError("Channel not found", 404), {
          status: 404,
        });
      }

      return NextResponse.json(
        createApiResponse(channel, "Channel retrieved successfully")
      );
    } else if (userId) {
      // Get channels for specific user
      const channels = await db.channel.findMany({
        where: {
          OR: [
            { createdBy: userId },
            {
              members: {
                some: {
                  sendbirdUserId: userId,
                  isActive: true,
                },
              },
            },
          ],
          isDeleted: false,
        },
        include: {
          creator: {
            select: {
              sendbirdUserId: true,
              nickname: true,
              profileImageUrl: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  sendbirdUserId: true,
                  nickname: true,
                  profileImageUrl: true,
                },
              },
            },
            where: { isActive: true },
          },
          _count: {
            select: {
              members: {
                where: { isActive: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(
        createApiResponse(channels, "User channels retrieved successfully")
      );
    } else {
      // Get all channels
      const channels = await db.channel.findMany({
        where: { isDeleted: false },
        include: {
          creator: {
            select: {
              sendbirdUserId: true,
              nickname: true,
              profileImageUrl: true,
            },
          },
          _count: {
            select: {
              members: {
                where: { isActive: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(
        createApiResponse(channels, "Channels retrieved successfully")
      );
    }
  } catch (error) {
    console.error("GET /api/channels error:", error);
    return NextResponse.json(
      createApiError("Failed to retrieve channels", 500, error),
      { status: 500 }
    );
  }
}

/**
 * POST /api/channels - Create a new channel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateChannelSchema.parse(body);

    // Check if channel already exists
    const existingChannel = await db.channel.findUnique({
      where: { sendbirdChannelUrl: validatedData.sendbirdChannelUrl },
    });

    if (existingChannel && !existingChannel.isDeleted) {
      return NextResponse.json(createApiError("Channel already exists", 409), {
        status: 409,
      });
    }

    // Verify creator exists
    const creator = await db.user.findUnique({
      where: { sendbirdUserId: validatedData.createdBy },
    });

    if (!creator) {
      return NextResponse.json(createApiError("Creator user not found", 404), {
        status: 404,
      });
    }

    // Create or update channel in database
    const channel = await db.channel.upsert({
      where: { sendbirdChannelUrl: validatedData.sendbirdChannelUrl },
      update: {
        name: validatedData.name,
        coverUrl: validatedData.coverUrl,
        channelType: validatedData.channelType,
        chatmateId: validatedData.chatmateId,
        isDeleted: false,
        updatedAt: new Date(),
      },
      create: {
        sendbirdChannelUrl: validatedData.sendbirdChannelUrl,
        channelType: validatedData.channelType,
        name: validatedData.name,
        coverUrl: validatedData.coverUrl,
        createdBy: validatedData.createdBy,
        chatmateId: validatedData.chatmateId,
        totalMessageCount: validatedData.totalMessageCount,
      },
    });

    // Add channel members if provided
    if (validatedData.members && validatedData.members.length > 0) {
      // First, remove existing members for this channel
      await db.channelMember.updateMany({
        where: { channelId: channel.id },
        data: { isActive: false },
      });

      // Add new members
      const memberData = await Promise.all(
        validatedData.members.map(async (sendbirdUserId) => {
          const user = await db.user.findUnique({
            where: { sendbirdUserId },
          });
          return user
            ? {
                channelId: channel.id,
                userId: user.id,
                sendbirdUserId: user.sendbirdUserId,
              }
            : null;
        })
      );

      const validMemberData = memberData.filter(Boolean) as any[];

      if (validMemberData.length > 0) {
        await db.channelMember.createMany({
          data: validMemberData,
          skipDuplicates: true,
        });
      }
    }

    // Fetch the complete channel with relations
    const completeChannel = await db.channel.findUnique({
      where: { id: channel.id },
      include: {
        creator: {
          select: {
            sendbirdUserId: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                sendbirdUserId: true,
                nickname: true,
                profileImageUrl: true,
              },
            },
          },
          where: { isActive: true },
        },
      },
    });

    return NextResponse.json(
      createApiResponse(completeChannel, "Channel created successfully"),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiError("Validation failed", 400, error),
        { status: 400 }
      );
    }

    console.error("POST /api/channels error:", error);
    return NextResponse.json(
      createApiError("Failed to create channel", 500, error),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/channels - Update channel
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sendbirdChannelUrl, ...updateData } = body;

    if (!sendbirdChannelUrl) {
      return NextResponse.json(createApiError("Channel URL is required", 400), {
        status: 400,
      });
    }

    const validatedData = UpdateChannelSchema.parse(updateData);

    // Check if channel exists
    const existingChannel = await db.channel.findUnique({
      where: { sendbirdChannelUrl },
    });

    if (!existingChannel) {
      return NextResponse.json(createApiError("Channel not found", 404), {
        status: 404,
      });
    }

    // Update channel in database
    const updatedChannel = await db.channel.update({
      where: { sendbirdChannelUrl },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            sendbirdUserId: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                sendbirdUserId: true,
                nickname: true,
                profileImageUrl: true,
              },
            },
          },
          where: { isActive: true },
        },
      },
    });

    return NextResponse.json(
      createApiResponse(updatedChannel, "Channel updated successfully")
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiError("Validation failed", 400, error),
        { status: 400 }
      );
    }

    console.error("PUT /api/channels error:", error);
    return NextResponse.json(
      createApiError("Failed to update channel", 500, error),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/channels - Soft delete channel
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelUrl = searchParams.get("channelUrl");

    if (!channelUrl) {
      return NextResponse.json(createApiError("Channel URL is required", 400), {
        status: 400,
      });
    }

    const decodedChannelUrl = decodeURIComponent(channelUrl);

    // Check if channel exists
    const existingChannel = await db.channel.findUnique({
      where: { sendbirdChannelUrl: decodedChannelUrl },
    });

    if (!existingChannel) {
      return NextResponse.json(createApiError("Channel not found", 404), {
        status: 404,
      });
    }

    // Soft delete channel and deactivate members
    const [deletedChannel] = await db.$transaction([
      db.channel.update({
        where: { sendbirdChannelUrl: decodedChannelUrl },
        data: {
          isDeleted: true,
          updatedAt: new Date(),
        },
      }),
      db.channelMember.updateMany({
        where: { channelId: existingChannel.id },
        data: { isActive: false },
      }),
    ]);

    return NextResponse.json(
      createApiResponse(deletedChannel, "Channel deleted successfully")
    );
  } catch (error) {
    console.error("DELETE /api/channels error:", error);
    return NextResponse.json(
      createApiError("Failed to delete channel", 500, error),
      { status: 500 }
    );
  }
}
