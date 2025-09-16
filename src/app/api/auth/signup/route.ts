import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, nickname } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique Sendbird user ID
    const sendbirdUserId = `user_${nanoid()}`;

    // Create the user
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || "",
        nickname: nickname || name || "User",
        sendbirdUserId,
        profileImageUrl: null,
      },
    });

    // Return success response (don't include password)
    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          nickname: newUser.nickname,
          sendbirdUserId: newUser.sendbirdUserId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
