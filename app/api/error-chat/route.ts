import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    // 실제 엔드포인트로 요청 전달
    const response = await fetch(
      "http://localhost:5678/webhook/b92bb8d5-9bf7-4172-80d0-086aac9b51f0",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 응답 텍스트 확인
    const responseText = await response.text();
    console.log("n8n response:", responseText);

    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      result = { message: responseText };
    }

    return NextResponse.json({
      data: result.output || result.data || result.message || result,
      error: null,
    });
  } catch (error) {
    console.error("Error chat API error:", error);
    return NextResponse.json(
      {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "에러 처리 중 문제가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
