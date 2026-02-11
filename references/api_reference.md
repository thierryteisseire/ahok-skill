# Ahok Memory Cloud API Reference

## Authentication
All requests require an API key in the `x-api-key` header.
Get your key from: https://your-dashboard-url/dashboard

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

### GET /memory/all
List all memories with pagination.

**Query Parameters:**
- `user_id`: Filter by user
- `l`: Limit (default 50)
- `u`: Offset (default 0)
- `key_id`: Filter by workspace

### DELETE /memory/{id}
Delete a specific memory.
