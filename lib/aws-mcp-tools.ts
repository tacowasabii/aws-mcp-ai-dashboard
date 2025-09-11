import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  AWSCredentials,
  MCPTool,
  EC2Instance,
  S3Bucket,
  AWSAccountInfo,
} from "../types";
import { createAWSConfig } from "./aws-client";

export type { AWSCredentials };

export const AWS_MCP_TOOLS: MCPTool[] = [
  {
    name: "describe_ec2_instances",
    description: "List and describe EC2 instances in the current AWS account",
    inputSchema: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "AWS region to query (optional, defaults to us-east-1)",
        },
      },
      required: [],
    },
  },
  {
    name: "list_s3_buckets",
    description: "List all S3 buckets in the current AWS account",
    inputSchema: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "AWS region to query (optional, defaults to us-east-1)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_account_info",
    description: "Get AWS account information and caller identity",
    inputSchema: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "AWS region to query (optional, defaults to us-east-1)",
        },
      },
      required: [],
    },
  },
];

export class AWSMCPClient {
  private credentials: AWSCredentials;

  constructor(credentials: AWSCredentials) {
    this.credentials = credentials;
    console.log("🔐 AWSMCPClient 초기화:", {
      region: credentials.region || "us-east-1",
      hasAccessKey: !!credentials.accessKeyId,
      hasSecretKey: !!credentials.secretAccessKey,
    });
  }

  private getAWSConfig(region?: string) {
    const config = createAWSConfig({
      ...this.credentials,
      region: region || this.credentials.region || "us-east-1",
    });
    console.log("⚙️ AWS 설정:", { region: config.region });
    return config;
  }

  async callTool(toolName: string, parameters: any = {}): Promise<any> {
    console.log(`🛠️ MCP 도구 호출: ${toolName}`, parameters);

    const region = parameters.region || this.credentials.region || "us-east-1";
    const awsConfig = this.getAWSConfig(region);

    try {
      switch (toolName) {
        case "describe_ec2_instances":
          console.log("🖥️ EC2 인스턴스 조회 시작...");
          return await this.describeEC2Instances(awsConfig);

        case "list_s3_buckets":
          console.log("🗂️ S3 버킷 조회 시작...");
          return await this.listS3Buckets(awsConfig);

        case "get_account_info":
          console.log("👤 계정 정보 조회 시작...");
          return await this.getAccountInfo(awsConfig);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error: any) {
      console.error(`❌ ${toolName} 실행 실패:`, error);
      throw error;
    }
  }

  private async describeEC2Instances(
    awsConfig: any
  ): Promise<{ count: number; instances: EC2Instance[] }> {
    try {
      console.log("🔄 EC2Client 생성 중...");
      const ec2Client = new EC2Client(awsConfig);

      console.log("📡 DescribeInstances API 호출 중...");
      const command = new DescribeInstancesCommand({});
      const response = await ec2Client.send(command);

      console.log("✅ EC2 API 응답 수신:", {
        reservationsCount: response.Reservations?.length || 0,
      });

      const instances =
        response.Reservations?.flatMap((r) => r.Instances) || [];
      console.log(`📊 총 ${instances.length}개 인스턴스 발견`);

      const result = {
        count: instances.length,
        instances: instances.map((instance) => {
          const instanceData = {
            instanceId: instance.InstanceId || "",
            name:
              instance.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A",
            state: instance.State?.Name || "unknown",
            instanceType: instance.InstanceType || "unknown",
            availabilityZone: instance.Placement?.AvailabilityZone || "unknown",
            publicIpAddress: instance.PublicIpAddress,
            privateIpAddress: instance.PrivateIpAddress,
            launchTime: instance.LaunchTime,
          };
          console.log("📋 인스턴스 데이터:", instanceData);
          return instanceData;
        }),
      };

      console.log("✅ EC2 조회 완료");
      return result;
    } catch (error: any) {
      console.error("❌ EC2 조회 실패:", {
        message: error.message,
        code: error.Code,
        statusCode: error.$metadata?.httpStatusCode,
      });
      throw error;
    }
  }

  private async listS3Buckets(
    awsConfig: any
  ): Promise<{ count: number; buckets: S3Bucket[] }> {
    try {
      console.log("🔄 S3Client 생성 중...");
      const s3Client = new S3Client(awsConfig);

      console.log("📡 ListBuckets API 호출 중...");
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);

      console.log("✅ S3 API 응답 수신:", {
        bucketsCount: response.Buckets?.length || 0,
      });

      const buckets = response.Buckets || [];
      console.log(`📊 총 ${buckets.length}개 버킷 발견`);

      const result = {
        count: buckets.length,
        buckets: buckets.map((bucket) => {
          const bucketData = {
            name: bucket.Name || "",
            creationDate: bucket.CreationDate,
          };
          console.log("📋 버킷 데이터:", bucketData);
          return bucketData;
        }),
      };

      console.log("✅ S3 조회 완료");
      return result;
    } catch (error: any) {
      console.error("❌ S3 조회 실패:", {
        message: error.message,
        code: error.Code,
        statusCode: error.$metadata?.httpStatusCode,
      });
      throw error;
    }
  }

  private async getAccountInfo(awsConfig: any): Promise<AWSAccountInfo> {
    try {
      console.log("🔄 STSClient 생성 중...");
      const stsClient = new STSClient(awsConfig);

      console.log("📡 GetCallerIdentity API 호출 중...");
      const command = new GetCallerIdentityCommand({});
      const response = await stsClient.send(command);

      console.log("✅ STS API 응답 수신:", {
        hasAccount: !!response.Account,
        hasArn: !!response.Arn,
      });

      const result = {
        accountId: response.Account || "",
        userId: response.UserId || "",
        arn: response.Arn || "",
        region: awsConfig.region,
      };

      console.log("📋 계정 정보:", result);
      console.log("✅ 계정 정보 조회 완료");
      return result;
    } catch (error: any) {
      console.error("❌ 계정 정보 조회 실패:", {
        message: error.message,
        code: error.Code,
        statusCode: error.$metadata?.httpStatusCode,
      });
      throw error;
    }
  }
}
