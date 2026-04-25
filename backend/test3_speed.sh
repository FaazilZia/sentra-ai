#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdhYzQ2MGNmLThkZmQtNDQyYi05OGFjLTgxMzY1YmVkYWZkZCIsInJvbGUiOiJBRE1JTiIsIm9yZ2FuaXphdGlvbklkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwiaWF0IjoxNzc3MDg4MTMzLCJleHAiOjE3NzcwODkwMzN9.6rsk7zMX2jNygQFSQn5HcFSfDck8eKpUA0YFGXTT3bI"
URL="https://sentra-backend-node.onrender.com/api/v1/ai/check-action"

echo "🚀 Launching 100 concurrent requests..."
start_time=$(date +%s%N)

# Using xargs to run 25 parallel processes at a time, total 100
seq 100 | xargs -I {} -P 25 curl -s -o /dev/null -w "%{http_code}\n" -X POST $URL   -H "Authorization: Bearer $TOKEN"   -H "Content-Type: application/json"   -d '{"agent": "speed-test", "action": "test load"}' > results.txt

end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))

echo "---"
echo "Total Duration: ${duration}ms"
echo "Success (200/201): $(grep -cE '200|201' results.txt)"
echo "Blocked (403): $(grep -c '403' results.txt)"
echo "Rate Limited (429): $(grep -c '429' results.txt)"
echo "Errors (5xx): $(grep -c '5' results.txt)"
