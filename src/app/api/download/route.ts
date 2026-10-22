import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  "0d0c0b50824820a447cabd089c830e8762fb2612020262ef26f3c635b24c6dd7";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoUrl = body.videoURL || body.url;
    const formatId = body.formatId || "audio-mp3";
    const directDownloadUrl = body.downloadUrl;
    const incomingTitle = body.title;

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter: 'videoURL'." },
        { status: 400 }
      );
    }

    const trimmedUrl = videoUrl.trim();
    const isAudio = formatId.startsWith("audio");

    // 1. Fast Path: If direct stream URL was already resolved during info extraction
    if (directDownloadUrl && typeof directDownloadUrl === "string") {
      const cleanTitle = (incomingTitle || "youtube-media")
        .replace(/[^a-zA-Z0-9_\-\s]/g, "")
        .trim()
        .slice(0, 60);
      const filename = `${cleanTitle || "download"}.${isAudio ? "mp3" : "mp4"}`;

      return NextResponse.json({
        success: true,
        url: directDownloadUrl,
        downloadUrl: directDownloadUrl,
        filename,
        title: incomingTitle || "YouTube Media",
        format: isAudio ? "MP3 Audio" : "MP4 Video",
      });
    }

    // 2. On-demand Path: Call the YouTube private API with key
    const targetApiUrl = `https://kavi-public-apis.vercel.app/api/v2/private/download/youtube/?url=${encodeURIComponent(
      trimmedUrl
    )}&api_key=${encodeURIComponent(YOUTUBE_API_KEY)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    let externalRes: Response;
    try {
      externalRes = await fetch(targetApiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!externalRes.ok) {
      return NextResponse.json(
        { error: `Downloader service returned HTTP ${externalRes.status}.` },
        { status: externalRes.status }
      );
    }

    const apiJson = await externalRes.json();
    const mediaPayload = apiJson?.data?.data;

    if (!mediaPayload) {
      return NextResponse.json(
        {
          error:
            apiJson?.message ||
            "Unable to generate download stream. Please verify the video link is public.",
        },
        { status: 502 }
      );
    }

    let finalStreamUrl = "";
    if (isAudio) {
      finalStreamUrl = mediaPayload.audio || "";
    } else {
      // Extract corresponding video resolution or highest available
      const formatKey = formatId.replace("video-", "");
      if (mediaPayload.videos && mediaPayload.videos[formatKey]) {
        finalStreamUrl = mediaPayload.videos[formatKey];
      } else if (mediaPayload.videos) {
        // Fallback to highest available video quality
        const sortedKeys = Object.keys(mediaPayload.videos).sort(
          (a, b) => parseInt(b, 10) - parseInt(a, 10)
        );
        finalStreamUrl = mediaPayload.videos[sortedKeys[0]] || "";
      }
    }

    if (!finalStreamUrl) {
      return NextResponse.json(
        { error: "Requested format stream is currently unavailable for this media." },
        { status: 404 }
      );
    }

    const rawTitle = mediaPayload.title || incomingTitle || "downloaded-media";
    const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().slice(0, 60);
    const filename = `${safeTitle || "media"}.${isAudio ? "mp3" : "mp4"}`;

    return NextResponse.json({
      success: true,
      url: finalStreamUrl,
      downloadUrl: finalStreamUrl,
      filename,
      title: rawTitle,
      format: isAudio ? "MP3 Audio" : "MP4 Video",
    });
  } catch (err: any) {
    console.error("[API/DOWNLOAD Error]:", err);
    if (err.name === "AbortError") {
      return NextResponse.json(
        { error: "Downloader request timed out. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        error:
          err?.message ||
          "An unexpected error occurred while processing your download request.",
      },
      { status: 500 }
    );
  }
}
