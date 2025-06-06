const { Server } = require("socket.io");
/**
 * Initialize the Socket.IO server
 * @param {object} server - The HTTP server instance
 * @returns {object} io - The Socket.IO instance
 */
function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: "*", // Allow all origins for now, restrict in production
        },
    });
// Handle connection events
    io.on("connection", (socket) => {
        console.log(`New client connected: ${socket.id}`);

        // Example event listener
        socket.on("message", (data) => {
            console.log(`Message received: ${data}`);
            // Broadcast the message to all connected clients
            io.emit("message", data);
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
}
module.exports = initializeSocket;
