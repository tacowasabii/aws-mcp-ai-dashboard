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

export const verifyAWSCredentials = async (credentials: AWSCredentials) => {
  try {
    const config = createAWSConfig(credentials)
    const client = new STSClient(config)
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
  }

  private getAWSConfig(region?: string) {
    return createAWSConfig({
      ...this.credentials,
      region: region || this.credentials.region || "us-east-1",
    });
  }

  async callTool(toolName: string, parameters: any = {}): Promise<any> {
    const region = parameters.region || this.credentials.region || "us-east-1";
    const awsConfig = this.getAWSConfig(region);

    switch (toolName) {
      case "describe_ec2_instances":
        return await this.describeEC2Instances(awsConfig);
      case "list_s3_buckets":
        return await this.listS3Buckets(awsConfig);
      case "get_account_info":
        return await this.getAccountInfo(awsConfig);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async describeEC2Instances(
    awsConfig: any
  ): Promise<{ count: number; instances: EC2Instance[] }> {
    const ec2Client = new EC2Client(awsConfig);
    const command = new DescribeInstancesCommand({});
    const response = await ec2Client.send(command);

    const instances = response.Reservations?.flatMap((r) => r.Instances) || [];

    return {
      count: instances.length,
      instances: instances.map((instance) => ({
        instanceId: instance.InstanceId || "",
        name: instance.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A",
        state: instance.State?.Name || "unknown",
        instanceType: instance.InstanceType || "unknown",
        availabilityZone: instance.Placement?.AvailabilityZone || "unknown",
        publicIpAddress: instance.PublicIpAddress,
        privateIpAddress: instance.PrivateIpAddress,
        launchTime: instance.LaunchTime,
      })),
    };
  }

  private async listS3Buckets(
    awsConfig: any
  ): Promise<{ count: number; buckets: S3Bucket[] }> {
    const s3Client = new S3Client(awsConfig);
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    const buckets = response.Buckets || [];

    return {
      count: buckets.length,
      buckets: buckets.map((bucket) => ({
        name: bucket.Name || "",
        creationDate: bucket.CreationDate,
      })),
    };
  }

  private async getAccountInfo(awsConfig: any): Promise<AWSAccountInfo> {
    const stsClient = new STSClient(awsConfig);
    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);

    return {
      accountId: response.Account || "",
      userId: response.UserId || "",
      arn: response.Arn || "",
      region: awsConfig.region,
    };
  }
}
