import { q } from "../../core/db";
import { env } from "../../core/cfg";
import crypto from "crypto";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-01-27.acacia" as any,
});

import { createClerkClient, verifyToken } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const auth = (app: any) => {
    // Sync user from Clerk with JWT verification
    app.post("/auth/clerk-sync", async (req: any, res: any) => {
        try {
            const token = req.headers.authorization?.replace("Bearer ", "");
            if (!token) return res.status(401).json({ error: "No token provided" });

            const session = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
            const clerk_id = session.sub;
            const { email } = req.body;

            let user = await q.get_user_by_clerk_id.get(clerk_id);
            if (!user) {
                // Create new user
                const user_id = crypto.randomUUID();
                const api_key = `opm_${crypto.randomBytes(24).toString("hex")}`;

                // Create Stripe customer
                let stripe_customer_id = "";
                try {
                    const customer = await stripe.customers.create({
                        email,
                        metadata: { clerk_id, user_id },
                    });
                    stripe_customer_id = customer.id;
                } catch (e) {
                    console.error("[STRIPE] Customer creation failed:", e);
                }

                await q.ins_user.run(
                    user_id,
                    clerk_id,
                    api_key,
                    stripe_customer_id,
                    null, // subscription_id
                    100,  // free tier capacity (100 memories)
                    0,    // current usage
                    "",   // summary
                    0,    // reflection_count
                    Date.now(),
                    Date.now()
                );
                user = await q.get_user_by_clerk_id.get(clerk_id);
            } else if (!user.stripe_customer_id && email) {
                // Backward compatibility: create Stripe customer for existing user
                try {
                    const customer = await stripe.customers.create({
                        email,
                        metadata: { clerk_id: user.clerk_id, user_id: user.user_id },
                    });
                    await q.upd_user_billing.run(
                        user.user_id,
                        customer.id,
                        user.stripe_subscription_id,
                        user.memory_capacity,
                        Date.now()
                    );
                    user.stripe_customer_id = customer.id;
                    console.log(`[STRIPE] Fixed missing customer for ${clerk_id}`);
                } catch (e) {
                    console.error("[STRIPE] Customer repair failed:", e);
                }
            }

            res.json(user);
        } catch (err: any) {
            console.error("[AUTH] Clerk Sync Error:", err);
            res.status(500).json({ error: err.message, stack: err.stack });
        }
    });

    // Create Stripe Checkout Session with JWT verification
    app.post("/auth/create-checkout", async (req: any, res: any) => {
        try {
            const token = req.headers.authorization?.replace("Bearer ", "");
            if (!token) return res.status(401).json({ error: "No token provided" });

            const clerkSession = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
            const clerk_id = clerkSession.sub;
            const { plan } = req.body;

            const user = await q.get_user_by_clerk_id.get(clerk_id);
            if (!user) return res.status(404).json({ error: "User not found" });

            const priceMap: Record<string, number> = {
                "starter": 2000,    // $20.00/month
                "pro": 10000,       // $100.00/month
            };

            const checkoutOptions: Stripe.Checkout.SessionCreateParams = {
                payment_method_types: ["card"],
                line_items: [{
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `OpenMemory ${plan.toUpperCase()} Plan`,
                        },
                        unit_amount: priceMap[plan] || 2000,
                        recurring: { interval: "month" },
                    },
                    quantity: 1,
                }],
                mode: "subscription",
                success_url: `${process.env.DASHBOARD_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.DASHBOARD_URL}/cancel`,
                metadata: { clerk_id, plan },
            };

            if (user.stripe_customer_id) {
                checkoutOptions.customer = user.stripe_customer_id;
            } else {
                // Should have been fixed by clerk-sync, but use email as fallback
                const clerkUser = await clerk.users.getUser(clerk_id);
                checkoutOptions.customer_email = clerkUser.emailAddresses[0]?.emailAddress;
            }

            const session = await stripe.checkout.sessions.create(checkoutOptions);

            res.json({ url: session.url });
        } catch (err: any) {
            console.error("[STRIPE] Checkout Error:", err);
            res.status(500).json({ error: err.message, stack: err.stack });
        }
    });

    // Create Stripe Customer Portal Session
    app.post("/auth/create-portal", async (req: any, res: any) => {
        try {
            const token = req.headers.authorization?.replace("Bearer ", "");
            if (!token) return res.status(401).json({ error: "No token provided" });

            const clerkSession = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
            const clerk_id = clerkSession.sub;

            const user = await q.get_user_by_clerk_id.get(clerk_id);
            if (!user || !user.stripe_customer_id) {
                return res.status(400).json({ error: "User or customer not found" });
            }

            const session = await stripe.billingPortal.sessions.create({
                customer: user.stripe_customer_id,
                return_url: `${process.env.DASHBOARD_URL}/dashboard`,
            });

            res.json({ url: session.url });
        } catch (err: any) {
            console.error("[STRIPE] Portal Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // Stripe Webhook
    app.post("/auth/stripe-webhook", async (req: any, res: any) => {
        const sig = req.headers["stripe-signature"];
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.rawBody || JSON.stringify(req.body),
                sig,
                process.env.STRIPE_WEBHOOK_SECRET || ""
            );
        } catch (err: any) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const clerk_id = session.metadata?.clerk_id;
            const plan = session.metadata?.plan;

            if (clerk_id) {
                const user = await q.get_user_by_clerk_id.get(clerk_id);
                if (user) {
                    const capacityMap: Record<string, number> = {
                        "starter": 10000,    // 10,000 memories
                        "pro": 100000,       // 100,000 memories
                    };
                    const new_capacity = capacityMap[plan!] || 10000;
                    await q.upd_user_billing.run(
                        user.user_id,
                        user.stripe_customer_id,
                        session.subscription as string,
                        new_capacity,
                        Date.now()
                    );
                    console.log(`[STRIPE] Updated capacity for ${clerk_id} to ${new_capacity}`);
                }
            }
        } else if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            const customer_id = subscription.customer as string;

            // Downgrade user to free tier
            const user = await q.get_user_by_stripe_customer_id.get(customer_id);
            if (user) {
                await q.upd_user_billing.run(
                    user.user_id,
                    user.stripe_customer_id,
                    null,
                    100, // back to free tier (100 memories)
                    Date.now()
                );
                console.log(`[STRIPE] Downgraded ${user.clerk_id} to free tier`);
            }
        }

        res.json({ received: true });
    });
};
