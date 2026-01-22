const { io } = require("socket.io-client");
const http = require("http");

const API_HOST = "localhost";
const API_PORT = 3000;

// Helper to make API requests
function apiRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: "/api" + path,
            method: method,
            headers: {
                "Content-Type": "application/json"
            }
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("🚀 Testing Notifications...");

    // 1. Sign In User A (Sender) and User B (Receiver)
    const rand = Math.floor(Math.random() * 10000);
    const userA = await apiRequest("POST", "/auth/signin", { identityToken: `notif-sender-${rand}`, fullName: "Sender" });
    const userB = await apiRequest("POST", "/auth/signin", { identityToken: `notif-receiver-${rand}`, fullName: "Receiver" });

    const senderId = userA.user.id;
    const receiverId = userB.user.id;

    console.log(`Sender: ${senderId}, Receiver: ${receiverId}`);

    // 2. Connect Receiver to Socket
    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
        console.log("✅ Socket Connected");
        // Identify to join personal channel
        socket.emit("identify", receiverId);
    });

    // 3. Listen for Notifications
    socket.on("notification", (data) => {
        console.log("🔔 Notification Received:", data);

        if (data.type === "new_follower" && data.followerId === senderId) {
            console.log("✅ Follow Notification Verified!");
            // Trigger Gift
            triggerGift();
        } else if (data.type === "gift_received" && data.senderId === senderId) {
            console.log("✅ Gift Notification Verified!");
            console.log("✨ All Notifications Verified!");
            socket.disconnect();
            process.exit(0);
        }
    });

    // 4. Trigger Follow (Wait a bit for socket to connect)
    setTimeout(async () => {
        console.log("Triggering Follow...");
        await apiRequest("POST", `/users/${receiverId}/follow`, { userId: senderId });
    }, 1000);

    async function triggerGift() {
        console.log("Triggering Gift...");
        // Ensure Sender has gems first
        await apiRequest("POST", "/gems/purchase", { userId: senderId, amount: 100 });
        await apiRequest("POST", "/gems/gift", { userId: senderId, receiverId: receiverId, amount: 10 });
    }

    // Timeout
    setTimeout(() => {
        console.error("❌ Test Timed Out");
        process.exit(1);
    }, 10000);
}

run();
