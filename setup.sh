#!/bin/bash

echo "🚀 AWS MCP Dashboard 설정 시작..."

# 필요한 AWS SDK 패키지 설치
echo "📦 AWS SDK 패키지 설치 중..."
npm install @aws-sdk/client-ec2@^3.699.0 @aws-sdk/client-s3@^3.699.0 @aws-sdk/client-cost-explorer@^3.699.0

if [ $? -eq 0 ]; then
    echo "✅ AWS SDK 패키지 설치 완료"
else
    echo "❌ AWS SDK 패키지 설치 실패"
    exit 1
fi

echo ""
echo "🎉 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. npm run dev        - 개발 서버 실행"
echo "2. http://localhost:3000/dashboard 접속"
echo "3. AWS 자격 증명 입력"
echo ""
echo "⚠️  AWS 자격 증명 요구사항:"
echo "- Access Key ID"
echo "- Secret Access Key"
echo "- 리전 (예: us-east-1)"
echo ""
echo "🔐 필요한 AWS 권한:"
echo "- ec2:DescribeInstances"
echo "- s3:ListBuckets"
echo "- ce:GetCostAndUsage"
echo "- sts:GetCallerIdentity"
