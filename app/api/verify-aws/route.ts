import { NextRequest, NextResponse } from 'next/server'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'

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

    console.log('🔐 Verifying AWS credentials via direct AWS SDK...')

    const stsClient = new STSClient({
      region: region?.trim() || 'us-east-1',
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        ...(sessionToken && { sessionToken: sessionToken.trim() })
      }
    })

    try {
      // AWS STS GetCallerIdentity를 통한 자격증명 검증
      const command = new GetCallerIdentityCommand({})
      const result = await stsClient.send(command)

      console.log('✅ AWS credentials verified via direct SDK')

      return NextResponse.json({
        success: true,
        account: result.Account,
        accountId: result.Account,
        arn: result.Arn,
        userId: result.UserId,
        region: region?.trim() || 'us-east-1'
      })

    } catch (awsError: any) {
      console.error('❌ AWS credential verification failed:', awsError)

      // AWS 에러 타입별 처리
      let errorMessage = 'AWS 자격 증명 검증 실패'
      let errorCode = awsError.name || 'AWSVerificationFailed'

      if (awsError.name === 'InvalidAccessKeyId') {
        errorMessage = 'AWS Access Key ID가 올바르지 않습니다'
      } else if (awsError.name === 'SignatureDoesNotMatch') {
        errorMessage = 'AWS Secret Access Key가 올바르지 않습니다'
      } else if (awsError.name === 'TokenRefreshRequired') {
        errorMessage = 'AWS 세션 토큰이 만료되었습니다'
      } else if (awsError.name === 'AccessDenied') {
        errorMessage = 'AWS 자격 증명에 sts:GetCallerIdentity 권한이 없습니다'
      } else if (awsError.message) {
        errorMessage = awsError.message
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: errorCode
      }, { status: 400 })
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

