import { EC2Client, DescribeInstancesCommand, DescribeVpcsCommand, DescribeSubnetsCommand } from '@aws-sdk/client-ec2'
import { EKSClient, ListClustersCommand, DescribeClusterCommand } from '@aws-sdk/client-eks'
import { BedrockLLMClient, getBedrockConfig } from './bedrock-llm'

export interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

export interface AWSQueryResponse {
  success: boolean
  data?: any
  error?: string
  type?: 'ec2' | 'eks' | 'vpc' | 'general'
  usedLLM?: boolean
}

export class AWSDirectClient {
  private ec2Client: EC2Client | null = null
  private eksClient: EKSClient | null = null
  private llmClient: BedrockLLMClient | null = null

  constructor(private credentials: AWSCredentials) {
    this.ec2Client = new EC2Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    })

    this.eksClient = new EKSClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    })

    // Bedrock LLM 클라이언트 초기화
    const bedrockConfig = getBedrockConfig()
    if (bedrockConfig) {
      this.llmClient = new BedrockLLMClient(bedrockConfig)
    }
  }

  /**
   * 질문을 분석하여 적절한 AWS 서비스로 라우팅
   */
  async processQuery(query: string): Promise<AWSQueryResponse> {
    const queryLower = query.toLowerCase()

    try {
      // EC2 관련 질문 - SDK로 데이터 조회 후 LLM 분석
      if (queryLower.includes('ec2') || queryLower.includes('인스턴스') || queryLower.includes('서버')) {
        return await this.getEC2InstancesWithLLM(query)
      }

      // EKS 관련 질문 - SDK로 데이터 조회 후 LLM 분석
      if (queryLower.includes('eks') || queryLower.includes('클러스터') || queryLower.includes('쿠버네티스') || queryLower.includes('kubernetes')) {
        return await this.getEKSClustersWithLLM(query)
      }

      // VPC 관련 질문 - SDK로 데이터 조회 후 LLM 분석
      if (queryLower.includes('vpc') || queryLower.includes('네트워크') || queryLower.includes('서브넷') || queryLower.includes('subnet')) {
        return await this.getVPCInfoWithLLM(query)
      }

      // 일반적인 AWS 질문 - LLM이 직접 답변
      return await this.getGeneralAWSResponse(query)

    } catch (error: any) {
      console.error('AWS 질의 처리 오류:', error)
      return {
        success: false,
        error: `AWS 질의 처리 중 오류가 발생했습니다: ${error.message}`
      }
    }
  }

  /**
   * EC2 인스턴스 정보 조회 + LLM 분석
   */
  private async getEC2InstancesWithLLM(query: string): Promise<AWSQueryResponse> {
    try {
      // AWS SDK로 실제 데이터 조회
      const awsData = await this.getEC2InstancesRawData()

      // LLM으로 분석된 응답 생성
      const llmResponse = await this.getLLMResponse(query, awsData)

      return {
        success: true,
        data: llmResponse,
        type: 'ec2',
        usedLLM: true
      }
    } catch (error: any) {
      throw new Error(`EC2 인스턴스 조회 실패: ${error.message}`)
    }
  }

  /**
   * EKS 클러스터 정보 조회 + LLM 분석
   */
  private async getEKSClustersWithLLM(query: string): Promise<AWSQueryResponse> {
    try {
      // AWS SDK로 실제 데이터 조회
      const awsData = await this.getEKSClustersRawData()

      // LLM으로 분석된 응답 생성
      const llmResponse = await this.getLLMResponse(query, awsData)

      return {
        success: true,
        data: llmResponse,
        type: 'eks',
        usedLLM: true
      }
    } catch (error: any) {
      throw new Error(`EKS 클러스터 조회 실패: ${error.message}`)
    }
  }

  /**
   * VPC 정보 조회 + LLM 분석
   */
  private async getVPCInfoWithLLM(query: string): Promise<AWSQueryResponse> {
    try {
      // AWS SDK로 실제 데이터 조회
      const awsData = await this.getVPCInfoRawData()

      // LLM으로 분석된 응답 생성
      const llmResponse = await this.getLLMResponse(query, awsData)

      return {
        success: true,
        data: llmResponse,
        type: 'vpc',
        usedLLM: true
      }
    } catch (error: any) {
      throw new Error(`VPC 정보 조회 실패: ${error.message}`)
    }
  }

  /**
   * 일반적인 AWS 질문에 대한 LLM 응답
   */
  private async getGeneralAWSResponse(query: string): Promise<AWSQueryResponse> {
    try {
      const llmResponse = await this.getLLMResponse(query, null)

      return {
        success: true,
        data: llmResponse,
        type: 'general',
        usedLLM: true
      }
    } catch (error: any) {
      throw new Error(`일반 AWS 질문 처리 실패: ${error.message}`)
    }
  }

  /**
   * LLM 응답 생성 (Bedrock 또는 시뮬레이션)
   */
  private async getLLMResponse(query: string, awsData: any): Promise<string> {
    if (this.llmClient) {
      const response = awsData
        ? await this.llmClient.answerWithAWSData(query, this.credentials.region, awsData)
        : await this.llmClient.answerGeneralAWS(query, this.credentials.region)

      if (response.success) {
        return response.answer
      } else {
        console.warn('LLM 응답 실패, 시뮬레이션으로 폴백:', response.error)
      }
    }

    // LLM 사용 불가시 시뮬레이션 응답
    const fallbackClient = new BedrockLLMClient({
      region: 'us-east-1',
      accessKeyId: 'dummy',
      secretAccessKey: 'dummy',
      modelId: 'dummy'
    })

    const simResponse = fallbackClient.getSimulationResponse(query, this.credentials.region, awsData)
    return simResponse.answer
  }

  /**
   * EC2 인스턴스 원시 데이터 조회
   */
  private async getEC2InstancesRawData(): Promise<any> {
    try {
      const command = new DescribeInstancesCommand({})
      const response = await this.ec2Client!.send(command)

      const instances: any[] = []
      response.Reservations?.forEach(reservation => {
        reservation.Instances?.forEach(instance => {
          instances.push({
            instanceId: instance.InstanceId,
            instanceType: instance.InstanceType,
            state: instance.State?.Name,
            publicIp: instance.PublicIpAddress,
            privateIp: instance.PrivateIpAddress,
            launchTime: instance.LaunchTime,
            tags: instance.Tags?.reduce((acc, tag) => {
              if (tag.Key && tag.Value) {
                acc[tag.Key] = tag.Value
              }
              return acc
            }, {} as Record<string, string>)
          })
        })
      })

      return {
        totalInstances: instances.length,
        runningInstances: instances.filter(i => i.state === 'running').length,
        stoppedInstances: instances.filter(i => i.state === 'stopped').length,
        instances: instances
      }
    } catch (error: any) {
      throw new Error(`EC2 인스턴스 조회 실패: ${error.message}`)
    }
  }

  /**
   * EKS 클러스터 원시 데이터 조회
   */
  private async getEKSClustersRawData(): Promise<any> {
    try {
      const listCommand = new ListClustersCommand({})
      const listResponse = await this.eksClient!.send(listCommand)

      const clusters: any[] = []

      if (listResponse.clusters && listResponse.clusters.length > 0) {
        for (const clusterName of listResponse.clusters) {
          try {
            const describeCommand = new DescribeClusterCommand({ name: clusterName })
            const clusterDetail = await this.eksClient!.send(describeCommand)

            if (clusterDetail.cluster) {
              clusters.push({
                name: clusterDetail.cluster.name,
                status: clusterDetail.cluster.status,
                version: clusterDetail.cluster.version,
                endpoint: clusterDetail.cluster.endpoint,
                createdAt: clusterDetail.cluster.createdAt,
                roleArn: clusterDetail.cluster.roleArn,
                vpcConfig: clusterDetail.cluster.resourcesVpcConfig
              })
            }
          } catch (error) {
            console.warn(`클러스터 ${clusterName} 세부 정보 조회 실패:`, error)
          }
        }
      }

      return {
        totalClusters: clusters.length,
        activeClusters: clusters.filter(c => c.status === 'ACTIVE').length,
        clusters: clusters
      }
    } catch (error: any) {
      throw new Error(`EKS 클러스터 조회 실패: ${error.message}`)
    }
  }

  /**
   * VPC 정보 원시 데이터 조회
   */
  private async getVPCInfoRawData(): Promise<any> {
    try {
      const vpcCommand = new DescribeVpcsCommand({})
      const vpcResponse = await this.ec2Client!.send(vpcCommand)

      const subnetCommand = new DescribeSubnetsCommand({})
      const subnetResponse = await this.ec2Client!.send(subnetCommand)

      const vpcs = vpcResponse.Vpcs?.map(vpc => ({
        vpcId: vpc.VpcId,
        cidrBlock: vpc.CidrBlock,
        state: vpc.State,
        isDefault: vpc.IsDefault,
        tags: vpc.Tags?.reduce((acc, tag) => {
          if (tag.Key && tag.Value) {
            acc[tag.Key] = tag.Value
          }
          return acc
        }, {} as Record<string, string>)
      })) || []

      const subnets = subnetResponse.Subnets?.map(subnet => ({
        subnetId: subnet.SubnetId,
        vpcId: subnet.VpcId,
        cidrBlock: subnet.CidrBlock,
        availabilityZone: subnet.AvailabilityZone,
        state: subnet.State,
        tags: subnet.Tags?.reduce((acc, tag) => {
          if (tag.Key && tag.Value) {
            acc[tag.Key] = tag.Value
          }
          return acc
        }, {} as Record<string, string>)
      })) || []

      return {
        totalVPCs: vpcs.length,
        defaultVPCs: vpcs.filter(v => v.isDefault).length,
        totalSubnets: subnets.length,
        vpcs: vpcs,
        subnets: subnets
      }
    } catch (error: any) {
      throw new Error(`VPC 정보 조회 실패: ${error.message}`)
    }
  }

}