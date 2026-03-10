import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.set('trust proxy', 1);
    app.use(express.json({ limit: '50mb' }));
    app.use(session({
        secret: "gemmy-media-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: true,
            sameSite: 'none',
            httpOnly: true,
        }
    }));

    const USERS_FILE = path.join(__dirname, "data", "users.json");

    async function getUsers() {
        try {
            const data = await fs.readFile(USERS_FILE, "utf-8");
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async function saveUsers(users: any[]) {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    }

    // Auth Routes
    app.post("/api/auth/signup", async (req, res) => {
        const { username, password, email } = req.body;
        const users = await getUsers();
        
        if (users.find((u: any) => u.username === username)) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now(), username, email, password: hashedPassword };
        users.push(newUser);
        await saveUsers(users);

        (req.session as any).userId = newUser.id;
        (req.session as any).username = newUser.username;
        res.json({ success: true, user: { id: newUser.id, username: newUser.username } });
    });

    app.post("/api/auth/login", async (req, res) => {
        const { username, password } = req.body;
        const users = await getUsers();
        const user = users.find((u: any) => u.username === username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        (req.session as any).userId = user.id;
        (req.session as any).username = user.username;
        res.json({ success: true, user: { id: user.id, username: user.username } });
    });

    app.post("/api/auth/logout", (req, res) => {
        req.session.destroy(() => {
            res.json({ success: true });
        });
    });

    app.get("/api/auth/me", (req, res) => {
        if ((req.session as any).userId) {
            res.json({ user: { id: (req.session as any).userId, username: (req.session as any).username } });
        } else {
            res.json({ user: null });
        }
    });

    const REVIEWS_FILE = path.join(__dirname, "data", "reviews.json");

    async function getReviews() {
        try {
            const data = await fs.readFile(REVIEWS_FILE, "utf-8");
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async function saveReviews(reviews: any[]) {
        await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
    }

    // Review Routes
    app.get("/api/reviews/:contentId", async (req, res) => {
        const { contentId } = req.params;
        const reviews = await getReviews();
        const contentReviews = reviews.filter((r: any) => r.contentId === contentId);
        res.json(contentReviews);
    });

    app.get("/api/reviews/stats/all", async (req, res) => {
        const reviews = await getReviews();
        const stats: Record<string, { avg: number; count: number }> = {};
        
        reviews.forEach((r: any) => {
            if (!stats[r.contentId]) {
                stats[r.contentId] = { sum: 0, count: 0 } as any;
            }
            (stats[r.contentId] as any).sum += r.rating;
            stats[r.contentId].count += 1;
        });

        const finalStats: Record<string, { avg: number; count: number }> = {};
        for (const id in stats) {
            finalStats[id] = {
                avg: parseFloat(((stats[id] as any).sum / stats[id].count).toFixed(1)),
                count: stats[id].count
            };
        }
        res.json(finalStats);
    });

    app.post("/api/reviews", async (req, res) => {
        if (!(req.session as any).userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { contentId, rating, comment } = req.body;
        const reviews = await getReviews();
        
        const newReview = {
            id: Date.now(),
            contentId,
            userId: (req.session as any).userId,
            username: (req.session as any).username,
            rating: parseInt(rating),
            comment,
            date: new Date().toISOString()
        };

        reviews.push(newReview);
        await saveReviews(reviews);
        res.json({ success: true, review: newReview });
    });

    // API Routes
    app.get("/api/data/:type", async (req, res) => {
        try {
            const { type } = req.params;
            const filePath = path.join(__dirname, "data", `${type}.json`);
            const data = await fs.readFile(filePath, "utf-8");
            res.json(JSON.parse(data));
        } catch (error) {
            res.status(500).json({ error: "Failed to read data" });
        }
    });

    app.post("/api/data/:type", async (req, res) => {
        try {
            const { type } = req.params;
            const filePath = path.join(__dirname, "data", `${type}.json`);
            await fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Failed to save data" });
        }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static("dist"));
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
