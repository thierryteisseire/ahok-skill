# Ahok Memory Cloud Integration Examples

## Python Integration
```python
import requests
import os

API_KEY = os.getenv("AHOK_API_KEY")
BASE_URL = "https://memtool.ahok.io"

def remember(content, user_id=None, tags=None):
    return requests.post(f"{BASE_URL}/memory/add",
        headers={"x-api-key": API_KEY},
        json={"content": content, "user_id": user_id, "tags": tags}
    ).json()

def recall(query, k=5, user_id=None):
    return requests.post(f"{BASE_URL}/query",
        headers={"x-api-key": API_KEY},
        json={"query": query, "k": k, "user_id": user_id}
    ).json()

def reinforce(memory_id, boost_factor=1.5):
    return requests.post(f"{BASE_URL}/openmemory/reinforce",
        headers={"x-api-key": API_KEY},
        json={"memory_id": memory_id, "boost_factor": boost_factor}
    ).json()
```

## TypeScript Integration
```typescript
const API_KEY = process.env.AHOK_API_KEY;
const BASE_URL = "https://memtool.ahok.io";

async function remember(
  content: string,
  userId?: string,
  tags?: string[]
) {
  const res = await fetch(`${BASE_URL}/memory/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY! },
    body: JSON.stringify({ content, user_id: userId, tags })
  });
  return res.json();
}

async function recall(query: string, k = 5, userId?: string) {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY! },
    body: JSON.stringify({ query, k, user_id: userId })
  });
  return res.json();
}

async function reinforce(memoryId: string, boostFactor = 1.5) {
  const res = await fetch(`${BASE_URL}/openmemory/reinforce`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY! },
    body: JSON.stringify({ memory_id: memoryId, boost_factor: boostFactor })
  });
  return res.json();
}
```

## Claude Desktop MCP Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ahok-memory": {
      "command": "npx",
      "args": ["-y", "ahok-skill", "mcp"],
      "env": {
        "OM_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Or use the hosted MCP endpoint:

```json
{
  "mcpServers": {
    "ahok-memory": {
      "url": "https://memtool.ahok.io/mcp",
      "headers": {
        "x-api-key": "your-api-key-here"
      }
    }
  }
}
```

## Security Best Practices

**Environment Variables:**
```bash
# .env file (never commit this!)
AHOK_API_KEY=your-actual-api-key-here
```

**Python with dotenv:**
```python
from dotenv import load_dotenv
load_dotenv()

API_KEY = os.getenv("AHOK_API_KEY")
```

**Node.js with dotenv:**
```typescript
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.AHOK_API_KEY;
```
