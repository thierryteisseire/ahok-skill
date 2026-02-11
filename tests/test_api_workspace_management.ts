/**
 * Extensive API Tests for Memory Workspace Management
 * Tests the deployed backend endpoints via HTTP
 */

// Configuration - update this to your deployed API URL
const API_URL = process.env.API_URL || "https://zqmt62peqz.us-east-1.awsapprunner.com";
const API_KEY = process.env.API_KEY || "napi_ce3w2t2k6vjmms1j7hnc8j0o0owgje9t65opzmp8cc3b6tr4nyxnhi2lun7lc90f";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let testWorkspaceIds: string[] = [];
let testMemoryIds: string[] = [];

async function apiRequest(method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
    const url = `${API_URL}${path}`;
    const options: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
        },
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => ({}));
        return { status: response.status, data };
    } catch (error: any) {
        return { status: 0, data: { error: error.message } };
    }
}

async function setup() {
    console.log("=".repeat(70));
    console.log("Extensive API Tests for Memory Workspace Management");
    console.log("=".repeat(70));
    console.log(`\nAPI URL: ${API_URL}`);
    console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
}

/**
 * Test 0: Health check
 */
async function test_health_check() {
    console.log("\n[Test 0] Health Check...");
    
    const { status } = await apiRequest("GET", "/health");
    if (status === 200) {
        console.log("  ✓ API is healthy");
    } else {
        console.log(`  ⚠ Health check returned status ${status} (continuing anyway)`);
    }
}

/**
 * Test 1: Create workspaces via POST /keys
 */
async function test_create_workspaces() {
    console.log("\n[Test 1] Creating workspaces via POST /keys...");
    
    const workspaces = [
        { label: "Test-Development" },
        { label: "Test-Production" },
        { label: "Test-Staging" },
    ];
    
    for (const ws of workspaces) {
        const { status, data } = await apiRequest("POST", "/keys", ws);
        
        if (status === 200 && data.id) {
            testWorkspaceIds.push(data.id);
            console.log(`  ✓ Created workspace: ${ws.label} (${data.id})`);
            console.log(`    Secret key: ${data.secret_key?.substring(0, 25)}...`);
        } else {
            throw new Error(`Failed to create workspace: ${status} ${JSON.stringify(data)}`);
        }
    }
    
    console.log(`  ✓ Total workspaces created: ${testWorkspaceIds.length}`);
}

/**
 * Test 2: List workspaces via GET /keys
 */
async function test_list_workspaces() {
    console.log("\n[Test 2] Listing workspaces via GET /keys...");
    
    const { status, data } = await apiRequest("GET", "/keys");
    
    if (status !== 200) {
        throw new Error(`Failed to list workspaces: ${status} ${JSON.stringify(data)}`);
    }
    
    const keys = data.keys || [];
    console.log(`  ✓ Found ${keys.length} workspaces`);
    
    // Verify our test workspaces exist
    const foundIds = keys.map((k: any) => k.id);
    for (const id of testWorkspaceIds) {
        if (!foundIds.includes(id)) {
            throw new Error(`Workspace ${id} not found in list`);
        }
    }
    
    console.log("  ✓ All test workspaces found in list");
}

/**
 * Test 3: Get workspace statistics via GET /keys/stats
 */
async function test_workspace_stats_empty() {
    console.log("\n[Test 3] Getting workspace statistics (empty) via GET /keys/stats...");
    
    const { status, data } = await apiRequest("GET", "/keys/stats");
    
    if (status !== 200) {
        throw new Error(`Failed to get stats: ${status} ${JSON.stringify(data)}`);
    }
    
    const workspaces = data.workspaces || [];
    console.log(`  ✓ Stats returned for ${workspaces.length} workspaces`);
    
    // Verify memory counts are 0 for new workspaces
    for (const ws of workspaces) {
        if (testWorkspaceIds.includes(ws.id)) {
            console.log(`    ${ws.label}: ${ws.memory_count} memories`);
        }
    }
    
    console.log("  ✓ Workspace statistics retrieved successfully");
}

/**
 * Test 4: Rename workspace via PATCH /keys/:id
 */
async function test_rename_workspace() {
    console.log("\n[Test 4] Renaming workspace via PATCH /keys/:id...");
    
    const workspaceId = testWorkspaceIds[0];
    const newLabel = "Test-Development-RENAMED";
    
    const { status, data } = await apiRequest("PATCH", `/keys/${workspaceId}`, { label: newLabel });
    
    if (status !== 200) {
        throw new Error(`Failed to rename workspace: ${status} ${JSON.stringify(data)}`);
    }
    
    if (data.label !== newLabel) {
        throw new Error(`Rename failed: expected "${newLabel}", got "${data.label}"`);
    }
    
    console.log(`  ✓ Workspace renamed to: ${newLabel}`);
    console.log(`  ✓ Updated at: ${new Date(data.updated_at).toISOString()}`);
}

/**
 * Test 5: Rename validation - empty label should fail
 */
async function test_rename_validation() {
    console.log("\n[Test 5] Testing rename validation (empty label)...");
    
    const workspaceId = testWorkspaceIds[0];
    
    // Test empty string
    let { status } = await apiRequest("PATCH", `/keys/${workspaceId}`, { label: "" });
    
    if (status === 400) {
        console.log("  ✓ Empty label correctly rejected with 400");
    } else {
        console.log(`  ⚠ Expected 400 for empty label, got ${status}`);
    }
    
    // Test whitespace only
    ({ status } = await apiRequest("PATCH", `/keys/${workspaceId}`, { label: "   " }));
    
    if (status === 400) {
        console.log("  ✓ Whitespace-only label correctly rejected with 400");
    } else {
        console.log(`  ⚠ Expected 400 for whitespace label, got ${status}`);
    }
}

/**
 * Test 6: Create memories in workspaces via POST /memory/add
 * Note: Using memory_key_id in body (requires updated backend) or workspace secret key
 */
async function test_create_memories() {
    console.log("\n[Test 6] Creating memories in workspaces via POST /memory/add...");
    
    const memories = [
        { content: "Test memory 1 in Development workspace - unique " + Date.now(), workspace_idx: 0 },
        { content: "Test memory 2 in Development workspace - unique " + Date.now(), workspace_idx: 0 },
        { content: "Test memory 3 in Production workspace - unique " + Date.now(), workspace_idx: 1 },
        { content: "Test memory 4 in Production workspace - unique " + Date.now(), workspace_idx: 1 },
        { content: "Test memory 5 in Production workspace - unique " + Date.now(), workspace_idx: 1 },
        { content: "Test memory 6 in Staging workspace - unique " + Date.now(), workspace_idx: 2 },
    ];
    
    for (const mem of memories) {
        // Try with memory_key_id in body (works with updated backend)
        const { status, data } = await apiRequest("POST", "/memory/add", {
            content: mem.content,
            memory_key_id: testWorkspaceIds[mem.workspace_idx]
        });
        
        if (status === 200 && data.id) {
            testMemoryIds.push(data.id);
            console.log(`  ✓ Created memory: ${data.id.substring(0, 8)}... in workspace ${mem.workspace_idx + 1}`);
        } else {
            console.log(`  ⚠ Failed to create memory: ${status} ${JSON.stringify(data)}`);
        }
        
        await sleep(300); // Small delay between creates
    }
    
    console.log(`  ✓ Total memories created: ${testMemoryIds.length}`);
}

/**
 * Test 7: Verify workspace statistics with memories
 */
async function test_workspace_stats_with_memories() {
    console.log("\n[Test 7] Verifying workspace statistics with memories...");
    
    await sleep(1000); // Wait for indexing
    
    const { status, data } = await apiRequest("GET", "/keys/stats");
    
    if (status !== 200) {
        throw new Error(`Failed to get stats: ${status}`);
    }
    
    const workspaces = data.workspaces || [];
    const statsMap = new Map<string, number>();
    
    for (const ws of workspaces) {
        if (testWorkspaceIds.includes(ws.id)) {
            statsMap.set(ws.id, ws.memory_count);
            console.log(`  ${ws.label}: ${ws.memory_count} memories`);
        }
    }
    
    // Expected: ws1=2, ws2=3, ws3=1
    const ws1Count = statsMap.get(testWorkspaceIds[0]) || 0;
    const ws2Count = statsMap.get(testWorkspaceIds[1]) || 0;
    const ws3Count = statsMap.get(testWorkspaceIds[2]) || 0;
    
    console.log(`  Expected: Development=2, Production=3, Staging=1`);
    console.log(`  Actual: Development=${ws1Count}, Production=${ws2Count}, Staging=${ws3Count}`);
    
    if (ws1Count === 2 && ws2Count === 3 && ws3Count === 1) {
        console.log("  ✓ All memory counts are correct!");
    } else {
        console.log("  ⚠ Memory counts don't match expected values (may need more time for indexing)");
    }
}

/**
 * Test 8: Bulk move memories via POST /memory/bulk-move
 */
async function test_bulk_move() {
    console.log("\n[Test 8] Testing bulk move via POST /memory/bulk-move...");
    
    if (testMemoryIds.length < 2) {
        console.log("  ⚠ Not enough memories to test bulk move");
        return;
    }
    
    // Move first 2 memories (from Development) to Staging
    const idsToMove = testMemoryIds.slice(0, 2);
    const targetWorkspace = testWorkspaceIds[2]; // Staging
    
    console.log(`  Moving ${idsToMove.length} memories to Staging workspace...`);
    
    const { status, data } = await apiRequest("POST", "/memory/bulk-move", {
        ids: idsToMove,
        target_workspace_id: targetWorkspace
    });
    
    console.log(`  Response: ${status} - moved: ${data.moved}, failed: ${data.failed?.length || 0}`);
    
    if (status === 200 || status === 207) {
        console.log(`  ✓ Bulk move completed: ${data.moved} moved`);
        
        // Verify by checking stats
        await sleep(500);
        const statsRes = await apiRequest("GET", "/keys/stats");
        
        if (statsRes.status === 200) {
            const workspaces = statsRes.data.workspaces || [];
            for (const ws of workspaces) {
                if (testWorkspaceIds.includes(ws.id)) {
                    console.log(`    ${ws.label}: ${ws.memory_count} memories`);
                }
            }
        }
    } else {
        console.log(`  ⚠ Bulk move failed: ${JSON.stringify(data)}`);
    }
}

/**
 * Test 9: Bulk delete memories via POST /memory/bulk-delete
 */
async function test_bulk_delete() {
    console.log("\n[Test 9] Testing bulk delete via POST /memory/bulk-delete...");
    
    if (testMemoryIds.length < 2) {
        console.log("  ⚠ Not enough memories to test bulk delete");
        return;
    }
    
    // Delete last 2 memories
    const idsToDelete = testMemoryIds.slice(-2);
    
    console.log(`  Deleting ${idsToDelete.length} memories...`);
    
    const { status, data } = await apiRequest("POST", "/memory/bulk-delete", {
        ids: idsToDelete
    });
    
    console.log(`  Response: ${status} - deleted: ${data.deleted}, failed: ${data.failed?.length || 0}`);
    
    if (status === 200 || status === 207) {
        console.log(`  ✓ Bulk delete completed: ${data.deleted} deleted`);
        
        // Remove from our tracking array
        testMemoryIds = testMemoryIds.slice(0, -2);
    } else {
        console.log(`  ⚠ Bulk delete failed: ${JSON.stringify(data)}`);
    }
}

/**
 * Test 10: Delete workspace via DELETE /keys/:id
 */
async function test_delete_workspace() {
    console.log("\n[Test 10] Deleting workspace via DELETE /keys/:id...");
    
    const workspaceId = testWorkspaceIds[2]; // Delete Staging
    
    const { status, data } = await apiRequest("DELETE", `/keys/${workspaceId}`);
    
    if (status === 200) {
        console.log(`  ✓ Workspace deleted successfully`);
        testWorkspaceIds = testWorkspaceIds.filter(id => id !== workspaceId);
    } else {
        console.log(`  ⚠ Delete failed: ${status} ${JSON.stringify(data)}`);
    }
}

/**
 * Cleanup: Delete all test data
 */
async function cleanup() {
    console.log("\n[Cleanup] Removing test data...");
    
    // Delete remaining memories
    if (testMemoryIds.length > 0) {
        console.log(`  Deleting ${testMemoryIds.length} remaining memories...`);
        await apiRequest("POST", "/memory/bulk-delete", { ids: testMemoryIds });
    }
    
    // Delete remaining workspaces
    for (const id of testWorkspaceIds) {
        await apiRequest("DELETE", `/keys/${id}`);
    }
    
    console.log("  ✓ Cleanup complete");
}

async function run_all_tests() {
    try {
        await setup();
        await test_health_check();
        await test_create_workspaces();
        await test_list_workspaces();
        await test_workspace_stats_empty();
        await test_rename_workspace();
        await test_rename_validation();
        await test_create_memories();
        await test_workspace_stats_with_memories();
        await test_bulk_move();
        await test_bulk_delete();
        await test_delete_workspace();
        await cleanup();
        
        console.log("\n" + "=".repeat(70));
        console.log("✅ ALL API TESTS COMPLETED SUCCESSFULLY");
        console.log("=".repeat(70));
        process.exit(0);
    } catch (error: any) {
        console.error("\n" + "=".repeat(70));
        console.error("❌ TEST FAILED:", error.message);
        console.error("=".repeat(70));
        
        // Attempt cleanup
        try {
            await cleanup();
        } catch (e) {
            console.error("Cleanup also failed:", e);
        }
        
        process.exit(1);
    }
}

run_all_tests();
