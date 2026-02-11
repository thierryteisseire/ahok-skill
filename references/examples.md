# Ahok Memory Cloud Integration Examples

## Python Integration
```python
import requests

API_KEY = "your-api-key"
BASE_URL = "https://memtool.ahok.io"

def remember(content, user_id=None):
    return requests.post(f"{BASE_URL}/memory/add", 
        headers={"x-api-key": API_KEY},
        json={"content": content, "user_id": user_id}
    ).json()

def recall(query, k=5):
    return requests.post(f"{BASE_URL}/query",
        headers={"x-api-key": API_KEY},
        json={"query": query, "k": k}
    ).json()
```

## TypeScript Integration
```typescript
const API_KEY = "your-api-key";
const BASE_URL = "https://memtool.ahok.io";

async function remember(content: string, userId?: string) {
  const res = await fetch(`${BASE_URL}/memory/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify({ content, user_id: userId })
  });
  return res.json();
}

async function recall(query: string, k = 5) {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST", 
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify({ query, k })
  });
  return res.json();
}
```
