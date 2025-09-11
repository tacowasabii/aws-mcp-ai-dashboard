import { NextRequest, NextResponse } from 'next/server'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 두 가지 형식 모두 지원 (기존 호환성 유지)
    const credentials = body.credentials || body
    const { accessKeyId, secretAccessKey, region } = credentials
    
    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'AWS 자격 증명이 필요합니다' 
      }, { status: 400 })
    }
    
    const client = new STSClient({
      region: region || 'us-east-1',
      credentials: { accessKeyId, secretAccessKey }
    })
    
    const command = new GetCallerIdentityCommand({})
    const result = await client.send(command)
    
    return NextResponse.json({ 
      success: true, 
      account: result.Account,
      accountId: result.Account, // 호환성
      arn: result.Arn,
      userId: result.UserId,
      region: region || 'us-east-1'
    })
    
  } catch (error) {
    console.error('AWS verification failed:', error)
    
    let errorMessage = 'AWS 인증에 실패했습니다'
    
    if (error.name === 'CredentialsProviderError') {
      errorMessage = 'AWS 자격 증명이 올바르지 않습니다'
    } else if (error.message?.includes('InvalidUserID.NotFound')) {
      errorMessage = 'AWS 자격 증명이 유효하지 않습니다'
    } else if (error.message?.includes('SignatureDoesNotMatch')) {
      errorMessage = 'AWS Secret Key가 올바르지 않습니다'
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      code: error.Code || error.name || 'UnknownError'
    }, { status: 400 })
  }
}
