#!/bin/bash

echo "🚀 AWS MCP Dashboard 설정 시작..."

# uv 패키지 매니저 설치 확인
echo "🔧 uv 패키지 매니저 확인 중..."
if ! command -v uv &> /dev/null; then
    echo "📦 uv 설치 중..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    if [ $? -eq 0 ]; then
        echo "✅ uv 설치 완료"
    else
        echo "❌ uv 설치 실패"
        exit 1
    fi
else
    echo "✅ uv 이미 설치됨"
fi

echo ""
echo "🎉 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. .env.local 파일에 Bedrock 자격증명 설정"
echo "2. npm run dev:full   - 전체 서버 실행 (MCP + Next.js)"
echo "3. http://localhost:3000 접속"
echo "4. AWS 자격 증명 입력 (MCP용)"
echo ""
echo "⚠️  필요한 AWS 자격증명:"
echo ""
echo "🏢 서버용 (Bedrock - .env.local):"
echo "- BEDROCK_ACCESS_KEY_ID"
echo "- BEDROCK_SECRET_ACCESS_KEY"
echo "- bedrock:InvokeModel 권한"
echo ""
echo "👤 사용자용 (MCP - 웹에서 입력):"
echo "- Access Key ID"
echo "- Secret Access Key"
echo "- 리전 (예: us-east-1)"
echo ""
echo "🔐 MCP용 필요 권한:"
echo "- ec2:DescribeInstances"
echo "- s3:ListBuckets"
echo "- sts:GetCallerIdentity"
