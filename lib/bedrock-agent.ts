import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { AWSCredentials, AWS_MCP_TOOLS, AWSMCPClient } from './aws-mcp-tools'
import { BedrockMessage, MCPToolCall, MCPToolResult } from '../types'

export class AWSBedrockAgent {
  private bedrockClient: BedrockRuntimeClient
  private mcpClient: AWSMCPClient
  private modelId: string

  constructor(mcpCredentials: AWSCredentials) {
    console.log('🚀 AWSBedrockAgent 초기화 중...')
    
    // Bedrock은 환경변수에서 자격증명 읽어옴 (타입 안전하게)
    const bedrockAccessKeyId = process.env.BEDROCK_ACCESS_KEY_ID
    const bedrockSecretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY

    if (!bedrockAccessKeyId || !bedrockSecretAccessKey) {
      throw new Error('Bedrock 자격증명이 환경변수에 설정되지 않았습니다. BEDROCK_ACCESS_KEY_ID와 BEDROCK_SECRET_ACCESS_KEY를 설정해주세요.')
    }

    console.log('✅ Bedrock 환경변수 확인 완료')

    // 이제 타입이 확실히 string이므로 안전하게 사용 가능
    this.bedrockClient = new BedrockRuntimeClient({
      credentials: {
        accessKeyId: bedrockAccessKeyId,
        secretAccessKey: bedrockSecretAccessKey
      },
      region: process.env.BEDROCK_REGION || 'us-east-1'
    })
    
    // MCP는 사용자 입력 자격증명 사용
    this.mcpClient = new AWSMCPClient(mcpCredentials)
    
    // 모델 ID도 환경변수에서 읽어옴
    this.modelId = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
    
    console.log(`✅ 모델 ID: ${this.modelId}`)
    console.log(`✅ MCP 자격증명 지역: ${mcpCredentials.region || 'us-east-1'}`)
  }

  async processUserQuery(userQuery: string): Promise<string> {
    try {
      console.log('📝 사용자 질문:', userQuery)

      // 1단계: 사용자 질문 분석 및 도구 선택
      console.log('🔍 1단계: AI 도구 분석 시작...')
      const toolAnalysisPrompt = this.buildToolAnalysisPrompt(userQuery)
      const toolSelection = await this.callBedrock([
        { role: 'user', content: toolAnalysisPrompt }
      ])

      console.log('🤖 AI 도구 선택 응답:', toolSelection)

      // 2단계: 선택된 도구로 AWS 리소스 쿼리
      const toolCalls = this.parseToolCalls(toolSelection)
      console.log('🔧 파싱된 도구 호출:', JSON.stringify(toolCalls, null, 2))

      if (toolCalls.length === 0) {
        console.log('⚠️ 선택된 도구가 없습니다. 일반 응답으로 처리합니다.')
        return '죄송합니다. 해당 질문은 AWS 리소스 조회와 관련이 없어서 도구를 사용할 수 없습니다. AWS EC2, S3, 계정 정보 관련 질문을 해주세요.'
      }

      console.log('⚡ 2단계: AWS MCP 도구 실행 시작...')
      const toolResults = await this.executeTools(toolCalls)
      console.log('📊 도구 실행 결과:', JSON.stringify(toolResults, null, 2))

      // 3단계: 도구 결과를 바탕으로 최종 응답 생성
      console.log('📝 3단계: 최종 응답 생성 시작...')
      const finalPrompt = this.buildFinalResponsePrompt(userQuery, toolResults)
      const finalResponse = await this.callBedrock([
        { role: 'user', content: finalPrompt }
      ])

      console.log('✅ 최종 응답 생성 완료')
      return finalResponse

    } catch (error: any) {
      console.error('❌ Bedrock Agent Error:', error)
      
      if (error.message?.includes('자격증명이 환경변수에 설정되지 않았습니다')) {
        throw error // 환경변수 오류는 그대로 전파
      }
      
      return `죄송합니다. 요청을 처리하는 중 오류가 발생했습니다: ${error.message}`
    }
  }

  private buildToolAnalysisPrompt(userQuery: string): string {
    const toolsDescription = AWS_MCP_TOOLS.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\\n')

    return `사용자 질문을 분석하고 필요한 AWS 도구를 선택해주세요.

사용 가능한 도구들:
${toolsDescription}

사용자 질문: "${userQuery}"

다음 JSON 형식으로 정확히 응답해주세요:
{
  "analysis": "사용자가 무엇을 원하는지 분석",
  "tools_needed": [
    {
      "tool_name": "describe_ec2_instances",
      "parameters": {},
      "reason": "이 도구가 필요한 이유"
    }
  ]
}

중요한 규칙:
1. tool_name은 반드시 위의 도구 목록에서 정확히 선택해주세요
2. EC2나 인스턴스 관련 질문이면 "describe_ec2_instances" 사용
3. S3나 버킷 관련 질문이면 "list_s3_buckets" 사용  
4. 계정이나 account 관련 질문이면 "get_account_info" 사용
5. AWS 리소스와 관련없는 질문이라면 tools_needed를 빈 배열 [] 로 반환
6. JSON 형식을 정확히 지켜주세요`
  }

  private buildFinalResponsePrompt(userQuery: string, toolResults: MCPToolResult[]): string {
    const resultsText = toolResults.map(result => 
      `도구: ${result.toolName}\\n성공: ${result.success}\\n결과: ${JSON.stringify(result.data, null, 2)}`
    ).join('\\n\\n')

    return `사용자의 질문에 대해 AWS 리소스 조회 결과를 바탕으로 자연스럽고 도움이 되는 답변을 제공해주세요.

사용자 질문: "${userQuery}"

AWS 리소스 조회 결과:
${resultsText}

다음 지침을 따라 답변해주세요:
1. 조회 결과를 분석하여 사용자가 이해하기 쉽게 설명
2. 관련 통계나 요약 정보 제공
3. 한국어로 친근하고 전문적인 톤으로 작성
4. 필요시 추가 권장사항이나 주의사항 포함
5. 도구 실행이 실패했다면 그 이유도 설명해주세요`
  }

  private async callBedrock(messages: BedrockMessage[]): Promise<string> {
    try {
      console.log('🔄 Bedrock 호출 중...')
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
      const result = response.output?.message?.content?.[0]?.text || ''
      console.log('✅ Bedrock 응답 수신 완료')
      return result
    } catch (error: any) {
      console.error('❌ Bedrock 호출 실패:', error)
      throw error
    }
  }

  private parseToolCalls(toolSelection: string): MCPToolCall[] {
    try {
      console.log('🔍 AI 응답 파싱 중...')
      
      let jsonStr = toolSelection.trim()
      
      // 더 견고한 JSON 추출
      // ```json...``` 블록에서 JSON 부분만 추출
      const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g
      const match = codeBlockRegex.exec(jsonStr)
      
      if (match) {
        jsonStr = match[1].trim()
        console.log('📋 코드 블록에서 JSON 추출 성공')
      } else {
        // 코드 블록이 없다면 JSON이 직접 반환된 것으로 가정
        console.log('📋 직접 JSON 응답으로 처리')
      }
      
      console.log('📋 파싱할 JSON:', jsonStr)
      
      // JSON 파싱 시도
      const parsed = JSON.parse(jsonStr)
      console.log('✅ JSON 파싱 성공:', parsed)
      
      const toolCalls = (parsed.tools_needed || []).map((tool: any) => ({
        toolName: tool.tool_name,
        parameters: tool.parameters || {},
        reason: tool.reason
      }))
      
      console.log(`🔧 총 ${toolCalls.length}개 도구 호출 예정`)
      return toolCalls
    } catch (error) {
      console.error('❌ 도구 선택 파싱 실패:', error)
      console.error('원본 응답:', toolSelection)
      
      // 폴백: AI 응답을 분석해서 수동으로 도구 추론
      console.log('🔄 폴백: 수동 도구 추론 시도...')
      return this.fallbackToolSelection(toolSelection)
    }
  }

  private fallbackToolSelection(response: string): MCPToolCall[] {
    const lowerResponse = response.toLowerCase()
    
    console.log('🤔 AI 응답 내용 분석 중...')
    
    // EC2 관련 키워드 체크
    if (lowerResponse.includes('ec2') || lowerResponse.includes('instance') || lowerResponse.includes('인스턴스')) {
      console.log('✅ EC2 관련 키워드 발견 - describe_ec2_instances 사용')
      return [{
        toolName: 'describe_ec2_instances',
        parameters: {},
        reason: 'EC2 관련 질문으로 판단됨'
      }]
    }
    
    // S3 관련 키워드 체크
    if (lowerResponse.includes('s3') || lowerResponse.includes('bucket') || lowerResponse.includes('버킷')) {
      console.log('✅ S3 관련 키워드 발견 - list_s3_buckets 사용')
      return [{
        toolName: 'list_s3_buckets',
        parameters: {},
        reason: 'S3 관련 질문으로 판단됨'
      }]
    }
    
    // 계정 정보 관련 키워드 체크
    if (lowerResponse.includes('account') || lowerResponse.includes('계정') || lowerResponse.includes('identity')) {
      console.log('✅ 계정 관련 키워드 발견 - get_account_info 사용')
      return [{
        toolName: 'get_account_info',
        parameters: {},
        reason: '계정 정보 질문으로 판단됨'
      }]
    }
    
    console.log('❌ 인식 가능한 키워드를 찾지 못함')
    return []
  }

  private async executeTools(toolCalls: MCPToolCall[]): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = []
    
    for (const toolCall of toolCalls) {
      console.log(`🔧 도구 실행 중: ${toolCall.toolName}`)
      try {
        const data = await this.mcpClient.callTool(toolCall.toolName, toolCall.parameters)
        console.log(`✅ 도구 성공: ${toolCall.toolName}`, data)
        results.push({
          toolName: toolCall.toolName,
          data: data,
          success: true
        })
      } catch (error: any) {
        console.error(`❌ 도구 실패: ${toolCall.toolName}`, error.message)
        results.push({
          toolName: toolCall.toolName,
          data: { error: error.message },
          success: false,
          error: error.message
        })
      }
    }
    
    console.log(`📊 도구 실행 완료: ${results.length}개 결과`)
    return results
  }
}
