import { NextRequest, NextResponse } from "next/server";
import { getVideoMetadata } from "@/lib/ytdlp";

export const dynamic = "force-dynamic";

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  "0d0c0b50824820a447cabd089c830e8762fb2612020262ef26f3c635b24c6dd7";

function getResolutionLabel(key: string): string {
  const num = parseInt(key, 10);
  if (num >= 1500) return "1080p60 (Full HD+ Video)";
  if (num >= 1000) return "1080p (Full HD Video)";
  if (num >= 700) return "720p (HD Video)";
  if (num >= 500) return "480p (SD Video)";
  if (num >= 350) return "360p (Standard Video)";
  if (num >= 250) return "240p (Low Quality Video)";
  return `${key}p (Mobile Video)`;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid media URL is required." },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();

    // Check if the URL is a YouTube link
    const isYouTube = /(?:youtu\.be\/|youtube\.com\/)/i.test(trimmedUrl);

    if (isYouTube) {
      const targetApiUrl = `https://kavi-public-apis.vercel.app/api/v2/private/download/youtube/?url=${encodeURIComponent(
        trimmedUrl
      )}&api_key=${encodeURIComponent(YOUTUBE_API_KEY)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      try {
        const res = await fetch(targetApiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: controller.signal,
        });

        if (res.ok) {
          const apiJson = await res.json();
          const mediaPayload = apiJson?.data?.data;

          if (mediaPayload) {
            const title = mediaPayload.title || "YouTube Video";
            const thumbnail = mediaPayload.thumbnail || "";
            const audioUrl = mediaPayload.audio || "";
            const videosObj = mediaPayload.videos || {};

            const formats: Array<{
              id: string;
              quality: string;
              type: "audio" | "video";
              ext: string;
              downloadUrl?: string;
            }> = [];

            // 1. Audio MP3 option
            if (audioUrl) {
              formats.push({
                id: "audio-mp3",
                quality: "MP3 Audio (High Quality 320kbps)",
                type: "audio",
                ext: "mp3",
                downloadUrl: audioUrl,
              });
            }

            // 2. Video quality options (sorted descending by resolution)
            const sortedKeys = Object.keys(videosObj).sort(
              (a, b) => parseInt(b, 10) - parseInt(a, 10)
            );

            for (const key of sortedKeys) {
              const videoStreamUrl = videosObj[key];
              if (videoStreamUrl) {
                formats.push({
                  id: `video-${key}`,
                  quality: getResolutionLabel(key),
                  type: "video",
                  ext: "mp4",
                  downloadUrl: videoStreamUrl,
                });
              }
            }

            return NextResponse.json({
              success: true,
              data: {
                title,
                thumbnail,
                duration: 0,
                uploader: "YouTube Creator",
                platform: "YouTube",
                formats,
              },
            });
          }
        }
      } catch (ytErr) {
        console.warn("[API/INFO] YouTube private API call error, using fallback:", ytErr);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Fallback for TikTok, Facebook or if primary YouTube call had issue
    const isSupported = /tiktok\.com|facebook\.com|fb\.watch|youtube\.com|youtu\.be/i.test(trimmedUrl);
    if (!isSupported) {
      return NextResponse.json(
        {
          error:
            "Unsupported platform. Please provide a link from YouTube, TikTok, or Facebook.",
        },
        { status: 400 }
      );
    }

    const data = await getVideoMetadata(trimmedUrl);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API/INFO Error]:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not retrieve video information. Please ensure the link is public and accessible.",
      },
      { status: 500 }
    );
  }
}
