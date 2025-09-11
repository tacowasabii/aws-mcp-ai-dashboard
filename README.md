# AWS MCP AI Dashboard

AWS Bedrock Claude 3.7 Sonnet과 AWS MCP를 연동한 지능형 AWS 리소스 관리 대시보드입니다.

## 🚀 주요 기능

- 🤖 **AI 기반 자연어 쿼리**: Claude 3.7 Sonnet을 사용한 지능형 AWS 리소스 조회
- 🔗 **AWS MCP 통합**: Model Context Protocol을 통한 실시간 AWS API 연동
- 🔐 **자격증명 분리**: Bedrock용(서버)과 MCP용(사용자) 자격증명 완전 분리
- 🖥️ **EC2 인스턴스 관리**: 인스턴스 목록, 상태, 타입 조회
- 🗂️ **S3 버킷 관리**: 버킷 목록, 생성일 조회
- 👤 **계정 정보 조회**: AWS 계정 ID, ARN, 리전 정보 확인
- 💾 **상태 관리**: Zustand를 통한 계정 및 채팅 상태 관리

## 🆕 AI 에이전트 기능

이제 자연어로 AWS 리소스를 조회할 수 있습니다:

**예시 질문들:**
- "현재 실행중인 EC2 인스턴스가 몇 개야?"
- "S3 버킷 목록과 각각의 생성일을 알려줘"
- "내 AWS 계정 정보를 확인해줘"
- "가장 비싼 인스턴스 타입은 뭐야?"
- "us-west-2 리전의 리소스 현황은?"

## 🔧 자격증명 구조

### 🏢 서버측 (Bedrock 전용)
- 환경변수로 고정 설정
- 관리자가 한 번만 설정
- Claude 3.7 Sonnet 모델 호출용

### 👤 클라이언트측 (MCP 전용)
- 사용자가 대시보드에서 입력
- 각 사용자의 AWS 리소스 조회용
- EC2, S3, STS API 호출용

## 📁 프로젝트 구조

```
aws-mcp-ai-dashboard/
├── app/
│   ├── api/
│   │   ├── aws-query/      # AI 에이전트 메인 API
│   │   ├── aws-test/       # MCP 자격증명 테스트
│   │   └── verify-aws/     # AWS 자격증명 검증
│   ├── dashboard/          # 대시보드 UI
│   └── globals.css
├── lib/
│   ├── bedrock-agent.ts    # AI 에이전트 핵심 로직
│   ├── aws-mcp-tools.ts    # MCP 도구 정의 및 구현
│   ├── aws-client.ts       # AWS 클라이언트 유틸리티
│   └── stores.ts           # Zustand 상태 관리
├── types/
│   └── index.ts            # TypeScript 타입 정의
└── components/             # React 컴포넌트
```

## 📋 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 서버 환경변수 설정 (관리자)
`.env.local` 파일을 생성하고 **Bedrock 전용 자격증명** 설정:

```env
# AWS Bedrock 전용 자격증명 (서버 고정)
BEDROCK_ACCESS_KEY_ID=AKIA...
BEDROCK_SECRET_ACCESS_KEY=...
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-7-sonnet-20250219-v1:0

# MCP 서버 설정
MCP_SERVER_URL=http://localhost:3001/sse
MCP_FALLBACK_MODE=true
```

### 3. AWS Bedrock 모델 액세스 활성화
**Bedrock 계정**에서 Claude 3.7 Sonnet 모델 액세스를 활성화해야 합니다.

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 사용자별 MCP 자격증명 입력
- 브라우저에서 http://localhost:3000 접속
- **각 사용자의 AWS 자격증명** 입력 (MCP용)
- 자연어 질문으로 AWS 리소스 조회

## 🔗 API 엔드포인트

### `/api/aws-query` - AI 에이전트
자연어 질문으로 AWS 리소스를 조회합니다.

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
  "data": "현재 3개의 EC2 인스턴스가 실행중입니다..."
}
```

### `/api/aws-test` - MCP 자격증명 테스트
사용자 입력 자격증명의 유효성을 테스트합니다.

### `/api/verify-aws` - AWS 자격증명 검증
간단한 AWS 자격증명 검증을 수행합니다.

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

## 🏗️ 기술 스택

- **Frontend**: Next.js 15, React 18, TypeScript
- **AI Model**: AWS Bedrock Claude 3.7 Sonnet (서버측)
- **AWS SDK**: v3 (EC2, S3, STS, Bedrock Runtime)
- **Protocol**: Model Context Protocol (MCP)
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 🔍 작동 원리

```
사용자 질문 → Bedrock AI (서버 자격증명) → 도구 선택 → AWS MCP (사용자 자격증명) → 응답 생성
```

1. **질문 접수**: 사용자가 자연어로 AWS 관련 질문
2. **AI 분석**: Bedrock Claude 3.7이 질문을 분석하고 필요한 도구 선택
3. **MCP 호출**: 사용자 자격증명으로 해당 AWS API 호출
4. **응답 생성**: AI가 결과를 바탕으로 자연스러운 한국어 응답 생성

## 🧩 핵심 컴포넌트

### `lib/bedrock-agent.ts`
- Claude 3.7 Sonnet과의 통신 관리
- 자연어 질문 분석 및 도구 선택
- MCP 도구 실행 및 응답 생성

### `lib/aws-mcp-tools.ts`
- AWS MCP 도구 정의 및 구현
- EC2, S3, STS 서비스 연동
- 타입 안전한 AWS API 호출

### `lib/aws-client.ts`
- AWS 클라이언트 생성 유틸리티
- 자격증명 검증 함수
- 공통 AWS 설정 관리

### `lib/stores.ts`
- Zustand 기반 상태 관리
- AWS 계정 및 채팅 메시지 상태
- Bedrock 설정 관리

### `types/index.ts`
- 전체 프로젝트 TypeScript 타입 정의
- AWS, MCP, Bedrock 관련 인터페이스
- API 응답 및 에러 타입

## 🐛 문제 해결

### AI 에이전트 오류
```
Bedrock 자격증명이 서버에 설정되지 않았습니다
```
→ 서버 관리자가 `.env.local`에 Bedrock 자격증명 설정 필요

### MCP 연결 실패
```
AWS 자격 증명이 올바르지 않습니다 (MCP용)
```
→ 사용자가 입력한 AWS 자격증명 확인 필요

### 타입 에러
```
Cannot find module '../types'
```
→ `npm install` 재실행 후 TypeScript 컴파일 확인

## 💡 보안 장점

- ✅ **권한 분리**: Bedrock 권한과 MCP 권한 완전 분리
- ✅ **최소 권한**: 각 계정은 필요한 최소 권한만 보유
- ✅ **사용자 격리**: 각 사용자는 자신의 AWS 리소스만 조회
- ✅ **서버 보안**: Bedrock 자격증명은 서버에만 저장
- ✅ **타입 안전성**: TypeScript로 컴파일 타임 에러 방지

## 📄 라이센스

MIT License

---

**Made with ❤️ using AWS Bedrock Claude 3.7 Sonnet & AWS MCP**
