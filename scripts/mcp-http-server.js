#!/usr/bin/env node
/**
 * AWS MCP 서버를 HTTP API로 래핑하는 서버
 * 사용법: node scripts/mcp-http-server.js
 */

const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const { v4: uuidv4 } = require('uuid')

const app = express()
const port = process.env.MCP_HTTP_PORT || 3001

app.use(cors())
app.use(express.json())

// MCP 서버 프로세스
let mcpServerProcess = null
let isServerReady = false
let pendingRequests = new Map()

// AWS MCP 서버 시작
function startMCPServer() {
  console.log('🚀 AWS MCP 서버 시작 중...')
  
  mcpServerProcess = spawn('uvx', ['awslabs.core-mcp-server@latest'], {
    env: {
      ...process.env,
      FASTMCP_LOG_LEVEL: 'ERROR',
      'aws-foundation': 'true',
      'solutions-architect': 'true'
    },
    stdio: ['pipe', 'pipe', 'inherit']
  })

  let buffer = ''
  
  // 서버 응답 처리
  mcpServerProcess.stdout.on('data', (data) => {
    buffer += data.toString()
    const lines = buffer.split('\\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line.trim())
          console.log('📥 MCP 응답:', JSON.stringify(message, null, 2))
          
          // 응답 ID에 해당하는 대기 중인 요청 찾기
          if (message.id && pendingRequests.has(message.id)) {
            const { resolve } = pendingRequests.get(message.id)
            pendingRequests.delete(message.id)
            resolve(message)
          }
        } catch (error) {
          console.warn('⚠️ MCP 메시지 파싱 실패:', line)
        }
      }
    }
  })

  mcpServerProcess.on('error', (error) => {
    console.error('❌ MCP 서버 에러:', error)
  })

  mcpServerProcess.on('close', (code) => {
    console.log(`🔚 MCP 서버 종료 (코드: ${code})`)
    isServerReady = false
  })

  // 서버 초기화
  setTimeout(async () => {
    try {
      console.log('🔧 MCP 서버 초기화 중...')
      const initResult = await sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'aws-mcp-ai-dashboard', version: '1.0.0' }
      })
      console.log('✅ MCP 서버 초기화 완료:', initResult)
      isServerReady = true
    } catch (error) {
      console.error('❌ MCP 서버 초기화 실패:', error)
    }
  }, 2000)
}

// MCP 요청 전송
async function sendMCPRequest(method, params = {}, timeout = 30000) {
  return new Promise((resolve, reject) => {
    if (!mcpServerProcess) {
      reject(new Error('MCP 서버가 실행되지 않음'))
      return
    }

    const id = uuidv4()
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    }

    // 대기 중인 요청에 추가
    pendingRequests.set(id, { resolve, reject })
    
    // 타임아웃 설정
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error(`요청 타임아웃: ${method}`))
      }
    }, timeout)

    // 요청 전송
    console.log('📤 MCP 요청:', JSON.stringify(request))
    mcpServerProcess.stdin.write(JSON.stringify(request) + '\\n')
  })
}

// API 엔드포인트들
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mcpServerReady: isServerReady,
    timestamp: new Date().toISOString()
  })
})

app.get('/tools', async (req, res) => {
  try {
    if (!isServerReady) {
      return res.status(503).json({ error: 'MCP 서버가 준비되지 않음' })
    }

    const result = await sendMCPRequest('tools/list')
    res.json({ tools: result.result?.tools || [] })
  } catch (error) {
    console.error('❌ 도구 목록 조회 실패:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/tools/call', async (req, res) => {
  try {
    if (!isServerReady) {
      return res.status(503).json({ error: 'MCP 서버가 준비되지 않음' })
    }

    const { name, arguments: args = {} } = req.body
    
    if (!name) {
      return res.status(400).json({ error: '도구 이름이 필요합니다' })
    }

    console.log(`🔧 도구 호출: ${name}`, args)
    const result = await sendMCPRequest('tools/call', { name, arguments: args })
    
    res.json({ 
      success: true,
      result: result.result,
      toolName: name
    })
  } catch (error) {
    console.error(`❌ 도구 호출 실패:`, error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      toolName: req.body.name
    })
  }
})

app.post('/prompt/analyze', async (req, res) => {
  try {
    if (!isServerReady) {
      return res.status(503).json({ error: 'MCP 서버가 준비되지 않음' })
    }

    const { prompt } = req.body
    
    if (!prompt) {
      return res.status(400).json({ error: '프롬프트가 필요합니다' })
    }

    console.log('🔍 프롬프트 분석:', prompt)
    const result = await sendMCPRequest('tools/call', { 
      name: 'prompt_understanding', 
      arguments: { prompt } 
    })
    
    res.json({ 
      success: true,
      analysis: result.result,
      prompt
    })
  } catch (error) {
    console.error('❌ 프롬프트 분석 실패:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      prompt: req.body.prompt
    })
  }
})

// 서버 시작
app.listen(port, () => {
  console.log(`🌐 MCP HTTP 서버가 포트 ${port}에서 실행 중`)
  startMCPServer()
})

// 정리
process.on('SIGINT', () => {
  console.log('\\n🛑 서버 종료 중...')
  if (mcpServerProcess) {
    mcpServerProcess.kill()
  }
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\\n🛑 서버 종료 중...')
  if (mcpServerProcess) {
    mcpServerProcess.kill()
  }
  process.exit(0)
})
