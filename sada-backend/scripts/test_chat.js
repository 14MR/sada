const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

const roomId = "test-room-123";
const userId = "user-123";
const username = "ChatTester";

console.log("🚀 Starting Chat Test...");

socket.on("connect", () => {
    console.log("✅ Connected to Socket.io server with ID:", socket.id);

    // Join Room
    console.log(`Joining room ${roomId}...`);
    socket.emit("join_room", roomId);

    // Send Message after a short delay
    setTimeout(() => {
        console.log(`Sending message...`);
        socket.emit("send_message", {
            roomId,
            message: "Hello SADA!",
            userId,
            username
        });
    }, 1000);
});

socket.on("receive_message", (data) => {
    console.log("✅ Received Message:", data);
    if (data.message === "Hello SADA!" && data.roomId === roomId) {
        console.log("✨ Chat System Verified!");
        socket.disconnect();
        process.exit(0);
    }
});

socket.on("connect_error", (err) => {
    console.error("❌ Connection Error:", err.message);
    process.exit(1);
});

// Timeout if no message received
setTimeout(() => {
    console.error("❌ Test Timed Out");
    socket.disconnect();
    process.exit(1);
}, 5000);
