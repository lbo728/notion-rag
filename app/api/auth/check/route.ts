import { NextRequest, NextResponse } from "next/server";

/**
 * Simple auth check for development mode
 * For single-user scenario, no complex auth needed
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  // In development, allow all requests
  // In production, check API key
  if (
    process.env.NODE_ENV === "development" ||
    apiKey === process.env.API_KEY
  ) {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
