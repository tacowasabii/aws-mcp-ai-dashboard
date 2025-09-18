# AWS MCP AI Dashboard 프로젝트 분석

## 프로젝트 목적
- LLM + AWS MCP 통합을 통한 자연어 AWS 관리 시스템
- 사용자가 자연어로 AWS 리소스에 대해 질문하고 답변을 받는 시스템

## 기술 스택
- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Next.js API Routes
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **AWS Integration**: 현재는 MCP 기반, 변경 예정

## 현재 구조
### 패키지
- @aws-sdk/client-ec2, @aws-sdk/client-eks, @aws-sdk/credential-providers (이미 설치됨)
- @modelcontextprotocol/sdk (MCP 관련, 제거 예정)

### 주요 파일
- `components/mcp-chat.tsx`: 채팅 UI 컴포넌트
- `app/api/aws-query/route.ts`: 현재 MCP 기반 API
- `lib/pure-mcp-client.ts`: MCP 클라이언트 (제거 예정)
- `lib/stores.ts`: Zustand 상태 관리

### 데이터 플로우
MCPChat → /api/aws-query → pureMCPClient.queryAWSResources()

## 변경 요구사항
1. EC2, EKS, VPC 자원에 대한 질의응답만 지원
2. MCP 기능 완전 제거
3. AWS SDK를 통한 직접 데이터 조회로 변경
4. UI는 그대로 유지

## 변경 계획
1. MCP 관련 파일 삭제/정리
2. 새로운 AWS SDK 기반 클라이언트 생성 (EC2, EKS, VPC만)
3. API 라우트 수정
4. 불필요한 코드 정리