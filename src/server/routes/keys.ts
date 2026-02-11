import { q } from "../../core/db";
import crypto from "crypto";
import { verifyToken } from "@clerk/backend";

async function verifyClerkToken(req: any): Promise<any | null> {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    try {
        const session = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        const user = await q.get_user_by_clerk_id.get(session.sub);
        return user;
    } catch {
        return null;
    }
}

export function keys(app: any) {
    app.get("/keys", async (req: any, res: any) => {
        // Try API key auth first, then Clerk JWT
        let user = req.user;
        if (!user?.user_id) {
            user = await verifyClerkToken(req);
        }
        if (!user?.user_id) return res.status(401).json({ error: "Unauthorized" });
        
        try {
            const keys = await q.get_memory_keys_by_user.all(user.user_id);
            res.json({ keys });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post("/keys", async (req: any, res: any) => {
        let user = req.user;
        if (!user?.user_id) {
            user = await verifyClerkToken(req);
        }
        if (!user?.user_id) return res.status(401).json({ error: "Unauthorized" });
        
        const { label } = req.body;
        if (!label) return res.status(400).json({ error: "Label is required" });

        try {
            const id = crypto.randomUUID();
            const secret_key = `opm_sk_${crypto.randomBytes(24).toString("hex")}`;
            await q.ins_memory_key.run(id, user.user_id, label, secret_key, Date.now());
            res.json({ id, label, secret_key });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.patch("/keys/:id", async (req: any, res: any) => {
        let user = req.user;
        if (!user?.user_id) {
            user = await verifyClerkToken(req);
        }
        if (!user?.user_id) return res.status(401).json({ error: "Unauthorized" });
        
        const { id } = req.params;
        const { label } = req.body;
        
        // Validate label is non-empty (reject empty or whitespace-only labels)
        if (!label || typeof label !== 'string' || label.trim().length === 0) {
            return res.status(400).json({ error: "Label is required" });
        }
        
        try {
            const updated_at = Date.now();
            await q.upd_memory_key_label.run(label, updated_at, id, user.user_id);
            res.json({ id, label, updated_at });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete("/keys/:id", async (req: any, res: any) => {
        let user = req.user;
        if (!user?.user_id) {
            user = await verifyClerkToken(req);
        }
        if (!user?.user_id) return res.status(401).json({ error: "Unauthorized" });
        
        const { id } = req.params;
        try {
            await q.del_memory_key.run(id, user.user_id);
            res.json({ ok: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // GET /keys/stats - Get workspace statistics with memory counts
    app.get("/keys/stats", async (req: any, res: any) => {
        let user = req.user;
        if (!user?.user_id) {
            user = await verifyClerkToken(req);
        }
        if (!user?.user_id) return res.status(401).json({ error: "Unauthorized" });

        try {
            // Get all workspaces for the user (already sorted by created_at desc)
            const workspaces = await q.get_memory_keys_by_user.all(user.user_id);
            
            // Get memory counts grouped by memory_key_id
            const memoryCounts = await q.get_memory_counts_by_key.all(user.user_id);
            
            // Create a map of memory_key_id -> count for efficient lookup
            const countMap = new Map<string, number>();
            for (const item of memoryCounts) {
                if (item.memory_key_id) {
                    countMap.set(item.memory_key_id, item.count);
                }
            }
            
            // Merge workspaces with memory counts (default to 0 if no memories)
            const workspacesWithStats = workspaces.map((workspace: any) => ({
                id: workspace.id,
                label: workspace.label,
                secret_key: workspace.secret_key,
                created_at: workspace.created_at,
                memory_count: countMap.get(workspace.id) || 0
            }));
            
            res.json({ workspaces: workspacesWithStats });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });
}
