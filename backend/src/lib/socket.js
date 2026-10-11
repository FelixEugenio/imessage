// Express: framework para criar o servidor HTTP e as rotas da API
import express from "express";
// Módulo nativo do Node para criar um servidor HTTP "puro"
// (o Socket.IO precisa disto para se ligar ao mesmo servidor do Express)
import http from "http";
// Servidor do Socket.IO: comunicação em tempo real via WebSocket
import { Server } from "socket.io";

// Cria a aplicação Express (onde se definem as rotas e middlewares)
const app = express();

// Cria um servidor HTTP e entrega-lhe o Express para tratar os pedidos normais.
// Assim, API REST e WebSocket funcionam na mesma porta.
const server = http.createServer(app);

// Origem permitida (CORS): o endereço do frontend.
// Usa a variável de ambiente FRONTEND_URL; se não existir, usa o localhost do Vite (5173).
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

// Cria o servidor Socket.IO em cima do servidor HTTP.
// A opção cors só deixa o frontend indicado ligar-se por WebSocket.
const io = new Server(server, { cors: { origin: [allowedOrigin] } });

// Devolve o id do socket de um utilizador a partir do id dele.
// Se o utilizador estiver offline, devolve undefined.
// É usada no controller de mensagens para enviar em tempo real só a quem está online.
function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Guarda os utilizadores online, no formato { userId: socketId }.
// Fica em memória: perde-se se o servidor reiniciar.
const userSocketMap = {};

// Corre sempre que um cliente se liga por WebSocket
io.on("connection", (socket) => {
  // O frontend envia o userId na ligação (ex.: io(url, { query: { userId } }))
  const userId = socket.handshake.query.userId;

  // Regista o utilizador como online, associando o userId ao id deste socket
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() envia o evento a TODOS os clientes ligados (broadcast).
  // Envia a lista atualizada de ids dos utilizadores online.
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // socket.on() fica à escuta de eventos deste cliente.
  // "disconnect" é disparado quando o utilizador fecha a aba ou perde a ligação.
  socket.on("disconnect", () => {
    // Remove o utilizador da lista de online
    if (userId) delete userSocketMap[userId];
    // Avisa todos os clientes da nova lista de utilizadores online
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Exporta o necessário para outros ficheiros:
// app e server -> para configurar rotas e iniciar o servidor (listen)
// io -> para emitir eventos de qualquer parte (ex.: "newMessage")
// getReceiverSocketId -> para descobrir o socket de um destinatário
export { app, server, io, getReceiverSocketId };