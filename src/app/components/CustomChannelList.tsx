"use client";

import React, { useState, useEffect } from "react";
import { useSendbirdStateContext } from "@sendbird/uikit-react";
import { GroupChannelList as SBGroupChannelList } from "@sendbird/uikit-react/GroupChannelList";
import CreateChannel from "@sendbird/uikit-react/CreateChannel";
import ProfileEditModal from "./ProfileEditModal";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import toast from "react-hot-toast";

interface CustomChannelListProps {
  onChannelSelect?: (channelUrl: string) => void;
}

/**
 * Custom Channel List with database integration
 * Uses the default Sendbird GroupChannelList with database sync for channel creation
 */
export default function CustomChannelList({
  onChannelSelect,
}: CustomChannelListProps) {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    nickname: string;
    profileUrl: string;
    userId: string;
  } | null>(null);

  const { stores } = useSendbirdStateContext();
  const currentUser = stores?.userStore?.user;

  useEffect(() => {
    if (currentUser && currentUser.userId) {
      const fallbackNickname =
        currentUser.userId.length >= 8
          ? `User_${currentUser.userId.slice(-8)}`
          : `User_${currentUser.userId}`;

      setUserProfile({
        nickname: currentUser.nickname || fallbackNickname,
        profileUrl: currentUser.profileUrl || "",
        userId: currentUser.userId,
      });
    }
  }, [currentUser]);

  // Add click listener to profile area after component mounts
  useEffect(() => {
    const addProfileClickListener = () => {
      // Wait for Sendbird components to render
      setTimeout(() => {
        // Remove any existing listeners first
        document.removeEventListener("click", handleDocumentClick);

        // Add a single document-level click listener
        document.addEventListener("click", handleDocumentClick);
      }, 1000);
    };

    const handleDocumentClick = (e: Event) => {
      const target = e.target as HTMLElement;

      // Check if clicked element is a button or has button-like classes
      if (
        target.tagName === "BUTTON" ||
        target.closest("button") ||
        target.classList.contains("sendbird-icon-button") ||
        target.closest(".sendbird-icon-button") ||
        target.classList.contains("sendbird-button") ||
        target.closest(".sendbird-button")
      ) {
        return;
      }

      // Check if clicked on profile-related elements
      const isProfileArea =
        target.closest(".sendbird-channel-list__header") ||
        target.closest(".sendbird-channel-list-header") ||
        target.closest("[class*='channel-list-header']") ||
        target.closest("[class*='ChannelListHeader']");

      if (isProfileArea) {
        e.preventDefault();
        e.stopPropagation();
        setIsProfileModalOpen(true);
      }
    };

    addProfileClickListener();

    // Re-add listeners when user profile changes (component re-renders)
    const interval = setInterval(addProfileClickListener, 2000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [userProfile]);

  const handleProfileUpdate = async (nickname: string, profileUrl: string) => {
    // Update local state
    setUserProfile((prev) => (prev ? { ...prev, nickname, profileUrl } : null));

    // Update Sendbird user info
    try {
      if (stores?.sdkStore?.sdk) {
        await stores.sdkStore.sdk.updateCurrentUserInfo({
          nickname,
          profileUrl,
        });
      }
    } catch (error) {
      console.error("Error updating user in Sendbird:", error);
    }
  };

  const handleChannelCreated = async (channel: any) => {
    try {
      // Save channel to database when created
      const channelData = {
        sendbirdChannelUrl: channel.url,
        channelType: channel.isGroupChannel() ? "group" : "open",
        name: channel.name || "",
        createdBy: currentUser?.userId || "",
        members: channel.members?.map((member: any) => member.userId) || [],
        totalMessageCount: channel.messageCount || 0,
      };

      const response = await fetch("/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(channelData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to save channel to database:", errorData);
      } else {
        await response.json();
      }

      // Trigger a refresh of the channel list to show the new channel
      if (stores?.sdkStore?.sdk) {
        try {
          // Force refresh the channel list
          const channelListQuery =
            stores.sdkStore.sdk.groupChannel.createMyGroupChannelListQuery();
          await channelListQuery.next();
        } catch (refreshError) {
          console.error("Error refreshing channel list:", refreshError);
        }
      }

      // Auto-select the newly created channel
      if (onChannelSelect && channel?.url) {
        setTimeout(() => {
          onChannelSelect(channel.url);
        }, 500); // Small delay to ensure the channel appears in the list first
      }
    } catch (error) {
      console.error("Error saving channel to database:", error);
    }
  };

  const handleLogout = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Signing out...");

      // Disconnect from Sendbird
      if (stores?.sdkStore?.sdk) {
        await stores.sdkStore.sdk.disconnect();
      }

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Successfully signed out!");

      // Sign out from NextAuth
      await signOut({
        callbackUrl: "/auth/signin",
        redirect: true,
      });
    } catch (error) {
      console.error("Error during logout:", error);
      toast.error("Error during logout, but signing out anyway...");

      // Force sign out even if Sendbird disconnect fails
      await signOut({
        callbackUrl: "/auth/signin",
        redirect: true,
      });
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Channel List */}
        <div className="flex-1">
          <SBGroupChannelList
            onChannelSelect={(channel: any) => {
              if (onChannelSelect && channel?.url) {
                onChannelSelect(channel.url);
              }
            }}
            onChannelCreated={handleChannelCreated}
            channelListQueryParams={{
              includeEmpty: true, // Show channels even without messages
              limit: 50, // Limit number of channels loaded
            }}
            className="h-full"
          />
        </div>

        {/* Logout Button */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-red-600 hover:border-red-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {userProfile && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentNickname={userProfile.nickname}
          currentProfileUrl={userProfile.profileUrl}
          userId={userProfile.userId}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {/* Create Channel Modal */}
      {isCreateChannelOpen && (
        <CreateChannel
          onChannelCreated={(channel: any) => {
            handleChannelCreated(channel);
            setIsCreateChannelOpen(false);
            if (onChannelSelect && channel?.url) {
              onChannelSelect(channel.url);
            }
          }}
          onCancel={() => setIsCreateChannelOpen(false)}
        />
      )}
    </>
  );
}
