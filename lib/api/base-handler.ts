import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { AppError } from "@/lib/utils/errors";

export async function handleRequest<T>(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<T>
): Promise<NextResponse> {
  try {
    const startTime = Date.now();
    const result = await handler(request);
    const duration = Date.now() - startTime;

    logger.info("Request completed", {
      path: request.nextUrl.pathname,
      method: request.method,
      duration: `${duration}ms`,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error("Request failed", {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
