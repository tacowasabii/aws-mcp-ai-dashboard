/**
 * Pure MCP-based AWS Client
 * All AWS operations go through MCP server, no direct AWS SDK usage
 */

import { MCPAWSCredentials } from './mcp-credential-manager'

export interface MCPResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
}

export interface MCPAWSQueryRequest {
  query: string
  credentials: MCPAWSCredentials
  toolName?: string
  parameters?: Record<string, any>
}

export interface MCPHealthCheck {
  healthy: boolean
  version?: string
  availableTools?: string[]
}

/**
 * Pure MCP-based AWS operations client
 * No direct AWS SDK usage - everything goes through MCP server
 */
export class MCPAWSClient {
  private mcpServerUrl: string

  constructor(mcpServerUrl: string = 'http://localhost:3001') {
    this.mcpServerUrl = mcpServerUrl
  }

  /**
   * Check MCP server health and available tools
   */
  async checkHealth(): Promise<MCPHealthCheck> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        return { healthy: false }
      }

      const data = await response.json()
      return {
        healthy: true,
        version: data.version,
        availableTools: data.tools || []
      }
    } catch (error) {
      console.error('MCP Health check failed:', error)
      return { healthy: false }
    }
  }

  /**
   * Send natural language query to LLM via MCP
   */
  async queryAWSResources(request: MCPAWSQueryRequest): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: request.query,
          credentials: {
            AWS_ACCESS_KEY_ID: request.credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: request.credentials.secretAccessKey,
            AWS_REGION: request.credentials.region,
            ...(request.credentials.sessionToken && {
              AWS_SESSION_TOKEN: request.credentials.sessionToken
            })
          },
          toolName: request.toolName,
          parameters: request.parameters
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      return {
        success: true,
        data: data.result || data.data,
        message: data.message
      }
    } catch (error) {
      console.error('MCP AWS query failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Verify AWS credentials through MCP server
   */
  async verifyCredentials(credentials: MCPAWSCredentials): Promise<MCPResponse> {
    try {
      const response = await this.queryAWSResources({
        query: "Verify my AWS credentials and show account information",
        credentials,
        toolName: "aws_sts_get_caller_identity"
      })

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credential verification failed'
      }
    }
  }

  /**
   * List AWS resources with natural language
   */
  async listResources(credentials: MCPAWSCredentials, resourceType: string): Promise<MCPResponse> {
    const queries: Record<string, string> = {
      'ec2': 'List all EC2 instances with their status and details',
      's3': 'List all S3 buckets with creation dates',
      'iam': 'Show IAM user and role information',
      'vpc': 'List VPCs and networking configuration',
      'rds': 'Show RDS databases and their status',
      'lambda': 'List Lambda functions and their configurations'
    }

    const query = queries[resourceType.toLowerCase()] ||
                  `List all ${resourceType} resources in my AWS account`

    return await this.queryAWSResources({
      query,
      credentials
    })
  }

  /**
   * Get resource details with natural language
   */
  async getResourceDetails(
    credentials: MCPAWSCredentials,
    resourceId: string,
    resourceType: string
  ): Promise<MCPResponse> {
    const query = `Get detailed information about ${resourceType} ${resourceId}`

    return await this.queryAWSResources({
      query,
      credentials
    })
  }

  /**
   * Execute custom AWS query through LLM + MCP
   */
  async executeCustomQuery(credentials: MCPAWSCredentials, query: string): Promise<MCPResponse> {
    return await this.queryAWSResources({
      query,
      credentials
    })
  }

  /**
   * Get cost and billing information
   */
  async getCostAnalysis(credentials: MCPAWSCredentials, period: string = 'last-month'): Promise<MCPResponse> {
    const query = `Show AWS cost analysis and billing information for ${period}`

    return await this.queryAWSResources({
      query,
      credentials
    })
  }

  /**
   * Get security and compliance status
   */
  async getSecurityStatus(credentials: MCPAWSCredentials): Promise<MCPResponse> {
    const query = 'Analyze AWS security configuration and show potential issues'

    return await this.queryAWSResources({
      query,
      credentials
    })
  }
}

// Default instance
export const mcpAWSClient = new MCPAWSClient()