import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { AWSCredentials, AWSMCPClient } from './aws-mcp-tools'
import { BedrockMessage, MCPToolResult } from '../types'
import { HTTPMCPClient, AWSMCPHelper, getMCPClient, getAWSMCPHelper } from './http-mcp-client'

export class AWSBedrockAgentWithMCP {
  private bedrockClient: BedrockRuntimeClient
  private awsDirectClient: AWSMCPClient
  private mcpClient: HTTPMCPClient
  private mcpHelper: AWSMCPHelper
  private modelId: string

  constructor(mcpCredentials: AWSCredentials) {
    const bedrockAccessKeyId = process.env.BEDROCK_ACCESS_KEY_ID
    const bedrockSecretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY

    if (!bedrockAccessKeyId || !bedrockSecretAccessKey) {
      throw new Error('Bedrock 자격증명이 환경변수에 설정되지 않았습니다. BEDROCK_ACCESS_KEY_ID와 BEDROCK_SECRET_ACCESS_KEY를 설정해주세요.')
    }

    this.bedrockClient = new BedrockRuntimeClient({
      credentials: { accessKeyId: bedrockAccessKeyId, secretAccessKey: bedrockSecretAccessKey },
      region: process.env.BEDROCK_REGION || 'us-east-1'
    })
    
    this.awsDirectClient = new AWSMCPClient(mcpCredentials)
    this.mcpClient = getMCPClient()
    this.mcpHelper = getAWSMCPHelper()
    this.modelId = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
  }

  async processUserQuery(userQuery: string): Promise<string> {
    try {
      const mcpReady = await this.mcpClient.checkHealth()
      if (!mcpReady) {
        return await this.processWithoutMCP(userQuery)
      }

      const mcpAnalysis = await this.mcpHelper.analyzeAWSQuery(userQuery)
      const toolResults = await this.executeAWSTools(mcpAnalysis)
      const finalResponse = await this.generateFinalResponse(userQuery, mcpAnalysis, toolResults)

      return finalResponse

    } catch (error: any) {
      if (error.message?.includes('자격증명이 환경변수에 설정되지 않았습니다')) {
        throw error
      }
      return await this.processWithoutMCP(userQuery)
    }
  }

  private async executeAWSTools(mcpAnalysis: any): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = []
    const service = mcpAnalysis.service
    
    const serviceCalls = [
      { condition: service === 'ec2', tool: 'describe_ec2_instances' },
      { condition: service === 's3', tool: 'list_s3_buckets' },
      { condition: service === 'account', tool: 'get_account_info' }
    ]

    for (const { condition, tool } of serviceCalls) {
      if (condition) {
        try {
          const data = await this.awsDirectClient.callTool(tool)
          results.push({ toolName: tool, data, success: true })
        } catch (error: any) {
          results.push({ 
            toolName: tool, 
            data: { error: error.message }, 
            success: false, 
            error: error.message 
          })
        }
      }
    }

    return results
  }

  private async generateFinalResponse(userQuery: string, mcpAnalysis: any, toolResults: MCPToolResult[]): Promise<string> {
    const resultsText = toolResults.map(result => 
      `도구: ${result.toolName}\n성공: ${result.success}\n결과: ${JSON.stringify(result.data, null, 2)}`
    ).join('\n\n')

    const prompt = `사용자의 AWS 관련 질문에 대해 전문적이고 도움이 되는 답변을 제공해주세요.

사용자 질문: "${userQuery}"

AWS MCP 분석 결과:
- 관련 서비스: ${mcpAnalysis.service}
- 신뢰도: ${mcpAnalysis.confidence}
- 분석 이유: ${mcpAnalysis.reasoning}

AWS 리소스 조회 결과:
${resultsText}

다음 지침을 따라 답변해주세요:
1. MCP 분석을 바탕으로 사용자의 의도를 정확히 파악
2. 조회 결과를 분석하여 사용자가 이해하기 쉽게 설명
3. 관련 통계나 요약 정보 제공
4. 한국어로 친근하고 전문적인 톤으로 작성
5. 필요시 AWS 모범 사례나 권장사항 포함
6. 도구 실행이 실패했다면 그 이유도 설명
7. MCP를 통한 AWS 전문 지식을 활용하여 더 깊이 있는 인사이트 제공`

    return await this.callBedrock([{ role: 'user', content: prompt }])
  }

  private async processWithoutMCP(userQuery: string): Promise<string> {
    const query = userQuery.toLowerCase()
    const toolResults: MCPToolResult[] = []
    
    const keywords = [
      { match: ['ec2', '인스턴스'], tool: 'describe_ec2_instances' },
      { match: ['s3', '버킷'], tool: 'list_s3_buckets' },
      { match: ['계정', 'account'], tool: 'get_account_info' }
    ]

    for (const { match, tool } of keywords) {
      if (match.some(keyword => query.includes(keyword))) {
        try {
          const data = await this.awsDirectClient.callTool(tool)
          toolResults.push({ toolName: tool, data, success: true })
        } catch (error: any) {
          toolResults.push({ toolName: tool, data: { error: error.message }, success: false, error: error.message })
        }
      }
    }

    if (toolResults.length === 0) {
      return '죄송합니다. AWS 리소스 조회와 관련된 질문을 해주세요. (예: EC2 인스턴스, S3 버킷, 계정 정보)'
    }

    const resultsText = toolResults.map(result => 
      `도구: ${result.toolName}\n결과: ${JSON.stringify(result.data, null, 2)}`
    ).join('\n\n')

    const prompt = `사용자의 질문에 대해 AWS 리소스 조회 결과를 바탕으로 답변해주세요.

사용자 질문: "${userQuery}"

AWS 리소스 조회 결과:
${resultsText}

한국어로 친근하고 이해하기 쉽게 답변해주세요.`

    return await this.callBedrock([{ role: 'user', content: prompt }])
  }

  private async callBedrock(messages: BedrockMessage[]): Promise<string> {
    try {
      const command = new ConverseCommand({
        modelId: this.modelId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: [{ text: msg.content }]
        })),
        inferenceConfig: {
          maxTokens: 2000,
          temperature: 0.1
        }
      })

      const response = await this.bedrockClient.send(command)
      return response.output?.message?.content?.[0]?.text || ''
    } catch (error: any) {
      console.error('Bedrock 호출 실패:', error)
      throw error
    }
  }
}
