/**
 * Sendbird service utilities and configuration
 */

export const SENDBIRD_CONFIG = {
  APP_ID: process.env.NEXT_PUBLIC_SENDBIRD_APP_ID!,
  API_TOKEN: process.env.SENDBIRD_API_TOKEN!,
  API_BASE_URL: "https://api-{app_id}.sendbird.com/v3",
};

export interface SendbirdUser {
  user_id: string;
  nickname: string;
  profile_url?: string;
  is_active: boolean;
  created_at: number;
  last_seen_at: number;
}

export interface SendbirdChannel {
  channel_url: string;
  name?: string;
  channel_type: "group_messaging" | "open_channel";
  created_by?: {
    user_id: string;
    nickname: string;
  };
  created_at: number;
  member_count: number;
  message_count: number;
  members?: SendbirdUser[];
}

/**
 * Sendbird API client service
 */
export class SendbirdService {
  private static getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "Api-Token": SENDBIRD_CONFIG.API_TOKEN,
    };
  }

  private static getApiUrl(endpoint: string): string {
    return (
      SENDBIRD_CONFIG.API_BASE_URL.replace("{app_id}", SENDBIRD_CONFIG.APP_ID) +
      endpoint
    );
  }

  /**
   * Create a user in Sendbird
   */
  static async createUser(
    userId: string,
    nickname: string,
    profileUrl?: string
  ): Promise<SendbirdUser> {
    const response = await fetch(this.getApiUrl("/users"), {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        user_id: userId,
        nickname,
        profile_url: profileUrl || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sendbird API Error (Create User):", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        userId: userId,
        nickname: nickname,
        profileUrl: profileUrl,
      });
      throw new Error(
        `Failed to create user: ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Update user profile
   */
  static async updateUser(
    userId: string,
    nickname?: string,
    profileUrl?: string
  ): Promise<SendbirdUser> {
    const updateData: any = {};
    if (nickname) updateData.nickname = nickname;
    if (profileUrl !== undefined) updateData.profile_url = profileUrl;

    // URL encode the user ID to handle special characters
    const encodedUserId = encodeURIComponent(userId);

    const response = await fetch(this.getApiUrl(`/users/${encodedUserId}`), {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sendbird API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        userId: userId,
        updateData: updateData,
      });
      throw new Error(
        `Failed to update user: ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get user information
   */
  static async getUser(userId: string): Promise<SendbirdUser> {
    const response = await fetch(this.getApiUrl(`/users/${userId}`), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get channel information
   */
  static async getChannel(channelUrl: string): Promise<SendbirdChannel> {
    const encodedChannelUrl = encodeURIComponent(channelUrl);
    const response = await fetch(
      this.getApiUrl(`/group_channels/${encodedChannelUrl}`),
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get channel: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Generate random user ID for demo purposes
 */
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate Sendbird configuration
 */
export function validateSendbirdConfig(): boolean {
  if (!SENDBIRD_CONFIG.APP_ID) {
    console.error("NEXT_PUBLIC_SENDBIRD_APP_ID is not configured");
    return false;
  }

  if (!SENDBIRD_CONFIG.API_TOKEN) {
    console.error("SENDBIRD_API_TOKEN is not configured");
    return false;
  }

  return true;
}
