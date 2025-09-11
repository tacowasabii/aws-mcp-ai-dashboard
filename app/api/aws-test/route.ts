import { NextRequest, NextResponse } from 'next/server'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credentials } = body
    
    if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
      return NextResponse.json(
        { error: 'AWS 자격 증명이 필요합니다' },
        { status: 400 }
      )
    }
    
    // STS를 사용하여 MCP용 AWS 연결 테스트
    const stsClient = new STSClient({
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      },
      region: credentials.region || 'us-east-1'
    })
    
    const command = new GetCallerIdentityCommand({})
    const response = await stsClient.send(command)
    
    return NextResponse.json({
      success: true,
      account: response.Account,
      arn: response.Arn,
      userId: response.UserId,
      region: credentials.region || 'us-east-1',
      purpose: 'MCP 자격증명 테스트 성공'
    })
    
  } catch (error) {
    console.error('MCP AWS 연결 테스트 실패:', error)
    
    let errorMessage = 'AWS 연결 실패'
    
    if (error.name === 'CredentialsProviderError') {
      errorMessage = 'AWS 자격 증명이 올바르지 않습니다'
    } else if (error.name === 'UnauthorizedOperation') {
      errorMessage = 'AWS 권한이 부족합니다'
    } else if (error.message?.includes('InvalidUserID.NotFound')) {
      errorMessage = 'AWS 자격 증명이 유효하지 않습니다'
    } else if (error.message?.includes('SignatureDoesNotMatch')) {
      errorMessage = 'AWS Secret Key가 올바르지 않습니다'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: error.Code || error.name || 'UnknownError',
        purpose: 'MCP 자격증명 테스트용'
      },
      { status: 500 }
    )
  }
}
