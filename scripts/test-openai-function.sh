#!/bin/bash

# Script to test the OpenAI proxy function in Supabase

# Replace with your actual access token
ACCESS_TOKEN="YOUR_ACCESS_TOKEN"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Testing OpenAI Proxy Function..."

# Test generateText action
echo -e "\n${GREEN}Testing 'generateText' action...${NC}"
curl -s -X POST 'https://vdrmtsifivvpioonpqqc.functions.supabase.co/openai-proxy' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "action": "generateText",
    "params": {
      "prompt": "Write a brief hello world message",
      "model": "gpt-4-turbo",
      "temperature": 0.7,
      "max_tokens": 100
    }
  }' | jq

# Test generateQuestions action
echo -e "\n${GREEN}Testing 'generateQuestions' action...${NC}"
curl -s -X POST 'https://vdrmtsifivvpioonpqqc.functions.supabase.co/openai-proxy' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "action": "generateQuestions",
    "params": {
      "currentQuestion": "What is the capital of France?",
      "topic": "Geography",
      "difficulty": "medium"
    }
  }' | jq

echo -e "\n${GREEN}Tests completed!${NC}" 