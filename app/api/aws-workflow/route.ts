import { NextRequest, NextResponse } from "next/server";
import { AWSDirectClient, AWSCredentials } from "../../../lib/aws-client";
import { ChatBedrockConverse } from "@langchain/aws";
import { getAWSMemory } from "@/lib/langchain-memory";

interface AWSWorkflowResponse {
  data?: string;
  error?: string;
  info?: string;
  usedN8nWebhook?: boolean;
  refs?: Array<{
    title: string;
    link: string;
  }>;
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
    const {
      query,
      credentials,
      sessionId,
    }: {
      query: string;
      credentials: AWSCredentials;
      sessionId: string;
    } = body;

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
    memory.updateContext(sessionId, {
      awsRegion: credentials.region,
      conversationPhase: "followup",
    });

    // AWS 리소스 조회가 필요한지 감지
    const awsResourceKeywords = [
      "조회",
      // "rds", "데이터베이스", "database",
      // "s3", "버킷", "bucket", "storage",
      // "람다", "lambda", "function",
      // "로드밸런서", "load balancer", "alb", "nlb", "elb",
      // "보안그룹", "security group",
      // "목록",
      // "리스트",
      // "list",
      // "조회",
      // "확인",
      // "상태",
      // "status",
      // "describe",
    ];

    const needsAWSResourceQuery = awsResourceKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword.toLowerCase())
    );

    console.log(`AWS 리소스 조회 필요: ${needsAWSResourceQuery}`);
    console.log(
      `감지된 키워드들:`,
      awsResourceKeywords.filter((keyword) =>
        query.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    let awsResponse: any = null;
    let workPlanResult: any = null;
    let usedN8nWebhook = false;

    // AWS 리소스 조회가 필요한 경우만 LLM+SDK 사용
    if (needsAWSResourceQuery) {
      console.log("🔍 AWS 리소스 조회를 위해 LLM+SDK 사용");

      // 컨텍스트가 포함된 프롬프트 생성
      const contextualPrompt = await memory.getContextualPrompt(
        sessionId,
        query
      );

      // AWS SDK + Bedrock LLM으로 리소스 조회
      const awsClient = new AWSDirectClient(credentials);
      awsResponse = await awsClient.processQuery(contextualPrompt);

      if (!awsResponse.success) {
        throw new Error(awsResponse.error || "AWS 조회 실패");
      }
    } else {
      // AWS 리소스 조회가 필요하지 않은 경우 n8n 웹훅 호출
      console.log("🤖 일반 쿼리로 n8n 워크플로우 호출");

      try {
        // n8n 웹훅으로 일반 쿼리 처리 요청 (LangChain과 동일한 세션 ID 사용)
        const webhookUrl =
          "http://13.125.245.132:5678/webhook/3c7a53f9-689e-4c4f-8cde-7cc487189bb4";
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
          let extractedRefs = null;

          if (webhookData.output) {
            extractedContent = webhookData.output;
            console.log(webhookData);
          }

          // refs 데이터가 있는 경우 추출
          if (webhookData.refs && Array.isArray(webhookData.refs)) {
            extractedRefs = webhookData.refs;
          }

          workPlanResult = {
            success: true,
            workPlan: extractedContent,
            refs: extractedRefs,
          };
          usedN8nWebhook = true;
          console.log("✅ n8n 웹훅 처리 완료");
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

    // 응답 구성
    const result: AWSWorkflowResponse = {};

    if (needsAWSResourceQuery && awsResponse) {
      // AWS 리소스 조회가 실행된 경우
      await memory.addMessage(sessionId, query, awsResponse.data);

      result.data = awsResponse.data;
      result.info = awsResponse.usedLLM
        ? "✅ Bedrock LLM이 대화 맥락을 고려하여 AWS 데이터를 분석했습니다"
        : "✅ AWS SDK를 통해 직접 조회되었습니다";
    } else if (usedN8nWebhook && workPlanResult?.success) {
      // n8n 워크플로우가 실행된 경우
      await memory.addMessage(sessionId, query, workPlanResult.workPlan);

      result.data = workPlanResult.workPlan;
      result.usedN8nWebhook = true;
      result.info = "✅ n8n 워크플로우가 쿼리를 처리했습니다";

      // refs 데이터가 있는 경우 포함
      if (workPlanResult.refs) {
        result.refs = workPlanResult.refs;
      }
    } else {
      // 실패한 경우
      throw new Error("AWS 리소스 조회와 n8n 워크플로우 모두 실패했습니다");
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
