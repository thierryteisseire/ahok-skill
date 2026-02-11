import { env } from "../../core/cfg";

const API_BASE = process.env.API_BASE_URL || "https://zqmt62peqz.us-east-1.awsapprunner.com";

const OPENAPI_SPEC = {
    openapi: "3.1.0",
    info: {
        title: "Ahok Memory Cloud API",
        description: "Universal Long-Term Memory for AI Agents and Applications. High-performance, multi-sector vector memory based on Hierarchical Segmented Graphs (HSG).",
        version: "2.0.0",
    },
    servers: [
        {
            url: API_BASE,
            description: "Production Environment",
        },
    ],
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "x-api-key",
            },
        },
        schemas: {
            Memory: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    content: { type: "string" },
                    primary_sector: { type: "string" },
                    sectors: { type: "array", items: { type: "string" } },
                    tags: { type: "array", items: { type: "string" } },
                    metadata: { type: "object" },
                    created_at: { type: "number" },
                    updated_at: { type: "number" },
                    salience: { type: "number" },
                },
            },
        },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
        "/memory/add": {
            post: {
                summary: "Add a new memory",
                description: "Stores a piece of information in the long-term memory. It will be automatically classified and indexed across relevant sectors.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["content"],
                                properties: {
                                    content: { type: "string", description: "The text content to remember." },
                                    tags: { type: "array", items: { type: "string" }, description: "Optional tags for categorization." },
                                    metadata: { type: "object", description: "Optional arbitrary metadata." },
                                    user_id: { type: "string", description: "Optional user identifier for multi-tenant isolation." },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Memory successfully added",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Memory" },
                            },
                        },
                    },
                },
            },
        },
        "/memory/query": {
            post: {
                summary: "Query contextual memory",
                description: "Performs a semantic and contextual search across memories. Returns the most relevant matches based on similarity, salience, and temporal factors.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["query"],
                                properties: {
                                    query: { type: "string", description: "The search query (natural language)." },
                                    k: { type: "integer", default: 8, description: "Number of results to return." },
                                    user_id: { type: "string", description: "Filter by user identifier." },
                                    filters: {
                                        type: "object",
                                        properties: {
                                            sector: { type: "string", description: "Filter by a specific memory sector." },
                                            min_score: { type: "number", description: "Minimum relevance score (0-1)." },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Matching memories found",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        query: { type: "string" },
                                        matches: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string" },
                                                    content: { type: "string" },
                                                    score: { type: "number" },
                                                    sectors: { type: "array", items: { type: "string" } },
                                                    salience: { type: "number" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/memory/all": {
            get: {
                summary: "List all memories",
                description: "Retrieves a paginated list of all stored memories.",
                parameters: [
                    { name: "user_id", in: "query", schema: { type: "string" } },
                    { name: "l", in: "query", schema: { type: "integer", default: 50 }, description: "Limit" },
                    { name: "u", in: "query", schema: { type: "integer", default: 0 }, description: "Offset" },
                ],
                responses: {
                    200: {
                        description: "List of memories",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        items: { type: "array", items: { $ref: "#/components/schemas/Memory" } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/memory/{id}": {
            delete: {
                summary: "Delete a memory",
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                    { name: "user_id", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    200: {
                        description: "Memory deleted",
                        content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } },
                    },
                },
            },
        },
        "/health": {
            get: {
                summary: "System health check",
                security: [],
                responses: {
                    200: {
                        description: "System is healthy",
                        content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } },
                    },
                },
            },
        },
    },
};

export function docs_route(app: any) {
    // OpenAPI spec
    app.get("/openapi.json", (req: any, res: any) => {
        res.json(OPENAPI_SPEC);
    });

    // OpenAI GPT Plugin manifest
    app.get("/.well-known/ai-plugin.json", (req: any, res: any) => {
        res.json({
            schema_version: "v1",
            name_for_human: "Ahok Memory",
            name_for_model: "ahok_memory",
            description_for_human: "Long-term memory storage and retrieval for AI agents. Remember and recall information across conversations.",
            description_for_model: "Use this plugin to store and retrieve long-term memories. Call 'remember' to save important information the user shares. Call 'recall' to search for relevant memories when context is needed. Always check memories at the start of conversations for personalization.",
            auth: {
                type: "service_http",
                authorization_type: "bearer",
                verification_tokens: {}
            },
            api: {
                type: "openapi",
                url: `${API_BASE}/openapi.json`
            },
            logo_url: `${API_BASE}/logo.png`,
            contact_email: "support@ahokmemory.com",
            legal_info_url: "https://ahokmemory.com/legal"
        });
    });

    // OpenAI Actions schema (simplified for GPT Actions)
    app.get("/.well-known/openapi.yaml", (req: any, res: any) => {
        const yaml = `openapi: 3.1.0
info:
  title: Ahok Memory API
  description: Long-term memory for AI agents. Use x-api-key header for authentication.
  version: 2.0.0
servers:
  - url: ${API_BASE}
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: x-api-key
      description: Your Ahok Memory API key (get from dashboard)
  schemas:
    MemoryInput:
      type: object
      required:
        - content
      properties:
        content:
          type: string
          description: The information to remember
        tags:
          type: array
          items:
            type: string
          description: Optional categorization tags
        user_id:
          type: string
          description: Optional user identifier for multi-user apps
        memory_key_id:
          type: string
          description: Optional workspace ID to store memory in specific workspace
security:
  - ApiKeyAuth: []
paths:
  /query:
    post:
      operationId: recallMemories
      summary: Search and recall relevant memories
      description: Use this to find memories related to the current conversation context. Returns formatted text with relevant memories.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - query
              properties:
                query:
                  type: string
                  description: Natural language search query
                k:
                  type: integer
                  default: 5
                  description: Number of memories to return
                user_id:
                  type: string
                  description: Filter memories by user ID
      responses:
        '200':
          description: Relevant memories found
          content:
            application/json:
              schema:
                type: object
                properties:
                  result:
                    type: string
                    description: Formatted memory results
                  matches:
                    type: array
                    items:
                      type: object
                      properties:
                        content:
                          type: string
                        score:
                          type: number
  /memories:
    post:
      operationId: rememberInformation
      summary: Store new information in long-term memory
      description: Use this to save important facts, preferences, or context for future recall. The memory will be automatically categorized.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MemoryInput'
      responses:
        '200':
          description: Memory stored successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  primary_sector:
                    type: string
`;
        res.setHeader("Content-Type", "text/yaml");
        res.send(yaml);
    });

    // Swagger UI docs
    app.get("/docs", (req: any, res: any) => {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ahok Memory Cloud API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    <style>
        body { margin: 0; background: #020617; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #f8fafc; }
        .swagger-ui .scheme-container { background: #0f172a; box-shadow: none; border-bottom: 1px solid #1e293b; }
        .swagger-ui select, .swagger-ui input { background: #1e293b; color: #f8fafc; border: 1px solid #334155; }
        .swagger-ui .opblock { border-radius: 12px; background: #0f172a; border: 1px solid #1e293b; }
        .swagger-ui .opblock-tag { color: #f8fafc; border-bottom: 1px solid #1e293b; }
        .swagger-ui .opblock .opblock-summary-description { color: #94a3b8; }
        .swagger-ui section.models { border: 1px solid #1e293b; background: #0f172a; border-radius: 12px; }
        .swagger-ui section.models h4 { color: #f8fafc; }
        .swagger-ui .model-box { background: #020617; border: 1px solid #1e293b; }
        .swagger-ui .btn.authorize { color: #10b981; border-color: #10b981; }
        .swagger-ui .btn.authorize svg { fill: #10b981; }
        .swagger-ui .opblock.opblock-post { border-color: #0ea5e9; }
        .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #0ea5e9; }
        .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #0ea5e9; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script>
        window.onload = () => {
            window.ui = SwaggerUIBundle({
                url: '/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                ],
                layout: "BaseLayout"
            });
        };
    </script>
</body>
</html>`;
        res.setHeader("Content-Type", "text/html");
        res.send(html);
    });
}
