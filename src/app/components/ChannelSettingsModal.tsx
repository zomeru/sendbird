"use client";

import React, { useState, useEffect } from "react";
import { X, Hash, LogOut } from "lucide-react";

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelUrl: string;
  currentChannelName: string;
  currentChannelCoverUrl?: string;
  onChannelUpdate: (name: string, coverUrl: string) => Promise<void>;
  onChannelLeave: () => void;
}

export default function ChannelSettingsModal({
  isOpen,
  onClose,
  channelUrl,
  currentChannelName,
  currentChannelCoverUrl = "",
  onChannelUpdate,
  onChannelLeave,
}: ChannelSettingsModalProps) {
  const [channelName, setChannelName] = useState(currentChannelName);
  const [channelCoverUrl, setChannelCoverUrl] = useState(
    currentChannelCoverUrl
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setChannelName(currentChannelName);
      setChannelCoverUrl(currentChannelCoverUrl);
      setError("");
    }
  }, [isOpen, currentChannelName, currentChannelCoverUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Call the parent component's update function
      await onChannelUpdate(channelName.trim(), channelCoverUrl.trim());
      onClose();
    } catch (error) {
      console.error("Error updating channel:", error);
      setError("Failed to update channel. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveChannel = () => {
    onChannelLeave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Hash className="w-5 h-5 mr-2 text-purple-600" />
            Channel Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Channel Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Cover Image
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center border-2 border-white shadow-sm">
                {channelCoverUrl ? (
                  <img
                    src={channelCoverUrl}
                    alt="Channel cover"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <Hash
                  className={`w-8 h-8 text-white ${
                    channelCoverUrl ? "hidden" : "block"
                  }`}
                />
              </div>
              <div className="flex-1">
                <input
                  type="url"
                  value={channelCoverUrl}
                  onChange={(e) => setChannelCoverUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Add a cover image URL
                </p>
              </div>
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label
              htmlFor="channelName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Channel Name
            </label>
            <input
              type="text"
              id="channelName"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Enter channel name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              maxLength={50}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {channelName.length}/50 characters
            </p>
          </div>

          {/* Channel URL Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Channel ID:</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1 break-all font-mono">
              {channelUrl}
            </p>
          </div>

          {/* Leave Channel Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex items-start">
                <LogOut className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 mb-1">
                    Leave Channel
                  </h3>
                  <p className="text-xs text-red-600 mb-3">
                    You will no longer receive messages from this channel and
                    won&apos;t be able to send messages.
                  </p>
                  <button
                    type="button"
                    onClick={handleLeaveChannel}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                    disabled={isLoading}
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    Leave Channel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isLoading || !channelName.trim()}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                "Update Channel"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
