import { NextRequest, NextResponse } from 'next/server'
import { pureMCPClient } from '../../../lib/pure-mcp-client'
import { MCPAWSCredentials } from '../../../lib/mcp-credential-manager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 기존 형식과 호환성 유지
    const credentials = body.credentials || body
    const { accessKeyId, secretAccessKey, region, sessionToken } = credentials

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({
        success: false,
        error: 'AWS 자격 증명이 필요합니다'
      }, { status: 400 })
    }

    console.log('🔐 Verifying AWS credentials via LLM + MCP...')

    // MCP 자격증명 형식으로 변환
    const mcpCredentials: MCPAWSCredentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      region: region?.trim() || 'us-east-1',
      ...(sessionToken && { sessionToken: sessionToken.trim() })
    }

    try {
      // LLM + MCP를 통한 자격증명 검증
      const verificationResult = await pureMCPClient.verifyCredentials(mcpCredentials)

      if (verificationResult.success) {
        console.log('✅ AWS credentials verified via LLM + MCP')

        // LLM 응답에서 계정 정보 추출
        const accountInfo = extractAccountInfoFromLLMResponse(
          verificationResult.answer || '',
          verificationResult.data
        )

        return NextResponse.json({
          success: true,
          account: accountInfo.accountId,
          accountId: accountInfo.accountId, // 호환성
          arn: accountInfo.arn,
          userId: accountInfo.userId,
          region: mcpCredentials.region
        })
      } else {
        console.error('❌ LLM + MCP credential verification failed:', verificationResult.error)

        return NextResponse.json({
          success: false,
          error: verificationResult.error || 'AWS 자격 증명 검증 실패 (LLM + MCP)',
          code: 'LLMMCPVerificationFailed'
        }, { status: 400 })
      }

    } catch (mcpError: any) {
      console.error('❌ LLM + MCP service error:', mcpError)

      // 특정 에러 타입 처리
      let errorMessage = 'LLM + MCP 서비스 연동 중 오류가 발생했습니다'
      let errorCode = 'LLMMCPServiceError'

      if (mcpError.message?.includes('ECONNREFUSED')) {
        errorMessage = 'LLM 서비스에 연결할 수 없습니다'
        errorCode = 'LLMServiceUnavailable'
      } else if (mcpError.message?.includes('timeout')) {
        errorMessage = 'LLM 서비스 응답 시간이 초과되었습니다'
        errorCode = 'LLMTimeout'
      } else if (mcpError.message?.includes('API 키')) {
        errorMessage = 'LLM API 키가 설정되지 않았습니다'
        errorCode = 'LLMAPIKeyMissing'
      } else if (mcpError.message?.includes('InvalidAccessKeyId')) {
        errorMessage = 'AWS Access Key ID가 올바르지 않습니다'
        errorCode = 'InvalidAccessKeyId'
      } else if (mcpError.message?.includes('SignatureDoesNotMatch')) {
        errorMessage = 'AWS Secret Access Key가 올바르지 않습니다'
        errorCode = 'InvalidSecretKey'
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: errorCode
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('❌ API route error:', error)

    return NextResponse.json({
      success: false,
      error: '요청 처리 중 오류가 발생했습니다',
      code: error.Code || error.name || 'UnknownError'
    }, { status: 500 })
  }
}

/**
 * LLM 응답에서 AWS 계정 정보 추출
 */
function extractAccountInfoFromLLMResponse(
  answer: string,
  data?: any
): { accountId?: string; arn?: string; userId?: string } {
  const result: { accountId?: string; arn?: string; userId?: string } = {}

  // 구조화된 데이터에서 먼저 추출 시도
  if (data) {
    result.accountId = data.accountId || data.Account || data.account_id
    result.arn = data.arn || data.Arn
    result.userId = data.userId || data.UserId || data.user_id
  }

  // 텍스트 응답에서 정규식으로 추출
  if (!result.accountId && answer) {
    // 12자리 계정 ID 패턴
    const accountIdMatch = answer.match(/(?:계정|Account|account).*?ID.*?[:：]\s*([0-9]{12})|([0-9]{12})/i)
    if (accountIdMatch) {
      result.accountId = accountIdMatch[1] || accountIdMatch[2]
    }
  }

  if (!result.arn && answer) {
    // AWS ARN 패턴
    const arnMatch = answer.match(/(arn:aws[^:\s]*:[^:\s]*:[^:\s]*:[^:\s]*:[^\s]+)/i)
    if (arnMatch) {
      result.arn = arnMatch[1]
    }
  }

  if (!result.userId && answer) {
    // User ID 패턴 (AIDA, AROA 등으로 시작)
    const userIdMatch = answer.match(/(?:사용자|User|user).*?ID.*?[:：]\s*([A-Z0-9]+)|(?:AIDA|AROA|ASCA)([A-Z0-9]+)/i)
    if (userIdMatch) {
      result.userId = userIdMatch[1] || ('A' + userIdMatch[2])
    }
  }

  return result
}