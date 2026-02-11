/**
 * End-to-end test for Memory Workspace Management
 * Tests: workspace creation, renaming, statistics, bulk operations
 * 
 * This test focuses on the database queries for workspace management
 * without relying on the full memory creation pipeline.
 */

import { q, run_async } from "../src/core/db";
import crypto from "crypto";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TEST_USER_ID = `test_workspace_user_${Date.now()}`;

async function cleanup() {
    console.log("\n[Cleanup] Removing test data...");
    try {
        await run_async(`DELETE FROM memories WHERE user_id = '${TEST_USER_ID}'`);
        await run_async(`DELETE FROM api_keys WHERE user_id = '${TEST_USER_ID}'`);
    } catch (e) {
        console.log("  Cleanup warning:", e);
    }
}

/**
 * Test 1: Create multiple workspaces
 */
async function test_create_workspaces(): Promise<string[]> {
    console.log("\n[Test 1] Creating multiple workspaces...");
    
    const workspaceIds: string[] = [];
    const labels = ["Development", "Production", "Testing"];
    
    for (const label of labels) {
        const id = crypto.randomUUID();
        const secret_key = `opm_sk_${crypto.randomBytes(24).toString("hex")}`;
        const created_at = Date.now();
        
        await q.ins_memory_key.run(id, TEST_USER_ID, label, secret_key, created_at);
        workspaceIds.push(id);
        console.log(`  ✓ Created workspace: ${label} (${id})`);
    }
    
    // Verify workspaces were created
    const workspaces = await q.get_memory_keys_by_user.all(TEST_USER_ID);
    if (workspaces.length !== 3) {
        throw new Error(`Expected 3 workspaces, got ${workspaces.length}`);
    }
    
    console.log(`  ✓ Verified ${workspaces.length} workspaces exist`);
    return workspaceIds;
}

/**
 * Test 2: Rename a workspace
 */
async function test_rename_workspace(workspaceId: string) {
    console.log("\n[Test 2] Renaming workspace...");
    
    const newLabel = "Development-Renamed";
    const updated_at = Date.now();
    
    await q.upd_memory_key_label.run(newLabel, updated_at, workspaceId, TEST_USER_ID);
    
    // Verify rename
    const workspaces = await q.get_memory_keys_by_user.all(TEST_USER_ID);
    const renamed = workspaces.find(w => w.id === workspaceId);
    
    if (!renamed || renamed.label !== newLabel) {
        throw new Error(`Rename failed: expected "${newLabel}", got "${renamed?.label}"`);
    }
    
    console.log(`  ✓ Workspace renamed to: ${newLabel}`);
}

/**
 * Test 3: Create memories directly in database (bypassing embedding)
 */
async function test_create_memories_in_workspaces(workspaceIds: string[]): Promise<string[]> {
    console.log("\n[Test 3] Creating memories in different workspaces...");
    
    const memoryIds: string[] = [];
    const timestamp = Date.now();
    
    // Create 2 memories in workspace 1
    for (let i = 0; i < 2; i++) {
        const id = crypto.randomUUID();
        await run_async(
            `INSERT INTO memories (id, user_id, content, primary_sector, created_at, memory_key_id) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, TEST_USER_ID, `Memory ${i + 1} in workspace 1 - ${timestamp}`, 'semantic', timestamp, workspaceIds[0]]
        );
        memoryIds.push(id);
        console.log(`  ✓ Created memory in workspace 1: ${id}`);
    }
    
    // Create 3 memories in workspace 2
    for (let i = 0; i < 3; i++) {
        const id = crypto.randomUUID();
        await run_async(
            `INSERT INTO memories (id, user_id, content, primary_sector, created_at, memory_key_id) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, TEST_USER_ID, `Memory ${i + 1} in workspace 2 - ${timestamp}`, 'semantic', timestamp, workspaceIds[1]]
        );
        memoryIds.push(id);
        console.log(`  ✓ Created memory in workspace 2: ${id}`);
    }
    
    // Create 1 memory in workspace 3
    const id = crypto.randomUUID();
    await run_async(
        `INSERT INTO memories (id, user_id, content, primary_sector, created_at, memory_key_id) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, TEST_USER_ID, `Memory 1 in workspace 3 - ${timestamp}`, 'semantic', timestamp, workspaceIds[2]]
    );
    memoryIds.push(id);
    console.log(`  ✓ Created memory in workspace 3: ${id}`);
    
    console.log(`  ✓ Total memories created: ${memoryIds.length}`);
    return memoryIds;
}

/**
 * Test 4: Get workspace statistics (memory counts)
 */
async function test_workspace_statistics(workspaceIds: string[]) {
    console.log("\n[Test 4] Testing workspace statistics...");
    
    const counts = await q.get_memory_counts_by_key.all(TEST_USER_ID);
    console.log("  Memory counts by workspace:", counts);
    
    // Create a map for easy lookup
    const countMap = new Map<string, number>();
    for (const item of counts) {
        if (item.memory_key_id) {
            countMap.set(item.memory_key_id, Number(item.count));
        }
    }
    
    // Verify counts
    const ws1Count = countMap.get(workspaceIds[0]) || 0;
    const ws2Count = countMap.get(workspaceIds[1]) || 0;
    const ws3Count = countMap.get(workspaceIds[2]) || 0;
    
    console.log(`  Workspace 1 count: ${ws1Count} (expected: 2)`);
    console.log(`  Workspace 2 count: ${ws2Count} (expected: 3)`);
    console.log(`  Workspace 3 count: ${ws3Count} (expected: 1)`);
    
    if (ws1Count !== 2) throw new Error(`Workspace 1: expected 2, got ${ws1Count}`);
    if (ws2Count !== 3) throw new Error(`Workspace 2: expected 3, got ${ws2Count}`);
    if (ws3Count !== 1) throw new Error(`Workspace 3: expected 1, got ${ws3Count}`);
    
    console.log("  ✓ All workspace statistics are correct");
}

/**
 * Test 5: Bulk move memories between workspaces
 */
async function test_bulk_move(memoryIds: string[], workspaceIds: string[]) {
    console.log("\n[Test 5] Testing bulk move...");
    
    // Move first 2 memories (from workspace 1) to workspace 3
    const idsToMove = memoryIds.slice(0, 2);
    const targetWorkspace = workspaceIds[2];
    const updated_at = Date.now();
    
    console.log(`  Moving ${idsToMove.length} memories to workspace 3...`);
    await q.bulk_upd_mem_key.run(targetWorkspace, updated_at, idsToMove, TEST_USER_ID);
    
    // Verify the move by checking statistics
    await sleep(200);
    const counts = await q.get_memory_counts_by_key.all(TEST_USER_ID);
    
    const countMap = new Map<string, number>();
    for (const item of counts) {
        if (item.memory_key_id) {
            countMap.set(item.memory_key_id, Number(item.count));
        }
    }
    
    const ws1Count = countMap.get(workspaceIds[0]) || 0;
    const ws3Count = countMap.get(workspaceIds[2]) || 0;
    
    console.log(`  Workspace 1 count after move: ${ws1Count} (expected: 0)`);
    console.log(`  Workspace 3 count after move: ${ws3Count} (expected: 3)`);
    
    if (ws1Count !== 0) throw new Error(`Workspace 1 after move: expected 0, got ${ws1Count}`);
    if (ws3Count !== 3) throw new Error(`Workspace 3 after move: expected 3, got ${ws3Count}`);
    
    console.log("  ✓ Bulk move successful");
}

/**
 * Test 6: Bulk delete memories
 */
async function test_bulk_delete(memoryIds: string[]) {
    console.log("\n[Test 6] Testing bulk delete...");
    
    // Delete the last 2 memories
    const idsToDelete = memoryIds.slice(-2);
    
    console.log(`  Deleting ${idsToDelete.length} memories...`);
    await q.bulk_del_mem.run(idsToDelete, TEST_USER_ID);
    
    // Verify deletion
    await sleep(200);
    for (const id of idsToDelete) {
        const mem = await q.get_mem.get(id);
        if (mem) {
            throw new Error(`Memory ${id} should have been deleted`);
        }
    }
    
    console.log("  ✓ Bulk delete successful");
}

/**
 * Test 7: Delete a workspace
 */
async function test_delete_workspace(workspaceId: string) {
    console.log("\n[Test 7] Testing workspace deletion...");
    
    await q.del_memory_key.run(workspaceId, TEST_USER_ID);
    
    // Verify deletion
    const workspaces = await q.get_memory_keys_by_user.all(TEST_USER_ID);
    const deleted = workspaces.find(w => w.id === workspaceId);
    
    if (deleted) {
        throw new Error(`Workspace ${workspaceId} should have been deleted`);
    }
    
    console.log("  ✓ Workspace deleted successfully");
}

async function run_all_tests() {
    console.log("=".repeat(60));
    console.log("Memory Workspace Management - End-to-End Tests");
    console.log("=".repeat(60));
    
    try {
        // Initialize database by making a simple query
        console.log("\n[Init] Initializing database...");
        await sleep(1000); // Give time for db to initialize
        console.log("  ✓ Database initialized");
        
        // Cleanup any previous test data
        await cleanup();
        
        // Run tests
        const workspaceIds = await test_create_workspaces();
        await test_rename_workspace(workspaceIds[0]);
        const memoryIds = await test_create_memories_in_workspaces(workspaceIds);
        await test_workspace_statistics(workspaceIds);
        await test_bulk_move(memoryIds, workspaceIds);
        await test_bulk_delete(memoryIds);
        await test_delete_workspace(workspaceIds[0]);
        
        // Final cleanup
        await cleanup();
        
        console.log("\n" + "=".repeat(60));
        console.log("✅ ALL TESTS PASSED");
        console.log("=".repeat(60));
        process.exit(0);
    } catch (error) {
        console.error("\n" + "=".repeat(60));
        console.error("❌ TEST FAILED:", error);
        console.error("=".repeat(60));
        
        // Cleanup on failure
        await cleanup();
        process.exit(1);
    }
}

run_all_tests();
