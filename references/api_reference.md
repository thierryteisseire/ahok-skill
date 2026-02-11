# Ahok Memory Cloud API Reference

## Authentication
All requests require an API key in the `x-api-key` header.
Get your API key from the Ahok Memory dashboard.

**Base URL:** `https://memtool.ahok.io`

## Endpoints

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

### POST /openmemory/reinforce
Reinforce a memory's importance to prevent decay.

**Request Body:**
```json
{
  "memory_id": "uuid",
  "boost_factor": 1.5
}
```

**Response:**
```json
{
  "id": "uuid",
  "reinforced": true,
  "new_importance": 0.95
}
```

### GET /memory/all
List all memories with pagination.

**Query Parameters:**
- `user_id`: Filter by user
- `l`: Limit (default 50)
- `u`: Offset (default 0)
- `key_id`: Filter by workspace

### DELETE /memory/{id}
Delete a specific memory.

## Security Best Practices

1. **API Key Management**
   - Never commit API keys to version control
   - Use environment variables (`OM_API_KEY` or `AHOK_API_KEY`)
   - Rotate keys regularly
   - Use different keys for dev/staging/production

2. **Data Privacy**
   - Always include `user_id` for multi-user apps
   - Use workspaces (`memory_key_id`) to isolate contexts
   - Implement access controls at application layer
   - Audit stored memories for PII/sensitive data

3. **Rate Limiting & Performance**
   - Implement client-side rate limiting
   - Cache frequently accessed memories
   - Use pagination for large result sets
   - Consider batch operations for bulk updates
