require('dotenv').config();
const { createWebSocketServer } = require('../services/websocket');

createWebSocketServer(8080);
