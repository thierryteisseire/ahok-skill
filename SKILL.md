---
name: ahok-memory
description: "Universal long-term memory system for AI agents. Use when: remembering user preferences, storing persistent context, recalling past conversations, personalizing responses, or creating new agent memories that persist across sessions."
---

# Ahok Memory Cloud

Universal long-term memory for AI agents. Store and retrieve memories across conversations.

## Quick Start

1.  **Get API Key**: Obtain from dashboard.
2.  **Add Memory**: `POST /memory/add` with `content`.
3.  **Recall Memory**: `POST /query` with `query`.

See [references/api_reference.md](references/api_reference.md) for full API documentation.
See [references/examples.md](references/examples.md) for code integration examples.

## Best Practices

1.  **Always include user_id** for multi-user applications to ensure proper data isolation.
2.  **Use tags** for easier filtering and organization.
3.  **Query at conversation start** to personalize responses based on past interactions.
4.  **Store important facts** as they are shared by users (e.g., preferences, project details).
5.  **Use workspaces** to isolate memories by project or context.

## Claude Desktop Integration (MCP)

Add to `claude_desktop_config.json`:

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

Or connect via hosted MCP:

```json
{
  "mcpServers": {
    "ahok-memory": {
      "url": "https://mem.ahok.io/mcp",
      "headers": {
        "x-api-key": "your-api-key-here"
      }
    }
  }
}
```
