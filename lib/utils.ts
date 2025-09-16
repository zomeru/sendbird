import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper deduplication
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp to readable date string
 */
export function formatTimestamp(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Generate a random avatar color based on user ID
 */
export function getAvatarColor(userId: string): string {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  const hash = userId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate nickname constraints
 */
export function validateNickname(nickname: string): {
  isValid: boolean;
  error?: string;
} {
  if (!nickname.trim()) {
    return { isValid: false, error: "Nickname is required" };
  }

  if (nickname.length < 2) {
    return { isValid: false, error: "Nickname must be at least 2 characters" };
  }

  if (nickname.length > 30) {
    return {
      isValid: false,
      error: "Nickname must be less than 30 characters",
    };
  }

  // Only allow alphanumeric characters, spaces, and basic punctuation
  const validPattern = /^[a-zA-Z0-9\s._-]+$/;
  if (!validPattern.test(nickname)) {
    return {
      isValid: false,
      error:
        "Nickname can only contain letters, numbers, spaces, dots, underscores, and hyphens",
    };
  }

  return { isValid: true };
}

/**
 * Validate profile image URL
 */
export function validateProfileImageUrl(url: string): {
  isValid: boolean;
  error?: string;
} {
  if (!url.trim()) {
    return { isValid: true }; // Empty URL is allowed (will use default avatar)
  }

  try {
    new URL(url);
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }

  // Check if URL points to an image
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const hasImageExtension = imageExtensions.some((ext) =>
    url.toLowerCase().includes(ext)
  );

  if (!hasImageExtension) {
    return {
      isValid: false,
      error: "URL must point to an image file (jpg, png, gif, webp, svg)",
    };
  }

  return { isValid: true };
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Storage utilities for user session
 */
export const storage = {
  setItem: (key: string, value: any): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  getItem: (key: string): any => {
    if (typeof window !== "undefined") {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
    return null;
  },

  removeItem: (key: string): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  },
};

/**
 * API response helper
 */
export function createApiResponse<T>(
  data: T,
  message: string = "Success",
  status: number = 200
) {
  return {
    data,
    message,
    status,
    timestamp: new Date().toISOString(),
  };
}

/**
 * API error response helper
 */
export function createApiError(
  message: string,
  status: number = 400,
  details?: any
) {
  return {
    error: message,
    status,
    details,
    timestamp: new Date().toISOString(),
  };
}
