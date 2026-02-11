---
name: ahok-memory
description: "Long-term memory storage and retrieval for AI agents. Use when: remembering user preferences, storing context, recalling past conversations, personalizing responses, building agent memory."
source: ahok-memory-cloud
api_base: https://memtool.ahok.io
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
      "args": ["-y", "ahok-skill", "mcp"],
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
      "url": "https://memtool.ahok.io/mcp",
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
Get your API key from the Ahok Memory dashboard.

### Store a Memory

```bash
curl -X POST https://memtool.ahok.io/memory/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"content": "User prefers dark mode", "user_id": "user123"}'
```

### Recall Memories

```bash
curl -X POST https://memtool.ahok.io/query \
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

### JavaScript/TypeScript
```typescript
const API_KEY = process.env.AHOK_API_KEY;
const BASE_URL = "https://memtool.ahok.io";

async function remember(content: string, userId?: string, tags?: string[]) {
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

## Security Best Practices

### API Key Management
1. **Never commit API keys to version control**
   - Use `.gitignore` to exclude `.env` files
   - Rotate keys regularly
   - Use different keys for dev/staging/production

2. **Environment Variables**
   ```bash
   # .env file (never commit!)
   AHOK_API_KEY=your-actual-api-key-here
   ```

3. **Python with dotenv:**
   ```python
   from dotenv import load_dotenv
   import os

   load_dotenv()
   API_KEY = os.getenv("AHOK_API_KEY")
   ```

4. **Node.js with dotenv:**
   ```typescript
   import dotenv from 'dotenv';
   dotenv.config();

   const API_KEY = process.env.AHOK_API_KEY;
   ```

### Data Privacy
1. **Always use `user_id`** for multi-user applications to ensure data isolation
2. **Use workspaces** (`memory_key_id`) to separate contexts/projects
3. **Implement access controls** at your application layer
4. **Audit stored memories** regularly for PII and sensitive information
5. **Tag sensitive data** appropriately for easier management

### Performance & Rate Limiting
1. **Implement client-side rate limiting** to prevent API abuse
2. **Cache frequently accessed memories** to reduce API calls
3. **Use pagination** (`l` and `u` parameters) for large result sets
4. **Batch operations** when possible to reduce round trips

### Network Security
1. **Always use HTTPS** (the API base URL is already HTTPS)
2. **Validate SSL certificates** in production
3. **Consider using API gateways** for additional security layers
4. **Monitor API usage** for unusual patterns

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
