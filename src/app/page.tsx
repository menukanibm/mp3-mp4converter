"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Download,
  Search,
  Sparkles,
  Music,
  Video,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  Globe,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface MediaInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  platform: string;
  formats: Array<{
    id: string;
    quality: string;
    type: string;
    ext: string;
  }>;
}

export default function HomePage() {
  const { user, requireAuth, getIdToken } = useAuth();

  const [url, setUrl] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("mp4-1080");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Format seconds into MM:SS or HH:MM:SS
  const formatDuration = (seconds: number) => {
    if (!seconds) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Fetch video information
  const handleFetchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setMediaInfo(null);
    setLoadingInfo(true);
    setStatusMessage("Analyzing media link...");

    try {
      const response = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to retrieve media info.");
      }

      setMediaInfo(result.data);
      if (result.data.formats?.length > 0) {
        setSelectedFormat(result.data.formats[0].id);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching video details.");
    } finally {
      setLoadingInfo(false);
      setStatusMessage("");
    }
  };

  // Process & Download media
  const handleDownload = async () => {
    // STRICT AUTH GUARD:
    // If not logged in, trigger modal and block execution immediately
    if (!requireAuth("You must be logged in to download media files. Sign in with Google or Email.")) {
      return;
    }

    if (!url || !selectedFormat) return;

    setError(null);
    setDownloading(true);
    setProgress(15);
    setStatusMessage("Authenticating user session...");

    try {
      // 1. Fetch the user's Firebase ID token
      const token = await getIdToken();
      if (!token) {
        throw new Error("Unable to obtain authentication token. Please sign in again.");
      }

      setProgress(40);
      setStatusMessage("Extracting media stream...");

      // 2. Call Protected Download API Route with Bearer Token in Authorization header
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoURL: url.trim(),
          url: url.trim(),
          formatId: selectedFormat,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Download failed.");
      }

      setProgress(85);
      setStatusMessage("Preparing final download...");

      // 3. Initiate seamless browser download
      const downloadTarget = data.downloadUrl || data.url;
      const downloadName = data.filename || `${data.title || "audio"}.mp3`;

      if (downloadTarget) {
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = downloadTarget;
        downloadAnchor.target = "_blank";
        downloadAnchor.rel = "noopener noreferrer";
        downloadAnchor.download = downloadName;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
      }

      setProgress(100);
      setStatusMessage("Download ready! Your download should start shortly.");
      setTimeout(() => {
        setDownloading(false);
        setProgress(0);
        setStatusMessage("");
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process download.");
      setDownloading(false);
      setProgress(0);
      setStatusMessage("");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-12 md:py-16">
      {/* Hero Header */}
      <div className="max-w-3xl text-center mb-10 space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>YouTube • TikTok • Facebook Support</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          Download Videos & MP3s <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Fast, Free & High Quality
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Convert and save full HD videos or crystal clear 320kbps MP3s from your favorite social platforms in one click.
        </p>
      </div>

      {/* Main Link Input Card */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900/90 rounded-3xl p-3 sm:p-4 shadow-xl shadow-slate-200/50 dark:shadow-indigo-950/20 border border-slate-200 dark:border-slate-800 transition-all">
        <form onSubmit={handleFetchInfo} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube, TikTok, or Facebook URL here..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loadingInfo || !url}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            {loadingInfo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <span>Fetch Media</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="w-full max-w-2xl mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-start space-x-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Operation Failed</p>
            <p className="text-xs mt-0.5 text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        </div>
      )}

      {/* Video Preview & Download Options Card */}
      {mediaInfo && (
        <div className="w-full max-w-2xl mt-8 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Thumbnail */}
            <div className="relative w-full sm:w-48 aspect-video rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0 shadow-md">
              {mediaInfo.thumbnail ? (
                <img
                  src={mediaInfo.thumbnail}
                  alt={mediaInfo.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                  <Video className="w-8 h-8" />
                </div>
              )}
              {mediaInfo.duration > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(mediaInfo.duration)}</span>
                </div>
              )}
            </div>

            {/* Video Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {mediaInfo.platform}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
                {mediaInfo.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uploaded by: <span className="font-semibold text-slate-700 dark:text-slate-300">{mediaInfo.uploader}</span>
              </p>
            </div>
          </div>

          <hr className="my-6 border-slate-100 dark:border-slate-800" />

          {/* Format Selection Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Select Output Format:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {mediaInfo.formats.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                const isAudio = fmt.type === "audio";
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {isAudio ? <Music className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{fmt.quality}</div>
                        <div className="text-xs text-slate-400 uppercase">{fmt.ext} format</div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Bar */}
          {downloading && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Download Action Button */}
          <div className="mt-6 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center space-x-2.5 text-base"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Media...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>
                    {user ? "Download Selected Format" : "Sign In to Download Media"}
                  </span>
                </>
              )}
            </button>

            {!user && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2.5">
                🔒 Free account required to prevent bot abuse and maintain high download speeds.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Feature Badges */}
      <div className="w-full max-w-4xl mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Blazing Fast Extraction</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Powered by modern yt-dlp core to deliver optimal stream speeds directly to your device.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Secure Firebase Guard</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Protected API routes with verified Firebase token signatures to protect against spam.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Multi-Platform Ready</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clean support for YouTube, TikTok clips, and Facebook Watch videos in 1080p, 720p or MP3.
          </p>
        </div>
      </div>
    </div>
  );
}
