---
name: ahok-memory
description: "Long-term memory storage and retrieval for AI agents. Use when: remembering user preferences, storing context, recalling past conversations, personalizing responses, building agent memory."
source: ahok-memory-cloud
api_base: https://zqmt62peqz.us-east-1.awsapprunner.com
---

# Ahok Memory Cloud

Universal long-term memory for AI agents. Store and retrieve memories across conversations.

## Claude Desktop Integration (MCP)

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ahok-memory": {
      "command": "npx",
      "args": ["-y", "openmemory-js", "mcp"],
      "env": {
        "OM_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Or connect to the hosted MCP endpoint:

```json
{
  "mcpServers": {
    "ahok-memory": {
      "url": "https://zqmt62peqz.us-east-1.awsapprunner.com/mcp",
      "headers": {
        "x-api-key": "your-api-key-here"
      }
    }
  }
}
```

### Available MCP Tools

Once connected, Claude will have access to:

- **openmemory_query** - Search memories semantically
- **openmemory_store** - Save new memories
- **openmemory_list** - List recent memories
- **openmemory_get** - Fetch a specific memory
- **openmemory_reinforce** - Boost memory importance

## Quick Start

### Authentication
All requests require an API key in the `x-api-key` header.
Get your key from: https://your-dashboard-url/dashboard

### Store a Memory

```bash
curl -X POST https://zqmt62peqz.us-east-1.awsapprunner.com/memory/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"content": "User prefers dark mode", "user_id": "user123"}'
```

### Recall Memories

```bash
curl -X POST https://zqmt62peqz.us-east-1.awsapprunner.com/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"query": "What are the user preferences?", "k": 5}'
```

## API Endpoints

### POST /memory/add
Store a new memory.

**Request Body:**
```json
{
  "content": "The information to remember",
  "user_id": "optional-user-identifier",
  "tags": ["optional", "tags"],
  "metadata": {"any": "json object"},
  "memory_key_id": "optional-workspace-uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "primary_sector": "semantic|procedural|episodic",
  "sectors": ["semantic"],
  "chunks": 1
}
```

### POST /query
Search memories semantically.

**Request Body:**
```json
{
  "query": "natural language search",
  "k": 5,
  "user_id": "optional-filter"
}
```

**Response:**
```json
{
  "query": "natural language search",
  "result": "Formatted memory results as text",
  "matches": [
    {"id": "uuid", "content": "...", "score": 0.95}
  ]
}
```

### POST /memories
Simplified endpoint for storing memories (alias for /memory/add).

### GET /memory/all
List all memories with pagination.

**Query Parameters:**
- `user_id`: Filter by user
- `l`: Limit (default 50)
- `u`: Offset (default 0)
- `key_id`: Filter by workspace

### DELETE /memory/{id}
Delete a specific memory.

## Memory Sectors

Memories are automatically classified into sectors:
- **semantic**: Facts, knowledge, preferences
- **procedural**: How-to, processes, workflows  
- **episodic**: Events, conversations, experiences

## Best Practices

1. **Always include user_id** for multi-user applications
2. **Use tags** for easier filtering and organization
3. **Query at conversation start** to personalize responses
4. **Store important facts** as they're shared by users
5. **Use workspaces** to isolate memories by project/context

## Integration Examples

### Python
```python
import requests

API_KEY = "your-api-key"
BASE_URL = "https://zqmt62peqz.us-east-1.awsapprunner.com"

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

### JavaScript/TypeScript
```typescript
const API_KEY = "your-api-key";
const BASE_URL = "https://zqmt62peqz.us-east-1.awsapprunner.com";

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

## Claude/Anthropic Integration

When using with Claude, add this to your system prompt:

```
You have access to long-term memory via the Ahok Memory API.

To remember something important:
POST /memory/add with {"content": "what to remember"}

To recall relevant context:
POST /query with {"query": "what to search for"}

Always check memory at the start of conversations for personalization.
Store important user preferences and facts as they're shared.
```
