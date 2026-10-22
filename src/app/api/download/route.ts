import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Default API key provided for the public video downloader API
const DEFAULT_KAVI_API_KEY =
  process.env.KAVI_API_KEY ||
  "6e52cd12dfeeb8ec7f65a474141415289b8689ec6f5859533a7a253687d2ba63";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoUrl = body.videoURL || body.url;
    const formatId = body.formatId || "mp4-1080";

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter: 'videoURL'." },
        { status: 400 }
      );
    }

    const trimmedUrl = videoUrl.trim();
    const isAudio = formatId === "mp3-audio";

    // Select the appropriate API endpoint based on chosen format:
    // - MP3 Audio: calls the song extraction endpoint
    // - MP4 Video: calls the public YouTube video download endpoint with the api_key
    let targetApiUrl: string;
    if (isAudio) {
      targetApiUrl = `https://kavi-public-apis.vercel.app/api/v2/youtube/song/?videoURL=${encodeURIComponent(
        trimmedUrl
      )}`;
    } else {
      targetApiUrl = `https://kavi-public-apis.vercel.app/api/v2/public/download/youtube/video/?videoURL=${encodeURIComponent(
        trimmedUrl
      )}&api_key=${encodeURIComponent(DEFAULT_KAVI_API_KEY)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40-second timeout

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
        {
          error: `External downloader service returned HTTP ${externalRes.status}. Please try again later.`,
        },
        { status: externalRes.status }
      );
    }

    const apiData = await externalRes.json();

    // Validate returned payload: supports both `downloadUrl` (video API) and `url` (song API)
    const directDownloadUrl = apiData?.data?.downloadUrl || apiData?.data?.url;

    if (!directDownloadUrl) {
      return NextResponse.json(
        {
          error:
            apiData?.message ||
            "Unable to generate download stream. Please verify the video link is public and accessible.",
        },
        { status: 502 }
      );
    }

    const rawTitle = apiData?.data?.title || "downloaded-media";
    const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().slice(0, 60);
    const filename =
      apiData?.data?.filename || `${safeTitle || "media"}.${isAudio ? "mp3" : "mp4"}`;

    return NextResponse.json({
      success: true,
      url: directDownloadUrl,
      downloadUrl: directDownloadUrl,
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
