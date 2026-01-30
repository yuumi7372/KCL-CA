import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.url), {
    status: 302,
  });

  // Firebase セッションCookieを削除
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
