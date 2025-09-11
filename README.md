# AWS MCP AI Dashboard

**실제 AWS Model Context Protocol (MCP) 서버와 연동된** 지능형 AWS 리소스 관리 대시보드입니다.

## 🚀 주요 기능

- 🤖 **실제 AWS MCP 통합**: AWS Labs 공식 `awslabs.core-mcp-server` 사용
- 🧠 **AI 기반 자연어 쿼리**: Claude 3.7 Sonnet을 사용한 지능형 AWS 리소스 조회
- 🔗 **하이브리드 아키텍처**: MCP 분석 + 직접 AWS API 호출 조합
- 🔐 **자격증명 분리**: Bedrock용(서버)과 MCP용(사용자) 자격증명 완전 분리
- 🖥️ **EC2 인스턴스 관리**: 인스턴스 목록, 상태, 타입 조회
- 🗂️ **S3 버킷 관리**: 버킷 목록, 생성일 조회
- 👤 **계정 정보 조회**: AWS 계정 ID, ARN, 리전 정보 확인

## 🆕 실제 MCP 기능

이제 **진짜 AWS MCP 서버**를 사용합니다:

- ✅ **AWS Labs 공식 MCP 서버**: `awslabs.core-mcp-server@latest`
- ✅ **프롬프트 이해**: MCP의 `prompt_understanding` 도구 사용
- ✅ **AWS 전문 지식**: 최신 AWS 문서 및 모범 사례 액세스
- ✅ **지능적 분석**: AI가 MCP를 통해 사용자 의도 정확히 파악

**예시 질문들:**
- "현재 실행중인 EC2 인스턴스가 몇 개야?"
- "S3 버킷 목록과 각각의 생성일을 알려줘"
- "내 AWS 계정 정보를 확인해줘"
- "가장 비싼 인스턴스 타입은 뭐야?"
- "us-west-2 리전의 리소스 현황은?"

## 🏗️ 아키텍처

```
사용자 질문 → Bedrock Claude 3.7 → AWS MCP 서버 (분석) → AWS API (조회) → 통합 응답
```

1. **질문 접수**: 사용자가 자연어로 AWS 관련 질문
2. **MCP 분석**: AWS MCP 서버가 질문을 분석하고 의도 파악
3. **리소스 조회**: 분석 결과에 따라 적절한 AWS API 직접 호출
4. **응답 생성**: MCP 지식 + API 결과를 바탕으로 전문적 응답 생성

## 📋 필수 요구사항

### 1️⃣ **uv 패키지 매니저 설치**
```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 또는 npm 스크립트 사용
npm run install-uv
```

### 2️⃣ **AWS 자격증명 설정**
두 가지 별도 계정이 필요합니다:

#### A. Bedrock 전용 계정 (서버용)
```env
# .env.local
BEDROCK_ACCESS_KEY_ID=AKIA...
BEDROCK_SECRET_ACCESS_KEY=...
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-7-sonnet-20250219-v1:0
```

#### B. MCP 전용 계정 (사용자 입력)
- 대시보드에서 사용자가 직접 입력
- EC2, S3, STS 권한 필요

## 🚀 설치 및 실행

### 1️⃣ **의존성 설치**
```bash
npm install
```

### 2️⃣ **환경변수 설정**
`.env.local` 파일에 **Bedrock 전용 자격증명** 설정

### 3️⃣ **AWS Bedrock 모델 액세스 활성화**
AWS 콘솔에서 Claude 3.7 Sonnet 모델 액세스 활성화

### 4️⃣ **전체 서버 실행 (권장)**
```bash
# MCP 서버 + Next.js 동시 실행
npm run dev:full
```

### 5️⃣ **개별 서버 실행**
```bash
# 터미널 1: MCP HTTP 서버 실행
npm run mcp-server

# 터미널 2: Next.js 개발 서버 실행  
npm run dev
```

### 6️⃣ **브라우저에서 테스트**
- http://localhost:3000 접속
- **MCP용 AWS 자격증명** 입력
- 자연어 질문으로 AWS 리소스 조회

## 🔧 서버 구성

### MCP HTTP 서버 (포트 3001)
- AWS MCP 서버 래퍼
- `uvx awslabs.core-mcp-server@latest` 실행
- HTTP API로 MCP 통신 제공

### Next.js 서버 (포트 3000)  
- 웹 대시보드
- Bedrock Claude 3.7 Sonnet 연동
- MCP HTTP 클라이언트 통합

## 🔒 필요한 AWS 권한

### 서버 계정 (Bedrock 전용)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

### 사용자 계정 (MCP 전용)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "s3:ListBuckets",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🔗 API 엔드포인트

### `/api/aws-query` - 실제 MCP 통합 AI 에이전트
```typescript
// 요청
{
  "query": "실행중인 EC2 인스턴스 개수와 상태를 알려줘",
  "credentials": {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "...",
    "region": "us-east-1"  
  }
}

// 응답
{
  "data": "AWS MCP 분석에 따르면 현재 3개의 EC2 인스턴스가 실행중입니다...",
  "info": "✅ 실제 AWS MCP 서버와 연동되어 처리되었습니다"
}
```

### `/api/verify-aws` - AWS 자격증명 검증
```bash
# AWS 연결 테스트
POST /api/verify-aws
{
  "accessKeyId": "AKIA...",
  "secretAccessKey": "...",
  "region": "us-east-1"
}
```

### MCP HTTP 서버 API (포트 3001)
```bash
# 서버 상태 확인
GET http://localhost:3001/health

# 사용 가능한 도구 목록
GET http://localhost:3001/tools

# MCP 도구 호출
POST http://localhost:3001/tools/call
{
  "name": "prompt_understanding",
  "arguments": { "prompt": "EC2 인스턴스 조회해줘" }
}

# 프롬프트 분석
POST http://localhost:3001/prompt/analyze  
{
  "prompt": "S3 버킷 현황 알려줘"
}
```

## 🏗️ 기술 스택

- **Frontend**: Next.js 15, React 18, TypeScript
- **AI Model**: AWS Bedrock Claude 3.7 Sonnet (서버측)
- **MCP Server**: AWS Labs `awslabs.core-mcp-server@latest`
- **AWS SDK**: v3 (EC2, S3, STS, Bedrock Runtime)
- **MCP Client**: Custom HTTP client for MCP communication
- **Package Manager**: uv (for MCP server)
- **State Management**: Zustand
- **Styling**: Tailwind CSS

## 🔍 작동 방식

### 1. **MCP 기반 분석**
```
사용자 질문 → AWS MCP 서버 → prompt_understanding 도구 → 의도 분석
```

### 2. **하이브리드 실행**  
```
MCP 분석 결과 → 적절한 AWS API 직접 호출 → 리소스 데이터 수집
```

### 3. **지능적 응답**
```
MCP 지식 + API 결과 → Claude 3.7 Sonnet → 전문적 한국어 응답
```

## 🐛 문제 해결

### MCP 서버 연결 실패
```
❌ MCP 서버에 연결할 수 없습니다
```
**해결책:**
1. MCP 서버 실행: `npm run mcp-server`
2. uv 설치 확인: `uv --version`
3. 포트 3001 사용 중인지 확인: `lsof -i :3001`

### AWS MCP 서버 실행 실패
```
❌ uvx awslabs.core-mcp-server@latest 실행 실패
```
**해결책:**
1. uv 재설치: `npm run install-uv`
2. 환경변수 확인: AWS 자격증명 설정
3. 인터넷 연결 확인 (MCP 서버 다운로드용)

### Bedrock 모델 액세스 오류
```
❌ Bedrock 모델에 대한 액세스 권한이 없습니다
```
**해결책:**
1. AWS 콘솔 → Bedrock → Model access
2. Claude 3.7 Sonnet 활성화
3. us-east-1 리전 사용 확인

### MCP 분석 실패시 폴백
```
⚠️ MCP 서버가 준비되지 않음, 기본 모드로 진행
```
- MCP 없이도 기본적인 AWS API 조회는 동작
- 키워드 기반 간단 분석으로 폴백

## 📊 로그 모니터링

### MCP 서버 로그
```bash
# MCP HTTP 서버 로그
npm run mcp-server

# 출력 예시:
🌐 MCP HTTP 서버가 포트 3001에서 실행 중
🚀 AWS MCP 서버 시작 중...  
✅ MCP 서버 초기화 완료
📥 MCP 응답: {"result": {...}}
```

### Next.js 서버 로그
```bash
npm run dev

# 출력 예시:
🚀 AWSBedrockAgentWithMCP 초기화 중...
🔍 1단계: AWS MCP를 통한 질문 분석 시작...
🎯 MCP 분석 결과: {"service": "ec2", "confidence": 0.9}
⚡ 2단계: AWS 리소스 조회 시작...  
📝 3단계: 최종 응답 생성 시작...
✅ 최종 응답 생성 완료
```

## 💡 개발 팁

### MCP 서버 디버깅
```bash
# MCP 서버 직접 실행 (디버깅용)
uvx awslabs.core-mcp-server@latest

# 환경변수와 함께 실행
FASTMCP_LOG_LEVEL=DEBUG uvx awslabs.core-mcp-server@latest
```

### 커스텀 MCP 도구 추가
1. `lib/http-mcp-client.ts`에서 새로운 메서드 추가
2. `scripts/mcp-http-server.js`에서 새로운 엔드포인트 추가
3. AWS MCP 서버 설정에서 추가 역할 활성화

## 🧹 프로젝트 정리 사항

### 삭제된 중복 파일들:
- `app/api/aws-test/` → `app/api/verify-aws/`로 통합

### 최적화된 컴포넌트들:
- `mcp-connection.tsx` → 단일 API 엔드포인트 사용
- `connection-status.tsx` → 기존 유지

## 📄 라이센스

MIT License

---

**🎉 실제 AWS MCP 서버와 연동된 최첨단 AI 대시보드를 경험해보세요!**

*Made with ❤️ using AWS Bedrock Claude 3.7 Sonnet & AWS Labs MCP Server*
