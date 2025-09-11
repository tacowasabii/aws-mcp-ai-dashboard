import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { EC2Client } from '@aws-sdk/client-ec2'
import { S3Client } from '@aws-sdk/client-s3'

export interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region?: string
}

export interface AWSClientConfig {
  credentials: {
    accessKeyId: string
    secretAccessKey: string
  }
  region: string
}

export const createAWSConfig = (credentials: AWSCredentials): AWSClientConfig => {
  return {
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey
    },
    region: credentials.region || 'us-east-1'
  }
}

export const createSTSClient = (credentials: AWSCredentials): STSClient => {
  const config = createAWSConfig(credentials)
  return new STSClient(config)
}

export const createEC2Client = (credentials: AWSCredentials): EC2Client => {
  const config = createAWSConfig(credentials)
  return new EC2Client(config)
}

export const createS3Client = (credentials: AWSCredentials): S3Client => {
  const config = createAWSConfig(credentials)
  return new S3Client(config)
}

export const verifyAWSCredentials = async (credentials: AWSCredentials) => {
  try {
    const client = createSTSClient(credentials)
    const command = new GetCallerIdentityCommand({})
    const result = await client.send(command)
    
    return {
      success: true,
      accountId: result.Account,
      arn: result.Arn,
      userId: result.UserId,
      region: credentials.region || 'us-east-1'
    }
  } catch (error) {
    console.error('AWS credentials verification failed:', error)
    
    return {
      success: false,
      error: error.message || 'AWS 자격 증명 검증 실패',
      code: error.Code || error.name || 'UnknownError'
    }
  }
}

// 환경변수에서 기본 AWS 클라이언트 생성 (Bedrock용)
export const createDefaultAWSClient = (region: string = 'us-east-1') => {
  // 환경변수에서 자격증명을 읽어옴 (서버측에서만 사용)
  return new STSClient({
    region,
    // AWS SDK가 자동으로 환경변수나 IAM 역할에서 자격증명을 찾음
  })
}
