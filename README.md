# LLM + AWS MCP Dashboard

**Pure LLM + AWS MCP Integration**: AWS SDK 제거, 순수 LLM과 AWS MCP를 통한 자연어 AWS 관리 시스템

## 🚀 주요 기능

- 🤖 **순수 LLM + MCP 통합**: AWS SDK 완전 제거, LLM이 AWS MCP와 직접 통신
- 🧠 **자연어 AWS 관리**: 자연어 질문으로 모든 AWS 리소스 관리
- 🔐 **사용자 자격증명**: 사용자가 직접 입력하는 AWS 자격증명으로 안전한 운영
- 🌐 **LLM 유연성**: OpenAI GPT 또는 Anthropic Claude 선택 가능
- 📊 **지능적 분석**: LLM이 AWS 상태를 분석하고 인사이트 제공
- 🚫 **No AWS SDK**: 모든 AWS 작업이 LLM + MCP를 통해 처리

## 🔄 새로운 아키텍처

### 기존 (AWS SDK 직접 사용)
```
사용자 질문 → AWS SDK → AWS API → 응답
```

### 새로운 (LLM + MCP 통합)
```
사용자 질문 → LLM → AWS MCP Server → AWS API → LLM 분석 → 지능적 응답
```

## 🏗️ 시스템 구성

1. **Frontend**: React/Next.js 대시보드
2. **LLM Layer**: OpenAI GPT 또는 Anthropic Claude
3. **MCP Bridge**: AWS MCP 서버와의 통신 레이어
4. **AWS Resources**: MCP를 통한 AWS 리소스 접근

## 📋 설치 및 설정

### 1️⃣ **환경변수 설정**

`.env.local` 파일 생성 후 LLM API 키 설정:

```bash
# OpenAI 사용 시
OPENAI_API_KEY=sk-your-openai-api-key-here

# 또는 Anthropic 사용 시
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# AWS MCP 서버 URL (선택사항)
AWS_MCP_SERVER_URL=http://localhost:3001
```

### 2️⃣ **의존성 설치**
```bash
npm install
```

### 3️⃣ **애플리케이션 실행**
```bash
npm run dev
```

### 4️⃣ **AWS 계정 추가**
- 브라우저에서 http://localhost:3000 접속
- 대시보드에서 "AWS 계정 추가" 클릭
- AWS 자격증명 입력 (Access Key ID, Secret Access Key, Region)
- LLM + MCP를 통한 자격증명 검증 완료

## 🔑 필요한 AWS 권한

사용자가 입력하는 AWS 자격증명에는 다음 권한이 필요합니다:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeImages",
        "ec2:DescribeSecurityGroups",
        "s3:ListBuckets",
        "s3:GetBucketLocation",
        "sts:GetCallerIdentity",
        "iam:GetUser",
        "iam:ListRoles",
        "pricing:GetProducts"
      ],
      "Resource": "*"
    }
  ]
}
```

## 💬 사용 예시

### 자연어 질문 예시:
- "현재 실행 중인 EC2 인스턴스는 몇 개야?"
- "S3 버킷 목록과 각각의 크기를 알려줘"
- "내 AWS 계정 정보와 권한을 확인해줘"
- "비용이 가장 많이 나오는 서비스가 뭐야?"
- "보안 그룹 설정에서 위험한 부분이 있어?"
- "us-west-2 리전의 리소스 현황을 분석해줘"

### LLM 응답 예시:
```
🖥️ EC2 인스턴스 현황 분석

현재 AWS 계정에서 총 3개의 EC2 인스턴스가 실행 중입니다:

✅ 실행 중 (2개):
- i-1234567890abcdef0 (t3.medium) - 웹서버
- i-0987654321fedcba0 (t3.large) - 데이터베이스

⏸️ 중지됨 (1개):
- i-1111222233334444 (t2.micro) - 테스트 서버

💡 권장사항:
- 중지된 t2.micro 인스턴스는 불필요시 삭제를 고려하세요
- 웹서버의 CPU 사용률이 낮다면 t3.small로 다운사이징 가능합니다

이 분석은 LLM + AWS MCP를 통해 실시간으로 수집된 데이터를 기반으로 합니다.
```

## 🔗 API 엔드포인트

### `/api/llm-mcp-query` - LLM + MCP 통합 쿼리
```typescript
// 요청
{
  "query": "EC2 인스턴스 현황을 분석해줘",
  "credentials": {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "...",
    "region": "us-east-1"
  }
}

// 응답
{
  "success": true,
  "answer": "🖥️ EC2 인스턴스 분석 결과...",
  "mcpUsed": true,
  "reasoning": "EC2 관련 쿼리로 인식하여 인스턴스 정보를 조회했습니다."
}
```

### `/api/verify-aws` - LLM + MCP 자격증명 검증
```typescript
// 요청
{
  "accessKeyId": "AKIA...",
  "secretAccessKey": "...",
  "region": "us-east-1"
}

// 응답
{
  "success": true,
  "accountId": "123456789012",
  "arn": "arn:aws:iam::123456789012:user/username",
  "region": "us-east-1"
}
```

## 🏗️ 기술 스택

- **Frontend**: Next.js 15, React 18, TypeScript
- **LLM**: OpenAI GPT-4 또는 Anthropic Claude-3
- **MCP Integration**: AWS MCP Server 통신 레이어
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **No AWS SDK**: 순수 LLM + MCP 아키텍처

## 🚫 제거된 요소들

### AWS SDK 제거
- `@aws-sdk/client-ec2` ❌
- `@aws-sdk/client-s3` ❌
- `@aws-sdk/client-sts` ❌
- `@aws-sdk/client-bedrock-runtime` ❌

### 기존 파일 제거/교체
- `lib/aws-mcp-tools.ts` → `lib/pure-mcp-client.ts`
- `lib/bedrock-agent-with-mcp.ts` → `lib/mcp-aws-client.ts`
- 직접 AWS API 호출 코드 완전 제거

## 🔧 개발 모드

현재 개발 중이므로 시뮬레이션 응답을 제공합니다:

```typescript
// 개발 모드에서는 실제 LLM API 대신 시뮬레이션 응답 제공
function simulateLLMWithMCPResponse(query: string, credentials: MCPAWSCredentials) {
  // 실제 배포 시에는 OpenAI/Anthropic API 호출로 교체
}
```

## 🚀 배포 준비사항

1. **LLM API 키 설정**: OpenAI 또는 Anthropic API 키
2. **AWS MCP 서버**: 외부 MCP 서버 구성 (선택사항)
3. **실제 LLM 통합**: 시뮬레이션 코드를 실제 LLM API 호출로 교체

## 🔮 향후 계획

- [ ] OpenAI GPT-4 API 완전 통합
- [ ] Anthropic Claude API 완전 통합
- [ ] AWS MCP 서버 자동 프로비저닝
- [ ] 복잡한 AWS 워크플로우 자동화
- [ ] 멀티 클라우드 MCP 지원 (Azure, GCP)

## 🐛 문제 해결

### LLM API 연결 실패
```
❌ LLM API 키가 설정되지 않았습니다
```
**해결책**: `.env.local`에 `OPENAI_API_KEY` 또는 `ANTHROPIC_API_KEY` 설정

### AWS 자격증명 검증 실패
```
❌ LLM + MCP를 통한 AWS 계정 검증에 실패했습니다
```
**해결책**: AWS 자격증명 권한 확인 및 LLM 서비스 상태 확인

## 📄 라이센스

MIT License

---

**🎉 순수 LLM + AWS MCP 통합의 미래를 경험해보세요!**

*No AWS SDK, Just LLM + MCP Magic ✨*