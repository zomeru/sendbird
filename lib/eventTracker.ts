/**
 * Sendbird Event Tracker (Functional)
 * Handles tracking of Sendbird events and syncing with database
 */

export interface EventData {
  eventType: string;
  channelUrl?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export function createSendbirdEventTracker() {
  let sdk: any = null;
  const handlers: Map<string, any> = new Map();

  /**
   * Track event (for logging/analytics purposes)
   */
  const trackEvent = async (eventData: EventData) => {
    try {
      console.log("Sendbird Event:", eventData);
      // Optionally forward to analytics
      // await fetch('/api/events/track', { method: 'POST', body: JSON.stringify(eventData) })
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  };

  /**
   * Database operations
   */
  const updateChannelInDatabase = async (channel: any) => {
    try {
      await fetch("/api/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendbirdChannelUrl: channel.url,
          name: channel.name,
          totalMessageCount: channel.messageCount,
        }),
      });
    } catch (error) {
      console.error("Failed to update channel in database:", error);
    }
  };

  const markChannelAsDeleted = async (channelUrl: string) => {
    try {
      await fetch(
        `/api/channels?channelUrl=${encodeURIComponent(channelUrl)}`,
        {
          method: "DELETE",
        }
      );
    } catch (error) {
      console.error("Failed to mark channel as deleted:", error);
    }
  };

  const updateChannelMessageCount = async (
    channelUrl: string,
    messageCount: number
  ) => {
    try {
      await fetch("/api/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendbirdChannelUrl: channelUrl,
          totalMessageCount: messageCount,
        }),
      });
    } catch (error) {
      console.error("Failed to update message count:", error);
    }
  };

  const updateChannelMembers = async (channel: any) => {
    console.log("Channel members updated:", {
      channelUrl: channel.url,
      memberCount: channel.memberCount,
      members: channel.members?.map((m: any) => m.userId),
    });
  };

  /**
   * Event handler creators
   */
  const handlersMap = {
    async handleChannelChanged(channel: any) {
      await trackEvent({
        eventType: "channel_changed",
        channelUrl: channel.url,
        timestamp: Date.now(),
        metadata: {
          name: channel.name,
          memberCount: channel.memberCount,
          messageCount: channel.messageCount,
        },
      });
      await updateChannelInDatabase(channel);
    },

    async handleChannelDeleted(channelUrl: string, channelType: string) {
      await trackEvent({
        eventType: "channel_deleted",
        channelUrl,
        timestamp: Date.now(),
        metadata: { channelType },
      });
      await markChannelAsDeleted(channelUrl);
    },

    async handleMessageReceived(channel: any, message: any) {
      await trackEvent({
        eventType: "message_received",
        channelUrl: channel.url,
        userId: message.sender?.userId,
        timestamp: message.createdAt,
        metadata: {
          messageId: message.messageId,
          messageType: message.messageType,
          channelType: channel.channelType,
        },
      });
      await updateChannelMessageCount(channel.url, channel.messageCount);
    },

    async handleUserJoined(channel: any, user: any) {
      await trackEvent({
        eventType: "user_joined",
        channelUrl: channel.url,
        userId: user.userId,
        timestamp: Date.now(),
        metadata: {
          nickname: user.nickname,
          memberCount: channel.memberCount,
        },
      });
      await updateChannelMembers(channel);
    },

    async handleUserLeft(channel: any, user: any) {
      await trackEvent({
        eventType: "user_left",
        channelUrl: channel.url,
        userId: user.userId,
        timestamp: Date.now(),
        metadata: {
          nickname: user.nickname,
          memberCount: channel.memberCount,
        },
      });
      await updateChannelMembers(channel);
    },

    async handleReconnectStarted() {
      await trackEvent({
        eventType: "reconnect_started",
        timestamp: Date.now(),
      });
    },
    async handleReconnectSucceeded() {
      await trackEvent({
        eventType: "reconnect_succeeded",
        timestamp: Date.now(),
      });
    },
    async handleReconnectFailed() {
      await trackEvent({
        eventType: "reconnect_failed",
        timestamp: Date.now(),
      });
    },
  };

  /**
   * Setup Sendbird handlers
   */
  const setupEventHandlers = () => {
    if (!sdk) return;

    const channelHandler = new sdk.ChannelHandler();
    channelHandler.onChannelChanged = handlersMap.handleChannelChanged;
    channelHandler.onChannelDeleted = handlersMap.handleChannelDeleted;
    channelHandler.onMessageReceived = handlersMap.handleMessageReceived;
    channelHandler.onUserJoined = handlersMap.handleUserJoined;
    channelHandler.onUserLeft = handlersMap.handleUserLeft;

    sdk.addChannelHandler("event_tracker_channel_handler", channelHandler);
    handlers.set("channel_handler", channelHandler);

    const connectionHandler = new sdk.ConnectionHandler();
    connectionHandler.onReconnectStarted = handlersMap.handleReconnectStarted;
    connectionHandler.onReconnectSucceeded =
      handlersMap.handleReconnectSucceeded;
    connectionHandler.onReconnectFailed = handlersMap.handleReconnectFailed;

    sdk.addConnectionHandler(
      "event_tracker_connection_handler",
      connectionHandler
    );
    handlers.set("connection_handler", connectionHandler);
  };

  /**
   * Public API
   */
  return {
    initialize(_sdk: any) {
      sdk = _sdk;
      setupEventHandlers();
    },
    cleanup() {
      if (!sdk) return;
      sdk.removeChannelHandler("event_tracker_channel_handler");
      sdk.removeConnectionHandler("event_tracker_connection_handler");
      sdk.removeUserEventHandler("event_tracker_user_handler");
      handlers.clear();
    },
  };
}

// Singleton instance (if you want the same as class)
export const SendbirdEventTracker = createSendbirdEventTracker();
