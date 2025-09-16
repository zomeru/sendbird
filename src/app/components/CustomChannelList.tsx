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
  onChannelSelect?: (channelUrl: string, isUserInitiated?: boolean) => void;
  selectedChannelUrl?: string;
  isNavigatingBack?: boolean;
}

/**
 * Custom Channel List with database integration
 * Uses the default Sendbird GroupChannelList with database sync for channel creation
 */
export default function CustomChannelList({
  onChannelSelect,
  selectedChannelUrl,
  isNavigatingBack = false,
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
      setUserProfile({
        nickname: currentUser.nickname || "",
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

  // Get channel type (direct, group, or open)
  const getChannelType = (
    channel: any,
    memberCount: number
  ): "direct" | "group" | "open" => {
    if (channel.isGroupChannel() && memberCount === 2) return "direct";
    if (channel.isGroupChannel()) return "group";
    return "open";
  };

  // Get appropriate channel name based on type and members
  const getChannelName = (channel: any, isDirectMessage: boolean): string => {
    // If channel already has a name, use it
    if (channel.name) return channel.name;

    // For direct messages, try to use the other user's name
    if (isDirectMessage) {
      const otherUser = channel.members?.find(
        (member: any) => member.userId !== currentUser?.userId
      );
      return otherUser?.nickname || "Direct Message";
    }

    // Default name for group channels
    return "New Group Channel";
  };

  // Save channel to database
  const saveChannelToDatabase = async (channelData: any) => {
    const response = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(channelData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    return response.json();
  };

  // Refresh channel list
  const refreshChannelList = async () => {
    if (!stores?.sdkStore?.sdk) return;

    try {
      const channelListQuery =
        stores.sdkStore.sdk.groupChannel.createMyGroupChannelListQuery();
      await channelListQuery.next();
    } catch (error) {
      console.error("Error refreshing channel list:", error);
    }
  };

  const handleChannelCreated = async (channel: any) => {
    try {
      // Extract basic channel information
      const members =
        channel.members?.map((member: any) => member.userId) || [];
      const isDirectMessage = channel.isGroupChannel() && members.length === 2;

      // Prepare channel data
      const channelData = {
        sendbirdChannelUrl: channel.url,
        channelType: getChannelType(channel, members.length),
        name: getChannelName(channel, isDirectMessage),
        createdBy: currentUser?.userId || "",
        members,
        chatmateId: isDirectMessage
          ? members.find((id: string) => id !== currentUser?.userId) || "" // Default to empty string if no chatmate found
          : "", // Empty string for non-direct messages
        totalMessageCount: channel.messageCount || 0,
      };

      // Save and refresh
      await saveChannelToDatabase(channelData);
      await refreshChannelList();

      // Auto-select the newly created channel
      if (onChannelSelect && channel?.url) {
        setTimeout(() => {
          onChannelSelect(channel.url, true); // Channel creation is always user-initiated
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

      // Sign out from NextAuth
      await signOut({
        callbackUrl: "/auth/signin",
        redirect: true,
      });
      toast.success("Successfully signed out!");
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
            onChannelSelect={(channel) => {
              // Get the click event that triggered this selection
              const clickEvent = window.event as MouseEvent | undefined;

              // Safely check if target is an HTMLElement
              const target = clickEvent?.target;
              const isHtmlElement = target instanceof HTMLElement;

              // Check if it's a real user click on a channel item
              const isUserClick =
                clickEvent?.isTrusted &&
                isHtmlElement &&
                ((target as HTMLElement).closest(
                  ".sendbird-channel-preview"
                ) !== null ||
                  (target as HTMLElement).closest(
                    '[class*="ChannelPreview"]'
                  ) !== null);

              if (channel?.url && channel.url !== selectedChannelUrl) {
                if (isUserClick) {
                  onChannelSelect?.(channel.url, true);
                } else if (!isNavigatingBack) {
                  onChannelSelect?.(channel.url, false);
                } else {
                  console.log("Preventing selection during back navigation");
                }
              }
            }}
            onChannelCreated={handleChannelCreated}
            channelListQueryParams={{
              includeEmpty: true, // Show channels even without messages
              limit: 50, // Limit number of channels loaded
            }}
            className="h-full"
            selectedChannelUrl={selectedChannelUrl}
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
          onChannelCreated={(channel) => {
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
