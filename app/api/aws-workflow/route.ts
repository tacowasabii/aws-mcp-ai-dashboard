import { NextRequest, NextResponse } from "next/server";
import { AWSDirectClient, AWSCredentials } from "../../../lib/aws-client";
import { ChatBedrockConverse } from "@langchain/aws";
import { getAWSMemory } from "@/lib/langchain-memory";

interface AWSWorkflowResponse {
  data?: string;
  workPlan?: string;
  error?: string;
  info?: string;
  usedN8nWebhook?: boolean;
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
    const {
      query,
      credentials,
      accountId,
    }: { query: string; credentials: AWSCredentials; accountId: string } = body;

    // AWS 자격증명 검증
    if (
      !credentials?.accessKeyId ||
      !credentials?.secretAccessKey ||
      !credentials?.region
    ) {
      return NextResponse.json(
        {
          error:
            "AWS 자격 증명이 필요합니다 (Access Key ID, Secret Access Key, Region)",
        },
        { status: 400 }
      );
    }

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { error: "질문을 입력해주세요" },
        { status: 400 }
      );
    }

    console.log("🚀 통합 AWS 워크플로우 시작...");
    console.log("쿼리:", query);

    // LangChain 메모리 초기화
    const llm = new ChatBedrockConverse({
      model: "anthropic.claude-3-haiku-20240307-v1:0",
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    const memory = getAWSMemory(llm);

    // 컨텍스트 업데이트
    memory.updateContext(accountId || "default", {
      awsRegion: credentials.region,
      conversationPhase: "followup",
    });

    // 작업계획서 생성 의도 감지 (간단한 키워드 기반)
    const workPlanKeywords = [
      "작업계획서",
      "워크플로우",
      "계획서",
      "작업 계획",
      "workflow",
      "work plan",
      "단계별",
      "절차",
      "cli 명령",
      "aws cli",
      "스크립트",
    ];

    const needsWorkPlan = workPlanKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword.toLowerCase())
    );

    // 컨텍스트가 포함된 프롬프트 생성
    const contextualPrompt = await memory.getContextualPrompt(
      accountId || "default",
      query
    );

    // AWS SDK + Bedrock LLM으로 리소스 조회
    const awsClient = new AWSDirectClient(credentials);
    const awsResponse = await awsClient.processQuery(contextualPrompt);

    if (!awsResponse.success) {
      throw new Error(awsResponse.error || "AWS 조회 실패");
    }

    let workPlanResult: any = null;
    let usedN8nWebhook = false;

    // 작업계획서가 필요한 경우 n8n 웹훅 호출
    if (needsWorkPlan) {
      console.log("📋 작업계획서 생성이 필요한 쿼리 감지됨");

      try {
        // 리소스 타입 결정
        let resourceType: "ec2" | "eks" | "vpc" | "general" = "general";
        const queryLower = query.toLowerCase();

        if (
          queryLower.includes("ec2") ||
          queryLower.includes("인스턴스") ||
          queryLower.includes("서버")
        ) {
          resourceType = "ec2";
        } else if (
          queryLower.includes("eks") ||
          queryLower.includes("클러스터") ||
          queryLower.includes("쿠버네티스")
        ) {
          resourceType = "eks";
        } else if (
          queryLower.includes("vpc") ||
          queryLower.includes("네트워크") ||
          queryLower.includes("서브넷")
        ) {
          resourceType = "vpc";
        }

        // n8n 웹훅으로 작업계획서 생성 요청
        const webhookUrl =
          "http://localhost:5678/webhook/3c7a53f9-689e-4c4f-8cde-7cc487189bb4";
        const sessionId =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
        const webhookPayload = {
          query: query,
          sessionId,
        };

        console.log("🔗 n8n 웹훅 호출 시작...");

        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        });

        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json();

          // n8n 응답에서 실제 내용 추출
          let extractedContent = "";
          if (webhookData.output) {
            extractedContent = webhookData.output;
          } else if (webhookData.workPlan) {
            extractedContent = webhookData.workPlan;
          } else if (webhookData.response) {
            extractedContent = webhookData.response;
          } else {
            extractedContent = JSON.stringify(webhookData);
          }

          workPlanResult = {
            success: true,
            workPlan: extractedContent,
          };
          usedN8nWebhook = true;
          console.log("✅ n8n 웹훅 작업계획서 생성 완료");
        } else {
          console.warn(
            "n8n 웹훅 실패:",
            webhookResponse.status,
            webhookResponse.statusText
          );
          workPlanResult = {
            success: false,
            error: `웹훅 호출 실패: ${webhookResponse.status} ${webhookResponse.statusText}`,
          };
        }
      } catch (error: any) {
        console.warn("n8n 웹훅 호출 중 오류:", error.message);
        workPlanResult = {
          success: false,
          error: `웹훅 호출 중 오류: ${error.message}`,
        };
      }
    }

    // 성공한 대화를 메모리에 저장
    await memory.addMessage(accountId || "default", query, awsResponse.data);

    // 응답 구성
    const result: AWSWorkflowResponse = {
      info: awsResponse.usedLLM
        ? "✅ Bedrock LLM이 대화 맥락을 고려하여 AWS 데이터를 분석했습니다"
        : "✅ AWS SDK를 통해 직접 조회되었습니다",
    };

    // 작업계획서가 생성된 경우 n8n 결과를 메인 응답으로 사용
    if (usedN8nWebhook && workPlanResult?.success) {
      result.data = workPlanResult.workPlan;
      result.workPlan = workPlanResult.workPlan;
      result.usedN8nWebhook = true;
      result.info =
        "✅ n8n 워크플로우가 작업계획서를 생성했습니다";
    } else {
      // 작업계획서가 필요하지 않은 경우만 AWS 응답 사용
      result.data = awsResponse.data;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ 통합 워크플로우 실패:", error);

    let errorMessage = "AWS 워크플로우 처리 중 오류가 발생했습니다";

    // AWS SDK 오류 처리
    if (error.name === "CredentialsProviderError") {
      errorMessage = "AWS 자격 증명이 올바르지 않습니다";
    } else if (error.name === "UnauthorizedOperation") {
      errorMessage = "AWS 권한이 부족합니다";
    } else if (error.message?.includes("InvalidUserID.NotFound")) {
      errorMessage = "AWS 자격 증명이 유효하지 않습니다";
    } else if (error.message?.includes("SignatureDoesNotMatch")) {
      errorMessage = "AWS Secret Key가 올바르지 않습니다";
    } else if (
      error.message?.includes("access denied") ||
      error.message?.includes("AccessDenied")
    ) {
      errorMessage =
        "AWS 리소스에 대한 액세스 권한이 없습니다. IAM 권한을 확인해주세요.";
    } else if (error.message?.includes("InvalidAccessKeyId")) {
      errorMessage = "AWS Access Key ID가 올바르지 않습니다";
    } else if (error.message?.includes("Bedrock")) {
      errorMessage = `Bedrock LLM 연동 오류: ${error.message}`;
    } else if (error.message?.includes("웹훅")) {
      errorMessage = `n8n 웹훅 연동 오류: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    const errorResult: AWSWorkflowResponse = {
      data: errorMessage,
      error: errorMessage,
      info: "⚠️ 통합 워크플로우 처리 중 문제가 발생했습니다.",
    };

    return NextResponse.json(errorResult, { status: 500 });
  }
}
