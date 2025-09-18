export interface MCPTool {
  name: string
  description: string
  inputSchema: any
}

export interface MCPToolCall {
  name: string
  arguments: any
}

export interface MCPToolResult {
  success: boolean
  result?: any
  error?: string
  toolName: string
}

export class HTTPMCPClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      const data = await response.json()
      return data.mcpServerReady === true
    } catch (error) {
      return false
    }
  }

  async listTools(): Promise<MCPTool[]> {
    const response = await fetch(`${this.baseUrl}/tools`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.tools || []
  }

  async callTool(name: string, arguments_: any = {}): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, arguments: arguments_ })
      })

      const data = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          toolName: name
        }
      }

      return {
        success: true,
        result: data.result,
        toolName: name
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        toolName: name
      }
    }
  }

  async analyzePrompt(prompt: string): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${this.baseUrl}/prompt/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      const data = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          toolName: 'prompt_understanding'
        }
      }

      return {
        success: true,
        result: data.analysis,
        toolName: 'prompt_understanding'
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        toolName: 'prompt_understanding'
      }
    }
  }
}

// 싱글톤 MCP 클라이언트
let globalMCPClient: HTTPMCPClient | null = null

export function getMCPClient(): HTTPMCPClient {
  if (!globalMCPClient) {
    globalMCPClient = new HTTPMCPClient()
  }
  return globalMCPClient
}

// AWS 관련 도구들을 위한 헬퍼 함수들
export class AWSMCPHelper {
  private mcpClient: HTTPMCPClient

  constructor(mcpClient: HTTPMCPClient) {
    this.mcpClient = mcpClient
  }

  async analyzeAWSQuery(userQuery: string): Promise<any> {
    console.log('🔍 AWS 쿼리 분석 시작:', userQuery)
    
    // 1. 프롬프트 이해 도구로 쿼리 분석
    const analysisResult = await this.mcpClient.analyzePrompt(
      `사용자가 다음과 같이 질문했습니다: "${userQuery}"\\n\\n` +
      `이 질문이 AWS 리소스 조회와 관련된 것인지 분석하고, 다음 중 어떤 AWS 서비스와 관련되는지 판단해주세요:\\n` +
      `- EC2 (인스턴스, 서버)\\n` +
      `- S3 (버킷, 스토리지)\\n` +
      `- 계정 정보 (account, identity)\\n` +
      `- 기타 AWS 서비스\\n\\n` +
      `응답은 JSON 형식으로 해주세요: {"service": "ec2|s3|account|other", "confidence": 0.9, "reasoning": "이유"}`
    )

    if (!analysisResult.success) {
      console.warn('⚠️ 프롬프트 분석 실패, 폴백 로직 사용')
      return this.fallbackAnalysis(userQuery)
    }

    try {
      // MCP 서버의 응답에서 JSON 부분 추출
      const content = analysisResult.result?.content?.[0]?.text || analysisResult.result || ''
      console.log('📋 MCP 분석 원본:', content)
      
      // JSON 추출 시도
      let analysis = this.extractJSON(content)
      
      if (!analysis) {
        console.warn('⚠️ JSON 추출 실패, 폴백 로직 사용')
        return this.fallbackAnalysis(userQuery)
      }

      console.log('✅ AWS 쿼리 분석 완료:', analysis)
      return analysis
    } catch (error) {
      console.error('❌ MCP 응답 파싱 실패:', error)
      return this.fallbackAnalysis(userQuery)
    }
  }

  private extractJSON(text: string): any {
    try {
      // 다양한 JSON 추출 시도
      const patterns = [
        /```json\\s*([\\s\\S]*?)\\s*```/g,
        /```\\s*([\\s\\S]*?)\\s*```/g,
        /{[\\s\\S]*}/g
      ]

      for (const pattern of patterns) {
        const matches = text.match(pattern)
        if (matches) {
          for (const match of matches) {
            try {
              const cleaned = match.replace(/```json|```/g, '').trim()
              return JSON.parse(cleaned)
            } catch (e) {
              continue
            }
          }
        }
      }

      // 직접 JSON 파싱 시도
      return JSON.parse(text.trim())
    } catch (error) {
      return null
    }
  }

  private fallbackAnalysis(userQuery: string): any {
    const query = userQuery.toLowerCase()
    
    if (query.includes('ec2') || query.includes('인스턴스') || query.includes('서버')) {
      return {
        service: 'ec2',
        confidence: 0.8,
        reasoning: 'EC2 관련 키워드 감지 (폴백)'
      }
    }
    
    if (query.includes('s3') || query.includes('버킷') || query.includes('스토리지')) {
      return {
        service: 's3',
        confidence: 0.8,
        reasoning: 'S3 관련 키워드 감지 (폴백)'
      }
    }
    
    if (query.includes('계정') || query.includes('account')) {
      return {
        service: 'account',
        confidence: 0.8,
        reasoning: '계정 관련 키워드 감지 (폴백)'
      }
    }

    return {
      service: 'other',
      confidence: 0.3,
      reasoning: 'AWS 관련 키워드를 찾을 수 없음 (폴백)'
    }
  }
}

export function getAWSMCPHelper(): AWSMCPHelper {
  return new AWSMCPHelper(getMCPClient())
}
