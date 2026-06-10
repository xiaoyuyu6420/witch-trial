import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NextResponse } from "next/server";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const isDev = process.env.NODE_ENV === "development";

export function apiError(
  message: string,
  status: number = 500,
  detail?: unknown,
): NextResponse {
  const body: Record<string, unknown> = { error: message };
  if (isDev && detail !== undefined) {
    body.detail = detail instanceof Error ? detail.message : detail;
  }
  return NextResponse.json(body, { status });
}
