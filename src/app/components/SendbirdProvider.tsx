"use client";

import React, { useEffect, useState } from "react";
import { SendBirdProvider } from "@sendbird/uikit-react";
import "@sendbird/uikit-react/dist/index.css";
import { useSession } from "next-auth/react";

interface SendbirdProviderProps {
  children: React.ReactNode;
}

const APP_ID = process.env.NEXT_PUBLIC_SENDBIRD_APP_ID!;

/**
 * Sendbird Provider wrapper component
 * Manages Sendbird connection and user authentication
 */
export default function SendbirdProvider({ children }: SendbirdProviderProps) {
  const { data: session, status } = useSession();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.sendbirdUserId) {
      setCurrentUserId(session.user.sendbirdUserId);
      setIsLoading(false);
    } else if (status === "unauthenticated") {
      // Redirect to sign in or handle unauthenticated state
      window.location.href = "/auth/signin";
    }
  }, [session, status]);

  // No longer need the createUserInDatabase function as users are created during authentication

  if (isLoading || !currentUserId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!APP_ID) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Configuration Error
          </h1>
          <p className="text-gray-600">
            Please set your NEXT_PUBLIC_SENDBIRD_APP_ID in the environment
            variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SendBirdProvider
      appId={APP_ID}
      userId={currentUserId}
      accessToken=""
      theme="light"
      colorSet={{
        primary_300: "#742DDD",
        primary_400: "#6211CB",
        primary_500: "#491389",
        secondary_300: "#A855F7",
        accent_300: "#10B981",
        background_50: "#FAFAFA",
        background_100: "#F5F5F5",
        background_200: "#EEEEEE",
        background_300: "#E0E0E0",
        onlight_01: "#000000",
        onlight_02: "#525252",
        onlight_03: "#878787",
        onlight_04: "#BDBDBD",
      }}
    >
      {children}
    </SendBirdProvider>
  );
}
