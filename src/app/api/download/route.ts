import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. STRICT AUTH GUARD: Verify Firebase Authorization Bearer Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication token is required to download media." },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid authorization header format." },
        { status: 401 }
      );
    }

    // Strictly validate the session token using firebase-admin
    try {
      const decodedUser = await verifyFirebaseToken(token);
      if (!decodedUser) {
        return NextResponse.json(
          { error: "Unauthorized. Token verification failed." },
          { status: 401 }
        );
      }
    } catch (authErr: any) {
      console.error("[Auth Guard Error]:", authErr.message);
      return NextResponse.json(
        { error: "Unauthorized. Invalid or expired Firebase session token." },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await req.json();
    const videoUrl = body.videoURL || body.url;

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter: 'videoURL'." },
        { status: 400 }
      );
    }

    // 3. Call the external public API to extract audio/song
    const targetApiUrl = `https://kavi-public-apis.vercel.app/api/v2/youtube/song/?videoURL=${encodeURIComponent(
      videoUrl.trim()
    )}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 second timeout

    let externalRes: Response;
    try {
      externalRes = await fetch(targetApiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!externalRes.ok) {
      return NextResponse.json(
        {
          error: `External downloader service returned status ${externalRes.status}. Please try again later.`,
        },
        { status: externalRes.status }
      );
    }

    const apiData = await externalRes.json();

    // 4. Validate external API payload
    if (!apiData || !apiData.data || !apiData.data.url) {
      return NextResponse.json(
        {
          error:
            apiData?.message ||
            "Unable to generate download stream. Please verify the video is public and accessible.",
        },
        { status: 502 }
      );
    }

    const { url, filename, title, quality } = apiData.data;

    // Return the download url and filename back to frontend
    return NextResponse.json({
      success: true,
      url,
      downloadUrl: url,
      filename: filename || `${title || "download"}.mp3`,
      title: title || "Media Song",
      quality: quality || null,
    });
  } catch (err: any) {
    console.error("[API/DOWNLOAD Error]:", err);
    if (err.name === "AbortError") {
      return NextResponse.json(
        { error: "External media service timed out. Please try again." },
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
