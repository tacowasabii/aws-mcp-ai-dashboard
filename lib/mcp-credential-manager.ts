/**
 * AWS MCP Credential Manager
 * Manages AWS credentials for MCP server authentication
 */

export interface MCPAWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
  sessionToken?: string
}

export interface MCPCredentialConfig {
  serverUrl: string
  credentials: MCPAWSCredentials
}

class MCPCredentialManager {
  private currentCredentials: MCPAWSCredentials | null = null
  private serverUrl: string = 'http://localhost:3001' // Default MCP server URL

  /**
   * Configure AWS credentials for MCP server
   */
  setCredentials(credentials: MCPAWSCredentials): void {
    this.currentCredentials = {
      ...credentials,
      region: credentials.region || 'us-east-1'
    }
  }

  /**
   * Get current MCP configuration
   */
  getConfig(): MCPCredentialConfig | null {
    if (!this.currentCredentials) {
      return null
    }

    return {
      serverUrl: this.serverUrl,
      credentials: this.currentCredentials
    }
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    return this.currentCredentials !== null
  }

  /**
   * Clear stored credentials
   */
  clearCredentials(): void {
    this.currentCredentials = null
  }

  /**
   * Get AWS environment variables for MCP server
   */
  getAWSEnvironmentVars(): Record<string, string> | null {
    if (!this.currentCredentials) {
      return null
    }

    const envVars: Record<string, string> = {
      AWS_ACCESS_KEY_ID: this.currentCredentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: this.currentCredentials.secretAccessKey,
      AWS_REGION: this.currentCredentials.region
    }

    if (this.currentCredentials.sessionToken) {
      envVars.AWS_SESSION_TOKEN = this.currentCredentials.sessionToken
    }

    return envVars
  }

  /**
   * Validate credentials format
   */
  validateCredentials(credentials: Partial<MCPAWSCredentials>): string[] {
    const errors: string[] = []

    if (!credentials.accessKeyId?.trim()) {
      errors.push('Access Key ID is required')
    } else if (!credentials.accessKeyId.match(/^AKIA[0-9A-Z]{16}$/)) {
      errors.push('Access Key ID format is invalid (should start with AKIA)')
    }

    if (!credentials.secretAccessKey?.trim()) {
      errors.push('Secret Access Key is required')
    } else if (credentials.secretAccessKey.length < 40) {
      errors.push('Secret Access Key appears to be too short')
    }

    if (!credentials.region?.trim()) {
      errors.push('Region is required')
    }

    return errors
  }

  /**
   * Set MCP server URL
   */
  setServerUrl(url: string): void {
    this.serverUrl = url
  }
}

// Singleton instance
export const mcpCredentialManager = new MCPCredentialManager()