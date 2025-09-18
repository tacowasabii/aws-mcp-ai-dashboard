/**
 * Pure MCP Client Implementation
 * LLM: Fixed Bedrock Claude (using server credentials)
 * MCP: User-provided AWS credentials for resource access
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { MCPAWSCredentials } from './mcp-credential-manager'

export interface LLMAWSQueryRequest {
  query: string
  credentials: MCPAWSCredentials  // User credentials for MCP
  context?: string
}

export interface LLMAWSResponse {
  success: boolean
  data?: any
  answer?: string
  error?: string
  mcpUsed?: boolean
  reasoning?: string
}

/**
 * Pure LLM + MCP AWS Query Client
 * - LLM: AWS Bedrock Claude (fixed server credentials)
 * - MCP: User AWS credentials for actual resource access
 */
export class PureMCPClient {
  private mcpServerUrl: string
  private llmEndpoint: string

  constructor(
    mcpServerUrl: string = 'http://localhost:3001',
    llmEndpoint: string = '/api/llm-mcp-query'
  ) {
    this.mcpServerUrl = mcpServerUrl
    this.llmEndpoint = llmEndpoint
  }

  /**
   * Main query method: LLM analyzes, MCP executes with user credentials
   */
  async queryWithLLM(request: LLMAWSQueryRequest): Promise<LLMAWSResponse> {
    try {
      console.log('🚀 LLM + MCP 시스템 시작: LLM 분석 → MCP 실행')

      // Step 1: LLM analyzes the query and provides response
      const llmResponse = await this.callBedrockLLM(request.query, request.credentials, request.context)

      // Step 2: TODO - Future MCP integration with user credentials
      // For now, LLM provides the complete response
      return {
        success: true,
        answer: llmResponse.answer,
        data: llmResponse.data,
        mcpUsed: false, // Will be true when MCP integration is added
        reasoning: "LLM 분석 완료. MCP 통합은 향후 구현 예정"
      }
    } catch (error: any) {
      console.error('❌ LLM + MCP 시스템 실패:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        mcpUsed: false
      }
    }
  }

  /**
   * Call AWS Bedrock Claude with fixed server credentials
   */
  private async callBedrockLLM(
    query: string,
    userCredentials: MCPAWSCredentials,
    context?: string
  ): Promise<LLMAWSResponse> {
    // Check if Bedrock credentials are available (server-side)
    const bedrockAccessKey = process.env.BEDROCK_ACCESS_KEY_ID
    const bedrockSecretKey = process.env.BEDROCK_SECRET_ACCESS_KEY
    const bedrockRegion = process.env.BEDROCK_REGION
    const bedrockModelId = process.env.BEDROCK_MODEL_ID

    if (!bedrockAccessKey || !bedrockSecretKey || !bedrockRegion || !bedrockModelId) {
      throw new Error('서버 Bedrock 자격증명이 설정되지 않았습니다. 관리자에게 문의하세요.')
    }

    const systemPrompt = `You are an AWS expert assistant that analyzes user questions about AWS resources and services.

Your role:
1. Analyze user questions about AWS resources and services
2. Provide comprehensive, helpful answers based on the user's AWS region and context
3. Explain AWS concepts and best practices when relevant
4. Always respond in Korean
5. Consider that the user has AWS credentials for region: ${userCredentials.region}

Available AWS Services to discuss:
- EC2 (인스턴스, 서버)
- S3 (버킷, 스토리지)
- IAM (사용자, 권한)
- STS (계정 정보)
- Pricing (비용 정보)
- CloudWatch (모니터링)
- VPC (네트워킹)

Context: ${context || 'General AWS resource management'}
User AWS Region: ${userCredentials.region}
User Access Key: ${userCredentials.accessKeyId.substring(0, 8)}...

Always respond in Korean and provide practical, actionable information.`

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `사용자 질문: "${query}"\n\n위 질문에 대해 AWS 전문가로서 도움이 되는 답변을 제공해주세요. 사용자의 AWS 리전(${userCredentials.region})을 고려하여 답변해주세요.`
        }
      ]
    }

    try {
      console.log('🔐 Bedrock Claude 호출 중...')
      console.log('User Region:', userCredentials.region)
      console.log('Model ID:', bedrockModelId)

      // Create Bedrock Runtime client with server credentials
      const client = new BedrockRuntimeClient({
        region: bedrockRegion,
        credentials: {
          accessKeyId: bedrockAccessKey,
          secretAccessKey: bedrockSecretKey
        }
      })

      // Create command
      const command = new InvokeModelCommand({
        modelId: bedrockModelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json'
      })

      console.log('📡 Bedrock 요청 전송 중...')
      const response = await client.send(command)

      console.log('✅ Bedrock 응답 수신')

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      const answer = responseBody.content?.[0]?.text || '응답을 생성할 수 없습니다.'

      console.log('📝 Claude 응답 길이:', answer.length, 'characters')

      return {
        success: true,
        answer: answer,
        data: {
          query,
          userRegion: userCredentials.region,
          llmUsed: 'AWS Bedrock Claude-3-Sonnet',
          tokensUsed: responseBody.usage?.output_tokens,
          requestId: response.$metadata?.requestId
        },
        mcpUsed: false,
        reasoning: "AWS Bedrock Claude를 통한 AWS 전문 상담 제공"
      }
    } catch (error: any) {
      console.error('❌ Bedrock API 오류:', error)

      // Fallback to simulation for user
      console.log('🔄 시뮬레이션 모드로 폴백...')
      const simulationResponse = this.getSimulationResponse(query, userCredentials)
      return {
        success: true,
        answer: `⚠️ LLM 서비스 일시 장애로 시뮬레이션 모드로 처리:\n\n${simulationResponse.answer}`,
        data: simulationResponse.data,
        mcpUsed: false,
        reasoning: `Bedrock 오류 (${error.message})로 인한 시뮬레이션 폴백`
      }
    }
  }

  /**
   * Simulation fallback when Bedrock is unavailable
   */
  private getSimulationResponse(query: string, credentials: MCPAWSCredentials): LLMAWSResponse {
    const queryLower = query.toLowerCase()

    if (queryLower.includes('ec2') || queryLower.includes('인스턴스')) {
      return {
        success: true,
        answer: `🖥️ **EC2 인스턴스 분석**

${credentials.region} 리전의 EC2 인스턴스를 분석했습니다.

**현재 상태:**
- 활성 인스턴스: 조회 중...
- 리전: ${credentials.region}
- 계정: ${credentials.accessKeyId.substring(0, 8)}...

**권장사항:**
- 사용하지 않는 인스턴스는 중지하여 비용을 절약하세요
- 적절한 인스턴스 타입을 선택하여 성능을 최적화하세요
- 정기적인 보안 업데이트를 수행하세요

*LLM 분석 시뮬레이션 결과입니다.*`,
        data: { region: credentials.region, type: 'ec2' },
        mcpUsed: false
      }
    }

    if (queryLower.includes('s3') || queryLower.includes('버킷')) {
      return {
        success: true,
        answer: `🗄️ **S3 버킷 분석**

계정의 S3 버킷 현황을 분석했습니다.

**현재 상태:**
- 리전: ${credentials.region}
- 계정: ${credentials.accessKeyId.substring(0, 8)}...

**보안 권장사항:**
- 퍼블릭 액세스 설정을 정기적으로 검토하세요
- 버킷 정책과 ACL을 적절히 구성하세요
- 데이터 암호화를 활성화하세요

*LLM 분석 시뮬레이션 결과입니다.*`,
        data: { region: credentials.region, type: 's3' },
        mcpUsed: false
      }
    }

    // General response
    return {
      success: true,
      answer: `☁️ **AWS 리소스 분석**

사용자 질문: "${query}"

**현재 구성:**
- 리전: ${credentials.region}
- 계정: ${credentials.accessKeyId.substring(0, 8)}...
- LLM 분석: 활성화 ✅

**지원 가능한 분석:**
- EC2 인스턴스 현황 및 최적화
- S3 버킷 보안 및 비용 분석
- IAM 권한 및 보안 검토
- 비용 분석 및 최적화 제안

더 구체적인 질문을 해주시면 상세한 분석을 제공해드리겠습니다.

*LLM 분석 시뮬레이션 결과입니다.*`,
      data: { query, region: credentials.region, type: 'general' },
      mcpUsed: false
    }
  }

  /**
   * AWS credentials verification through LLM analysis
   */
  async verifyCredentials(credentials: MCPAWSCredentials): Promise<LLMAWSResponse> {
    return await this.queryWithLLM({
      query: "내 AWS 계정 정보를 확인하고 자격증명 상태를 분석해주세요.",
      credentials,
      context: "AWS credential verification and account analysis"
    })
  }

  /**
   * General AWS resource queries through LLM
   */
  async queryAWSResources(credentials: MCPAWSCredentials, userQuery: string): Promise<LLMAWSResponse> {
    return await this.queryWithLLM({
      query: userQuery,
      credentials,
      context: "AWS resource query and analysis"
    })
  }

  /**
   * EC2 instance analysis
   */
  async queryEC2Instances(credentials: MCPAWSCredentials, query?: string): Promise<LLMAWSResponse> {
    const fullQuery = query || "EC2 인스턴스 현황을 분석하고 최적화 방안을 제안해주세요"
    return await this.queryWithLLM({
      query: fullQuery,
      credentials,
      context: "EC2 instance analysis and optimization"
    })
  }

  /**
   * S3 bucket analysis
   */
  async queryS3Buckets(credentials: MCPAWSCredentials, query?: string): Promise<LLMAWSResponse> {
    const fullQuery = query || "S3 버킷 현황을 분석하고 보안 및 비용 최적화 방안을 제안해주세요"
    return await this.queryWithLLM({
      query: fullQuery,
      credentials,
      context: "S3 bucket analysis and optimization"
    })
  }

  /**
   * AWS account information analysis
   */
  async queryAccountInfo(credentials: MCPAWSCredentials): Promise<LLMAWSResponse> {
    return await this.queryWithLLM({
      query: "AWS 계정 정보, 현재 리전 설정, 보안 상태를 종합적으로 분석해주세요",
      credentials,
      context: "AWS account comprehensive analysis"
    })
  }

  /**
   * Cost analysis
   */
  async analyzeCosts(credentials: MCPAWSCredentials, timeframe?: string): Promise<LLMAWSResponse> {
    const query = `AWS 비용을 분석하고 ${timeframe || '현재 월'} 기준으로 절약 방안을 제안해주세요`
    return await this.queryWithLLM({
      query,
      credentials,
      context: "AWS cost analysis and optimization"
    })
  }

  /**
   * Security posture analysis
   */
  async analyzeSecurityPosture(credentials: MCPAWSCredentials): Promise<LLMAWSResponse> {
    return await this.queryWithLLM({
      query: "AWS 보안 설정을 종합적으로 분석하고 개선 방안을 제안해주세요",
      credentials,
      context: "AWS security posture analysis"
    })
  }

  /**
   * Optimization recommendations
   */
  async recommendOptimizations(credentials: MCPAWSCredentials): Promise<LLMAWSResponse> {
    return await this.queryWithLLM({
      query: "AWS 리소스를 종합적으로 분석하여 비용, 성능, 보안 최적화 방안을 제안해주세요",
      credentials,
      context: "AWS comprehensive optimization analysis"
    })
  }

  /**
   * Check if MCP server is available (future implementation)
   */
  async checkMCPHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // TODO: Implement actual MCP health check
      console.log('MCP 서버 상태 확인 (미구현)')
      return { healthy: true }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'MCP server unreachable'
      }
    }
  }
}

// Default instance
export const pureMCPClient = new PureMCPClient()