import { NextRequest, NextResponse } from 'next/server'
import { MCPAWSCredentials, mcpCredentialManager } from '../../../lib/mcp-credential-manager'
import { pureMCPClient } from '../../../lib/pure-mcp-client'

export interface VerifyAWSMCPRequest {
  name?: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

export interface VerifyAWSMCPResponse {
  success: boolean
  accountId?: string
  arn?: string
  userId?: string
  region?: string
  error?: string
  code?: string
}

/**
 * AWS Credential Verification via MCP
 * Pure MCP-based credential verification, no direct AWS SDK
 */
export async function POST(request: NextRequest) {
  try {
    const body: VerifyAWSMCPRequest = await request.json()
    const { accessKeyId, secretAccessKey, region, sessionToken } = body

    // Validate input
    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({
        success: false,
        error: 'AWS 자격 증명이 필요합니다',
        code: 'MissingCredentials'
      }, { status: 400 })
    }

    // Prepare credentials for MCP
    const credentials: MCPAWSCredentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      region: region?.trim() || 'us-east-1',
      ...(sessionToken && { sessionToken: sessionToken.trim() })
    }

    // Validate credential format
    const validationErrors = mcpCredentialManager.validateCredentials(credentials)
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: validationErrors.join(', '),
        code: 'InvalidCredentialFormat'
      }, { status: 400 })
    }

    console.log('🔐 Verifying AWS credentials via MCP...')

    try {
      // Verify credentials through LLM + MCP
      const verificationResult = await pureMCPClient.verifyCredentials(credentials)

      if (verificationResult.success) {
        // Store credentials for session use
        mcpCredentialManager.setCredentials(credentials)

        // Extract account info from LLM response
        const accountInfo = extractAccountInfo(verificationResult.answer || '', verificationResult.data)

        console.log('✅ AWS credentials verified via MCP')

        const response: VerifyAWSMCPResponse = {
          success: true,
          accountId: accountInfo.accountId,
          arn: accountInfo.arn,
          userId: accountInfo.userId,
          region: credentials.region
        }

        return NextResponse.json(response)
      } else {
        console.error('❌ MCP credential verification failed:', verificationResult.error)

        const response: VerifyAWSMCPResponse = {
          success: false,
          error: verificationResult.error || 'AWS 자격 증명 검증 실패 (MCP)',
          code: 'MCPVerificationFailed'
        }

        return NextResponse.json(response, { status: 401 })
      }

    } catch (mcpError: any) {
      console.error('❌ MCP service error:', mcpError)

      // Check specific error types
      let errorMessage = 'MCP 서버 연동 중 오류가 발생했습니다'
      let errorCode = 'MCPServiceError'

      if (mcpError.message?.includes('ECONNREFUSED')) {
        errorMessage = 'MCP 서버에 연결할 수 없습니다. MCP 서버가 실행 중인지 확인해주세요.'
        errorCode = 'MCPServerUnavailable'
      } else if (mcpError.message?.includes('timeout')) {
        errorMessage = 'MCP 서버 응답 시간이 초과되었습니다'
        errorCode = 'MCPTimeout'
      } else if (mcpError.message?.includes('InvalidAccessKeyId')) {
        errorMessage = 'AWS Access Key ID가 올바르지 않습니다'
        errorCode = 'InvalidAccessKeyId'
      } else if (mcpError.message?.includes('SignatureDoesNotMatch')) {
        errorMessage = 'AWS Secret Access Key가 올바르지 않습니다'
        errorCode = 'InvalidSecretKey'
      } else if (mcpError.message?.includes('TokenRefreshRequired')) {
        errorMessage = 'AWS 세션 토큰이 만료되었습니다. 새로운 임시 자격증명이 필요합니다.'
        errorCode = 'TokenExpired'
      }

      const response: VerifyAWSMCPResponse = {
        success: false,
        error: errorMessage,
        code: errorCode
      }

      return NextResponse.json(response, { status: 500 })
    }

  } catch (error: any) {
    console.error('❌ API route error:', error)

    const response: VerifyAWSMCPResponse = {
      success: false,
      error: '요청 처리 중 오류가 발생했습니다',
      code: 'InternalError'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * Extract account information from LLM response
 */
function extractAccountInfo(answer: string, data?: any): {
  accountId?: string
  arn?: string
  userId?: string
} {
  const result: { accountId?: string; arn?: string; userId?: string } = {}

  // Try to extract from structured data first
  if (data) {
    result.accountId = data.accountId || data.Account
    result.arn = data.arn || data.Arn
    result.userId = data.userId || data.UserId
  }

  // If not found in data, try to extract from answer text
  if (!result.accountId && answer) {
    const accountIdMatch = answer.match(/(?:계정|Account).*?ID.*?[:：]\s*([0-9]{12})/i)
    if (accountIdMatch) {
      result.accountId = accountIdMatch[1]
    }
  }

  if (!result.arn && answer) {
    const arnMatch = answer.match(/arn:aws[^:\s]*:[^:\s]*:[^:\s]*:[^:\s]*:[^\s]+/i)
    if (arnMatch) {
      result.arn = arnMatch[0]
    }
  }

  return result
}