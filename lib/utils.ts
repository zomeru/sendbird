import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";

/**
 * Merge Tailwind CSS classes with proper deduplication
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 *
 * @returns Randomly generated user ID and nickname
 */
export function generateUserInfo() {
  const userId = `user_${nanoid()}`;
  const nickname = `User_${nanoid(10)}`;

  return { userId, nickname };
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
