import { NextRequest, NextResponse } from "next/server";
import { getVideoMetadata } from "@/lib/ytdlp";

export const dynamic = "force-dynamic";

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

    // 1. YouTube Fast Preview (via YouTube oEmbed API - instant, no binary needed)
    const ytMatch = trimmedUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );

    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      let title = "YouTube Video";
      let uploader = "YouTube Creator";

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(trimmedUrl)}&format=json`,
          { next: { revalidate: 3600 } }
        );
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          title = oembedData.title || title;
          uploader = oembedData.author_name || uploader;
        }
      } catch {
        // Continue with defaults if oembed fails
      }

      return NextResponse.json({
        success: true,
        data: {
          title,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: 0,
          uploader,
          platform: "YouTube",
          formats: [
            { id: "mp3-audio", quality: "MP3 Audio (High Quality)", type: "audio", ext: "mp3" },
            { id: "mp4-1080", quality: "1080p (Full HD Video)", type: "video", ext: "mp4" },
            { id: "mp4-720", quality: "720p (HD Video)", type: "video", ext: "mp4" },
          ],
        },
      });
    }

    // 2. Fallback / other platforms (TikTok, Facebook)
    const isSupported = /tiktok\.com|facebook\.com|fb\.watch/i.test(trimmedUrl);
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
