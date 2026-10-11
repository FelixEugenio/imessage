// Modelos do Mongoose (representam as coleções "users" e "messages" no MongoDB)
import User from '../models/user.model'
import Message from '../models/message'

/**
 * Lista todos os utilizadores, exceto o que está autenticado.
 * Serve para mostrar "todos os contactos" na barra lateral.
 */
export async function getUsersForSidebar(req, res) {
    try {
        // _id do utilizador autenticado (colocado em req.user por um middleware de auth)
        const loggedUserId = req.user._id;

        // Busca todos os utilizadores com _id DIFERENTE ($ne = "not equal") do meu
        // .select("-clerkId") exclui o campo clerkId (dado interno, não deve ir ao cliente)
        const filteredUsers = await User.find({ _id: { $ne: loggedUserId } }).select("-clerkId")

        // 200 = OK, devolve a lista em JSON
        res.status(200).json(filteredUsers)

    } catch (err) {
        // Regista o erro no servidor para debugging
        console.log("Error in getUsersForSidebar :", err.message)
        // 500 = erro interno; não expomos detalhes ao cliente
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * Lista só os utilizadores com quem já troquei mensagens,
 * ordenados pela conversa mais recente.
 */
export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    // Aggregation pipeline: cada etapa recebe o resultado da anterior
    const conversations = await Message.aggregate([
      // 1. Filtra: só mensagens que eu enviei OU recebi.
      { $match: { $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }] } },

      // 2. Agrupa: uma linha por interlocutor.
      {
        $group: {
          // O "parceiro" é o outro lado da mensagem:
          // se eu sou o remetente, é o destinatário; caso contrário, é o remetente.
          _id: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] },
          // Guarda a data da mensagem mais recente dessa conversa.
          lastMessageAt: { $max: "$createdAt" },
        },
      },

      // 3. Ordena: conversa mais recente primeiro (-1 = decrescente).
      { $sort: { lastMessageAt: -1 } },

      // 4. "JOIN" com a coleção users: procura o perfil de cada parceiro.
      //    O resultado vem como array no campo "user".
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },

      // 5. Substitui o documento atual pelo primeiro item do array "user",
      //    ou seja, o resultado passa a ser uma lista de perfis de utilizador.
      { $replaceRoot: { newRoot: { $first: "$user" } } },

      // 6. Remove o campo privado clerkId (0 = excluir).
      { $project: { clerkId: 0 } },
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Devolve o histórico de mensagens entre mim e outro utilizador.
 */
export async function getMessages(req, res) {
  try {
    // Pega o id da URL (/messages/:id) e renomeia para userToChatId
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Mensagens nos dois sentidos: eu -> ele OU ele -> eu
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }); // ordem cronológica (mais antiga primeiro)

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Envia uma mensagem (texto, imagem ou vídeo) para outro utilizador.
 */
export async function sendMessage(req, res) {
  try {
    const { text } = req.body;                 // texto vem no corpo do pedido
    const { id: receiverId } = req.params;     // destinatário vem na URL
    const senderId = req.user._id;             // remetente = utilizador autenticado

    let imageUrl;
    let videoUrl;

    // req.file existe se foi enviado um ficheiro (ex.: via multer)
    if (req.file) {
      // Garante que o ImageKit (serviço de armazenamento) está configurado
      if (!hasImageKitConfig()) {
        return res.status(500).json({ message: "Media upload is not configured" });
      }

      // Faz upload do ficheiro e recebe a URL pública
      const url = await uploadChatMedia(req.file);

      // Decide pelo tipo MIME se é vídeo ou imagem
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else imageUrl = url;
    }

    // Cria o documento da mensagem
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    // Persiste no MongoDB
    await newMessage.save();

    // Procura o socket do destinatário (só existe se ele estiver online)
    const receiverSocketId = getReceiverSocketId(receiverId);
    // Só envia em tempo real se o utilizador estiver online
    if (receiverSocketId) {
      // Emite o evento "newMessage" apenas para esse socket (Socket.IO)
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // 201 = Created; devolve a mensagem criada ao remetente
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}