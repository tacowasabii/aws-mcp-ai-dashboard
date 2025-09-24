import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_URL = "http://13.125.245.132:5678/webhook/convention";

export async function GET() {
  try {
    const resp = await fetch(WEBHOOK_URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const text = await resp.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // Upstream didn't return valid JSON; wrap as text
      data = { output: text };
    }

    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (error: any) {
    const message =
      error?.message || "컨벤션 웹훅(GET) 요청 처리 중 오류가 발생했습니다";
    return NextResponse.json(
      {
        error: message,
        info: "⚠️ n8n 컨벤션 웹훅 호출 중 문제가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { convention } = body || {};

    if (typeof convention !== "string" || convention.trim() === "") {
      return NextResponse.json(
        { error: "필드 'convention'은 필수 문자열입니다." },
        { status: 400 }
      );
    }

    const upstreamResp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convention }),
    });

    const upstreamText = await upstreamResp.text();
    let data: any;
    try {
      data = upstreamText ? JSON.parse(upstreamText) : {};
    } catch {
      data = { output: upstreamText };
    }

    return NextResponse.json(data, {
      status: upstreamResp.ok ? 200 : upstreamResp.status,
    });
  } catch (error: any) {
    const message =
      error?.message || "컨벤션 웹훅(POST) 요청 처리 중 오류가 발생했습니다";
    return NextResponse.json(
      {
        error: message,
        info: "⚠️ n8n 컨벤션 웹훅 호출 중 문제가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
