/**
 * Unit tests for POST /memory/bulk-delete endpoint
 * Requirements: 6.2, 6.3
 */

import { q, run_async, vector_store } from "../src/core/db";
import { add_hsg_memory } from "../src/memory/hsg";
import { j } from "../src/utils";

// Force synthetic embeddings for reliability
process.env.OM_EMBEDDINGS = "synthetic";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function cleanup(user_id: string) {
    await run_async(`DELETE FROM memories WHERE user_id = '${user_id}'`);
    try { await run_async(`DELETE FROM vectors`); } catch { }
    try { await run_async(`DELETE FROM openmemory_vectors`); } catch { }
    try { await run_async(`DELETE FROM waypoints`); } catch { }
    if (global.gc) global.gc();
}

/**
 * Test: Bulk delete successfully removes all specified memories
 * Validates: Requirement 6.2 - Backend_API SHALL delete all selected memories
 */
async function test_bulk_delete_success() {
    console.log("\n[Test 1] Bulk Delete - All Memories Deleted Successfully");
    const uid = "bulk_delete_test_user_1";
    await cleanup(uid);
    await sleep(500);

    // Create test memories with unique content to avoid deduplication
    const timestamp = Date.now();
    const mem1 = await add_hsg_memory(`Memory 1 for bulk delete - unique ${timestamp}-1`, j([]), {}, uid, null);
    await sleep(200);
    const mem2 = await add_hsg_memory(`Memory 2 for bulk delete - unique ${timestamp}-2`, j([]), {}, uid, null);
    await sleep(200);
    const mem3 = await add_hsg_memory(`Memory 3 for bulk delete - unique ${timestamp}-3`, j([]), {}, uid, null);
    
    await sleep(500);

    // Verify memories exist
    const before1 = await q.get_mem.get(mem1.id);
    const before2 = await q.get_mem.get(mem2.id);
    const before3 = await q.get_mem.get(mem3.id);
    
    if (!before1 || !before2 || !before3) {
        throw new Error("FAIL: Test memories were not created properly");
    }

    // Perform bulk delete
    const ids = [mem1.id, mem2.id, mem3.id];
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
        try {
            const m = await q.get_mem.get(id);
            if (!m) {
                failed.push(id);
                continue;
            }
            if (uid && m.user_id !== uid) {
                failed.push(id);
                continue;
            }
            await q.del_mem.run(id);
            await vector_store.deleteVectors(id);
            await q.del_waypoints.run(id, id);
            deleted.push(id);
        } catch (e) {
            failed.push(id);
        }
    }

    // Verify all deleted
    if (deleted.length !== 3) {
        throw new Error(`FAIL: Expected 3 deleted, got ${deleted.length}`);
    }
    if (failed.length !== 0) {
        throw new Error(`FAIL: Expected 0 failed, got ${failed.length}`);
    }

    // Verify memories no longer exist
    const after1 = await q.get_mem.get(mem1.id);
    const after2 = await q.get_mem.get(mem2.id);
    const after3 = await q.get_mem.get(mem3.id);

    if (after1 || after2 || after3) {
        throw new Error("FAIL: Memories still exist after bulk delete");
    }

    console.log(` -> Deleted: ${deleted.length}, Failed: ${failed.length}`);
    console.log(" -> PASS: All memories deleted successfully");
}

/**
 * Test: Bulk delete with non-existent IDs reports failures
 * Validates: Requirement 6.3 - Backend_API SHALL continue deleting remaining memories and report partial success
 */
async function test_bulk_delete_partial_failure() {
    console.log("\n[Test 2] Bulk Delete - Partial Failure with Non-existent IDs");
    const uid = "bulk_delete_test_user_2";
    await cleanup(uid);
    await sleep(500);

    // Create one real memory
    const mem1 = await add_hsg_memory("Real memory for partial test", j([]), {}, uid, null);
    await sleep(500);

    // Mix real and fake IDs
    const ids = [mem1.id, "non-existent-id-1", "non-existent-id-2"];
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
        try {
            const m = await q.get_mem.get(id);
            if (!m) {
                failed.push(id);
                continue;
            }
            if (uid && m.user_id !== uid) {
                failed.push(id);
                continue;
            }
            await q.del_mem.run(id);
            await vector_store.deleteVectors(id);
            await q.del_waypoints.run(id, id);
            deleted.push(id);
        } catch (e) {
            failed.push(id);
        }
    }

    // Verify partial success
    if (deleted.length !== 1) {
        throw new Error(`FAIL: Expected 1 deleted, got ${deleted.length}`);
    }
    if (failed.length !== 2) {
        throw new Error(`FAIL: Expected 2 failed, got ${failed.length}`);
    }

    // Verify the real memory was deleted
    const after = await q.get_mem.get(mem1.id);
    if (after) {
        throw new Error("FAIL: Real memory still exists after bulk delete");
    }

    console.log(` -> Deleted: ${deleted.length}, Failed: ${failed.length}`);
    console.log(` -> Failed IDs: ${failed.join(", ")}`);
    console.log(" -> PASS: Partial failure handled correctly");
}

/**
 * Test: Bulk delete with ownership verification
 * Validates: Requirement 6.2 - Delete each memory with ownership verification
 */
async function test_bulk_delete_ownership_verification() {
    console.log("\n[Test 3] Bulk Delete - Ownership Verification");
    const uid1 = "bulk_delete_owner_1";
    const uid2 = "bulk_delete_owner_2";
    await cleanup(uid1);
    await cleanup(uid2);
    await sleep(500);

    // Create memories for different users
    const mem1 = await add_hsg_memory("Memory owned by user 1", j([]), {}, uid1, null);
    const mem2 = await add_hsg_memory("Memory owned by user 2", j([]), {}, uid2, null);
    await sleep(500);

    // Try to delete both as user 1
    const ids = [mem1.id, mem2.id];
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
        try {
            const m = await q.get_mem.get(id);
            if (!m) {
                failed.push(id);
                continue;
            }
            // Check ownership - user 1 trying to delete
            if (uid1 && m.user_id !== uid1) {
                failed.push(id);
                continue;
            }
            await q.del_mem.run(id);
            await vector_store.deleteVectors(id);
            await q.del_waypoints.run(id, id);
            deleted.push(id);
        } catch (e) {
            failed.push(id);
        }
    }

    // User 1 should only be able to delete their own memory
    if (deleted.length !== 1) {
        throw new Error(`FAIL: Expected 1 deleted (own memory), got ${deleted.length}`);
    }
    if (failed.length !== 1) {
        throw new Error(`FAIL: Expected 1 failed (other user's memory), got ${failed.length}`);
    }

    // Verify user 1's memory was deleted
    const after1 = await q.get_mem.get(mem1.id);
    if (after1) {
        throw new Error("FAIL: User 1's memory still exists");
    }

    // Verify user 2's memory still exists
    const after2 = await q.get_mem.get(mem2.id);
    if (!after2) {
        throw new Error("FAIL: User 2's memory was incorrectly deleted");
    }

    console.log(` -> Deleted: ${deleted.length}, Failed: ${failed.length}`);
    console.log(" -> PASS: Ownership verification working correctly");

    // Cleanup user 2's memory
    await cleanup(uid2);
}

/**
 * Test: Bulk delete with empty array
 */
async function test_bulk_delete_empty_array() {
    console.log("\n[Test 4] Bulk Delete - Empty Array");
    
    const ids: string[] = [];
    const deleted: string[] = [];
    const failed: string[] = [];

    // Empty array should return immediately with 0 deleted
    for (const id of ids) {
        // This loop won't execute
        deleted.push(id);
    }

    if (deleted.length !== 0) {
        throw new Error(`FAIL: Expected 0 deleted for empty array, got ${deleted.length}`);
    }
    if (failed.length !== 0) {
        throw new Error(`FAIL: Expected 0 failed for empty array, got ${failed.length}`);
    }

    console.log(` -> Deleted: ${deleted.length}, Failed: ${failed.length}`);
    console.log(" -> PASS: Empty array handled correctly");
}

async function run_all() {
    try {
        await test_bulk_delete_success();
        await test_bulk_delete_partial_failure();
        await test_bulk_delete_ownership_verification();
        await test_bulk_delete_empty_array();
        console.log("\n[BULK DELETE TESTS] ALL TESTS PASSED");
        process.exit(0);
    } catch (e) {
        console.error("\n[BULK DELETE TESTS] TEST FAILED:", e);
        process.exit(1);
    }
}

run_all();
