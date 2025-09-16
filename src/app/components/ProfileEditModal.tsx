"use client";

import React, { useState, useEffect } from "react";
import { X, User, AlertCircle, Check } from "lucide-react";
import { validateNickname, validateProfileImageUrl, cn } from "@/lib/utils";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname: string;
  currentProfileUrl?: string;
  userId: string;
  onProfileUpdate?: (nickname: string, profileUrl: string) => void;
}

/**
 * Profile Edit Modal Component
 * Allows users to edit their nickname and profile image
 *
 * Constraints:
 * - Nickname: 2-30 characters, alphanumeric + spaces, dots, underscores, hyphens only
 * - Profile Image URL: Must be a valid URL pointing to an image file
 * - Real-time validation with error feedback
 * - Preview of profile image before saving
 */
export default function ProfileEditModal({
  isOpen,
  onClose,
  currentNickname,
  currentProfileUrl = "",
  userId,
  onProfileUpdate,
}: ProfileEditModalProps) {
  const [nickname, setNickname] = useState(currentNickname);
  const [profileImageUrl, setProfileImageUrl] = useState(currentProfileUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    nickname?: string;
    profileImageUrl?: string;
    general?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNickname(currentNickname);
      setProfileImageUrl(currentProfileUrl);
      setErrors({});
      setSuccessMessage("");
      setImagePreviewError(false);
    }
  }, [isOpen, currentNickname, currentProfileUrl]);

  // Real-time nickname validation
  useEffect(() => {
    if (nickname !== currentNickname) {
      const validation = validateNickname(nickname);
      setErrors((prev) => ({
        ...prev,
        nickname: validation.isValid ? undefined : validation.error,
      }));
    } else {
      setErrors((prev) => ({ ...prev, nickname: undefined }));
    }
  }, [nickname, currentNickname]);

  // Real-time profile URL validation
  useEffect(() => {
    if (profileImageUrl !== currentProfileUrl) {
      const validation = validateProfileImageUrl(profileImageUrl);
      setErrors((prev) => ({
        ...prev,
        profileImageUrl: validation.isValid ? undefined : validation.error,
      }));
      setImagePreviewError(false);
    } else {
      setErrors((prev) => ({ ...prev, profileImageUrl: undefined }));
    }
  }, [profileImageUrl, currentProfileUrl]);

  const hasChanges =
    nickname !== currentNickname || profileImageUrl !== currentProfileUrl;
  const hasErrors = Object.values(errors).some((error) => error);
  const canSave = hasChanges && !hasErrors && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSave) return;

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // Update user profile via API
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sendbirdUserId: userId,
          nickname: nickname.trim(),
          profileImageUrl: profileImageUrl.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      await response.json();

      setSuccessMessage("Profile updated successfully!");

      // Call the callback to update parent component
      if (onProfileUpdate) {
        onProfileUpdate(nickname.trim(), profileImageUrl.trim());
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Profile update error:", error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    setImagePreviewError(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {profileImageUrl.trim() && !imagePreviewError ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">
                      {getInitials(nickname || "User")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full">
              <label
                htmlFor="profileImageUrl"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Profile Image URL
              </label>
              <input
                type="url"
                id="profileImageUrl"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                  errors.profileImageUrl ? "border-red-500" : "border-gray-300"
                )}
                placeholder="https://example.com/image.jpg (optional)"
                disabled={isLoading}
              />
              {errors.profileImageUrl && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.profileImageUrl}
                </div>
              )}
            </div>
          </div>

          {/* Nickname Section */}
          <div className="mb-6">
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nickname *
            </label>
            <div className="relative">
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                  errors.nickname ? "border-red-500" : "border-gray-300"
                )}
                placeholder="Enter your nickname"
                maxLength={30}
                disabled={isLoading}
                required
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {errors.nickname && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.nickname}
              </div>
            )}
            <div className="mt-1 text-xs text-gray-500">
              {nickname.length}/30 characters
            </div>
          </div>

          {/* Constraints Info */}
          <div className="mb-6 p-3 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Constraints:
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>
                • Nickname: 2-30 characters, letters, numbers, spaces, dots,
                underscores, hyphens only
              </li>
              <li>
                • Profile image: Must be a valid image URL (jpg, png, gif, webp,
                svg)
              </li>
              <li>
                • Profile image is optional - a default avatar will be shown if
                not provided
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-2" />
                {errors.general}
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center text-sm text-green-600">
                <Check className="w-4 h-4 mr-2" />
                {successMessage}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className={cn(
                "flex-1 px-4 py-2 rounded-md font-medium transition-colors",
                canSave
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
