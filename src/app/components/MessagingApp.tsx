"use client";

import React, { useState, useEffect } from "react";
import { useSendbirdStateContext } from "@sendbird/uikit-react";
import { GroupChannel as SBGroupChannel } from "@sendbird/uikit-react/GroupChannel";
import CustomChannelList from "./CustomChannelList";
import ChannelSettingsModal from "./ChannelSettingsModal";
import { MessageSquare, Users } from "lucide-react";

/**
 * Main Messaging App Component
 * Manages the layout and state for the channel list and channel view
 * Includes event tracking for channels and messages
 */
export default function MessagingApp() {
  const [selectedChannelUrl, setSelectedChannelUrl] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const { stores } = useSendbirdStateContext();

  useEffect(() => {
    // Handle responsive layout
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Add SDK event listeners for channel events
  useEffect(() => {
    if (stores?.sdkStore?.sdk) {
      const sdk = stores.sdkStore.sdk;

      const channelHandler = {
        onUserLeft: (channel: any, user: any) => {
          // If the current user left the currently selected channel
          if (
            channel?.url === selectedChannelUrl &&
            user?.userId === sdk.currentUser?.userId
          ) {
            handleChannelLeft();
          }
        },
        onChannelDeleted: (channelUrl: string) => {
          // If the currently selected channel was deleted
          if (channelUrl === selectedChannelUrl) {
            handleChannelLeft();
          }
        },
        onUserBanned: (channel: any, user: any) => {
          if (
            channel?.url === selectedChannelUrl &&
            user?.userId === sdk.currentUser?.userId
          ) {
            handleChannelLeft();
          }
        },
      };

      try {
        // Try multiple SDK methods for adding channel handlers
        let handlerAdded = false;

        if (typeof sdk.addChannelHandler === "function") {
          sdk.addChannelHandler("messaging-app-handler", channelHandler);
          handlerAdded = true;
        } else if (
          sdk.groupChannel &&
          typeof sdk.groupChannel.addChannelHandler === "function"
        ) {
          sdk.groupChannel.addChannelHandler(
            "messaging-app-handler",
            channelHandler
          );
          handlerAdded = true;
        } else if (typeof sdk.addGroupChannelHandler === "function") {
          sdk.addGroupChannelHandler("messaging-app-handler", channelHandler);
          handlerAdded = true;
        }

        return () => {
          // Clean up the handler
          try {
            if (typeof sdk.removeChannelHandler === "function") {
              sdk.removeChannelHandler("messaging-app-handler");
            } else if (
              sdk.groupChannel &&
              typeof sdk.groupChannel.removeChannelHandler === "function"
            ) {
              sdk.groupChannel.removeChannelHandler("messaging-app-handler");
            } else if (typeof sdk.removeGroupChannelHandler === "function") {
              sdk.removeGroupChannelHandler("messaging-app-handler");
            }
          } catch (error) {
            console.error("Error removing channel handler:", error);
          }
        };
      } catch (error) {
        console.error("Error adding channel handler:", error);
      }
    }
  }, [stores?.sdkStore?.sdk, selectedChannelUrl]);

  // Monitor selected channel and detect if it becomes invalid/deleted
  useEffect(() => {
    if (selectedChannelUrl && stores?.sdkStore?.sdk) {
      const checkChannelExists = async () => {
        try {
          await stores.sdkStore.sdk.groupChannel.getChannel(selectedChannelUrl);
        } catch (error) {
          console.error("Channel no longer exists:", selectedChannelUrl, error);
          handleChannelLeft();
        }
      };

      // Check immediately
      checkChannelExists();

      // Set up more frequent check every 1 second for faster detection
      const intervalId = setInterval(checkChannelExists, 1000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [selectedChannelUrl, stores?.sdkStore?.sdk]);

  // Load current channel data when selected channel changes
  useEffect(() => {
    if (selectedChannelUrl && stores?.sdkStore?.sdk) {
      const loadChannelData = async () => {
        try {
          const channel = await stores.sdkStore.sdk.groupChannel.getChannel(
            selectedChannelUrl
          );
          setCurrentChannel(channel);
        } catch (error) {
          console.error("Error loading channel data:", error);
          setCurrentChannel(null);
        }
      };
      loadChannelData();
    } else {
      setCurrentChannel(null);
    }
  }, [selectedChannelUrl, stores?.sdkStore?.sdk]);

  // Add click listener to channel header info button
  useEffect(() => {
    if (selectedChannelUrl) {
      const addChannelHeaderClickListener = () => {
        setTimeout(() => {
          // Only target the specific channel info button - be very specific
          const infoButtons = document.querySelectorAll(
            ".sendbird-chat-header__right__info"
          );

          infoButtons.forEach((button, index) => {
            // Skip if already has our listener
            if (button.hasAttribute("data-channel-settings-listener")) {
              return;
            }

            // Add our custom listener only to info buttons
            button.addEventListener("click", handleChannelHeaderClick);
            button.setAttribute("data-channel-settings-listener", "true");
          });
        }, 1000);
      };

      const handleChannelHeaderClick = (e: Event) => {
        const target = e.target as HTMLElement;
        const currentTarget = e.currentTarget as HTMLElement;

        // Only proceed if we're clicking on the actual channel info button
        // Check if the clicked element or its parent has the info button class
        const isInfoButton =
          target.closest(".sendbird-chat-header__right__info") ||
          currentTarget.classList.contains("sendbird-chat-header__right__info");

        // Skip if this is not the info button (could be create channel, attachment, etc.)
        if (!isInfoButton) {
          return;
        }

        // Skip if we're in a modal (create channel modal, etc.)
        const isInModal =
          target.closest('[role="dialog"]') ||
          target.closest(".sendbird-modal") ||
          target.closest('[class*="modal"]');

        if (isInModal) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        setIsChannelSettingsOpen(true);
      };

      addChannelHeaderClickListener();

      // Re-add listeners periodically
      const interval = setInterval(addChannelHeaderClickListener, 2000);

      return () => {
        clearInterval(interval);
        // Clean up listeners
        const headerButtons = document.querySelectorAll(
          '[data-channel-settings-listener="true"]'
        );
        headerButtons.forEach((button) => {
          button.removeEventListener("click", handleChannelHeaderClick);
          button.removeAttribute("data-channel-settings-listener");
        });
      };
    }
  }, [selectedChannelUrl]);

  const handleChannelUpdate = async (name: string, coverUrl: string) => {
    if (!currentChannel || !stores?.sdkStore?.sdk) {
      throw new Error("Channel or SDK not available");
    }

    try {
      // Update channel via Sendbird SDK
      const updatedChannel = await currentChannel.updateChannel({
        name: name,
        coverUrl: coverUrl,
        data: currentChannel.data,
      });

      // Update local state
      setCurrentChannel(updatedChannel);

      // Update database
      try {
        const response = await fetch(`/api/channels`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sendbirdChannelUrl: currentChannel.url,
            name: name,
            coverUrl: coverUrl,
          }),
        });

        if (!response.ok) {
          console.error("Failed to update channel in database");
        }
      } catch (dbError) {
        console.error("Database update error:", dbError);
        // Don't throw here, as the Sendbird update was successful
      }
    } catch (error) {
      console.error("Error updating channel:", error);
      throw error;
    }
  };

  // Note: Event tracking is handled by the Sendbird UIKit internally
  // and through our API endpoints when channels are created/updated

  const handleChannelSelect = (channelUrl: string) => {
    setSelectedChannelUrl(channelUrl);
  };

  const handleBackToChannelList = () => {
    setSelectedChannelUrl("");
  };

  const handleChannelLeft = async () => {
    // If we have a current channel, leave it via SDK
    if (currentChannel && stores?.sdkStore?.sdk) {
      try {
        await currentChannel.leave();
      } catch (error) {
        console.error("Error leaving channel via SDK:", error);
        // Continue with navigation even if SDK leave fails
      }
    }

    // Clear the current selection immediately to prevent showing stale data
    const leftChannelUrl = selectedChannelUrl;
    setSelectedChannelUrl("");

    // Try to find another channel to select from the current channel list
    if (stores?.sdkStore?.sdk) {
      try {
        // Get the current list of channels that the user is a member of
        const channelListQuery =
          stores.sdkStore.sdk.groupChannel.createMyGroupChannelListQuery({
            includeEmpty: true,
            limit: 50, // Get more channels to ensure we have options
            order: "latest_last_message", // Order by most recent activity
          });

        const channels = await channelListQuery.next();

        // Filter out the channel we just left and find the first available channel
        const availableChannels = channels.filter(
          (channel: any) => channel.url !== leftChannelUrl
        );

        if (availableChannels.length > 0) {
          // Select the first available channel (most recently active)
          const firstChannel = availableChannels[0];

          // Set the new channel immediately for instant navigation
          setSelectedChannelUrl(firstChannel.url);
        }
      } catch (error) {
        console.error("Error finding available channels:", error);
        // selectedChannelUrl is already set to "" above, so welcome message will show
      }
    }
  };

  // Mobile view: show either channel list or selected channel with sliding transition
  if (isMobile) {
    return (
      <div className="h-screen bg-gray-50 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{
            transform: selectedChannelUrl
              ? "translateX(-100%)"
              : "translateX(0)",
          }}
        >
          {/* Channel List View */}
          <div className="w-full h-full flex-shrink-0">
            <div className="h-full">
              <div className="bg-white border-b px-4 py-3">
                <h1 className="text-lg font-semibold">Channels</h1>
              </div>
              <div className="h-[calc(100vh-57px)]">
                <CustomChannelList onChannelSelect={handleChannelSelect} />
              </div>
            </div>
          </div>

          {/* Channel View */}
          <div className="w-full h-full flex-shrink-0">
            {selectedChannelUrl ? (
              <div className="h-full">
                <div className="bg-white border-b px-4 py-3 flex items-center">
                  <button
                    onClick={handleBackToChannelList}
                    className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Back to channels"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      strokeWidth="2"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <h1 className="text-lg font-semibold truncate">
                    {currentChannel?.name || "Channel"}
                  </h1>
                </div>
                <div className="h-[calc(100vh-57px)]">
                  <SBGroupChannel channelUrl={selectedChannelUrl} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Channel Settings Modal for Mobile */}
        {currentChannel && (
          <ChannelSettingsModal
            isOpen={isChannelSettingsOpen}
            onClose={() => setIsChannelSettingsOpen(false)}
            channelUrl={currentChannel.url}
            currentChannelName={currentChannel.name || "Unnamed Channel"}
            currentChannelCoverUrl={currentChannel.coverUrl || ""}
            onChannelUpdate={handleChannelUpdate}
            onChannelLeave={handleChannelLeft}
          />
        )}
      </div>
    );
  }

  // Desktop view: side-by-side layout
  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Channel List Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <CustomChannelList onChannelSelect={handleChannelSelect} />
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-200"></div>

      {/* Main Channel Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChannelUrl ? (
          <SBGroupChannel channelUrl={selectedChannelUrl} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Welcome to Sendbird
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Select a channel from the sidebar to start messaging, or create
                a new channel to begin a conversation with your team.
              </p>
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <span>Group Chat</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  </div>
                  <span>Real-time</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Channel Settings Modal */}
      {currentChannel && (
        <ChannelSettingsModal
          isOpen={isChannelSettingsOpen}
          onClose={() => setIsChannelSettingsOpen(false)}
          channelUrl={currentChannel.url}
          currentChannelName={currentChannel.name || "Unnamed Channel"}
          currentChannelCoverUrl={currentChannel.coverUrl || ""}
          onChannelUpdate={handleChannelUpdate}
          onChannelLeave={handleChannelLeft}
        />
      )}
    </div>
  );
}
