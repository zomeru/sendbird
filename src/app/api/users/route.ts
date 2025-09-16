import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { SendbirdService } from "@/lib/sendbird";
import { createApiResponse, createApiError } from "@/lib/utils";

const CreateUserSchema = z.object({
  sendbirdUserId: z.string().min(1, "User ID is required"),
  nickname: z
    .string()
    .min(2, "Nickname must be at least 2 characters")
    .max(30, "Nickname must be less than 30 characters"),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
});

const UpdateUserSchema = z.object({
  nickname: z
    .string()
    .min(2, "Nickname must be at least 2 characters")
    .max(30, "Nickname must be less than 30 characters")
    .optional(),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
});

/**
 * GET /api/users - Get all users or specific user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // Get specific user
      const user = await db.user.findUnique({
        where: { sendbirdUserId: userId },
        include: {
          createdChannels: {
            select: {
              id: true,
              sendbirdChannelUrl: true,
              name: true,
              createdAt: true,
            },
          },
          channelMembers: {
            include: {
              channel: {
                select: {
                  id: true,
                  sendbirdChannelUrl: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json(createApiError("User not found", 404), {
          status: 404,
        });
      }

      return NextResponse.json(
        createApiResponse(user, "User retrieved successfully")
      );
    } else {
      // Get all users
      const users = await db.user.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              createdChannels: true,
              channelMembers: true,
            },
          },
        },
      });

      return NextResponse.json(
        createApiResponse(users, "Users retrieved successfully")
      );
    }
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      createApiError("Failed to retrieve users", 500, error),
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { sendbirdUserId: validatedData.sendbirdUserId },
    });

    if (existingUser && !existingUser.isDeleted) {
      return NextResponse.json(createApiError("User already exists", 409), {
        status: 409,
      });
    }

    // Create or update user in Sendbird (optional - for demo purposes)
    try {
      await SendbirdService.createUser(
        validatedData.sendbirdUserId,
        validatedData.nickname,
        validatedData.profileImageUrl
      );
      console.log("Sendbird user created successfully");
    } catch (_sendbirdError) {
      // If user already exists in Sendbird, try to update instead
      try {
        await SendbirdService.updateUser(
          validatedData.sendbirdUserId,
          validatedData.nickname,
          validatedData.profileImageUrl
        );
        console.log("Sendbird user updated successfully");
      } catch (_updateError) {
        console.log(
          "Sendbird API not available (demo mode) - continuing with local database creation"
        );
        // This is expected in demo/test environments where Sendbird API credentials may not be active
        // The local database creation will still work correctly
      }
    }

    // Create or update user in local database
    const user = await db.user.upsert({
      where: { sendbirdUserId: validatedData.sendbirdUserId },
      update: {
        nickname: validatedData.nickname,
        profileImageUrl: validatedData.profileImageUrl || null,
        isDeleted: false,
      },
      create: {
        sendbirdUserId: validatedData.sendbirdUserId,
        nickname: validatedData.nickname,
        profileImageUrl: validatedData.profileImageUrl || null,
      },
    });

    return NextResponse.json(
      createApiResponse(user, "User created successfully", 201),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(createApiError("Validation error", 400, error), {
        status: 400,
      });
    }
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      createApiError("Failed to create user", 500, error),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users - Update user profile
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sendbirdUserId, ...updateData } = body;

    if (!sendbirdUserId) {
      return NextResponse.json(createApiError("User ID is required", 400), {
        status: 400,
      });
    }

    const validatedData = UpdateUserSchema.parse(updateData);

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { sendbirdUserId },
    });

    if (!existingUser) {
      return NextResponse.json(createApiError("User not found", 404), {
        status: 404,
      });
    }

    // Update user in Sendbird (optional - for demo purposes)
    try {
      await SendbirdService.updateUser(
        sendbirdUserId,
        validatedData.nickname || existingUser.nickname,
        validatedData.profileImageUrl !== undefined
          ? validatedData.profileImageUrl
          : existingUser.profileImageUrl || ""
      );
      console.log("Sendbird user updated successfully");
    } catch (_sendbirdError) {
      console.log(
        "Sendbird API not available (demo mode) - continuing with local database update"
      );
      // This is expected in demo/test environments where Sendbird API credentials may not be active
      // The local database update will still work correctly
    }

    // Update user in local database
    const updatedUser = await db.user.update({
      where: { sendbirdUserId },
      data: {
        ...(validatedData.nickname && { nickname: validatedData.nickname }),
        ...(validatedData.profileImageUrl !== undefined && {
          profileImageUrl: validatedData.profileImageUrl || null,
        }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      createApiResponse(updatedUser, "User updated successfully")
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiError("Validation failed", 400, error),
        { status: 400 }
      );
    }

    console.error("PUT /api/users error:", error);
    return NextResponse.json(
      createApiError("Failed to update user", 500, error),
      { status: 500 }
    );
  }
}
