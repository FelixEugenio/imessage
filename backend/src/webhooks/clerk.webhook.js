// Importa o Express para criar o router (agrupador de rotas).
import express from "express";

// Importa o modelo "User" do Mongoose, usado para guardar/atualizar/apagar utilizadores na base de dados.
import User from "../models/user.model.js";

// Função do Clerk que verifica se o webhook é autêntico (assinatura válida).
import { verifyWebhook } from "@clerk/backend/webhooks";

// Cria um router independente. No index.js é montado num caminho, ex.: /api/webhooks/clerk
const router = express.Router();

// Define a rota POST "/" (o Clerk envia os eventos por POST).
router.post("/", async (req, res) => {
  try {
    // Lê do .env o segredo de assinatura do webhook (fornecido no painel do Clerk).
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    // Sem o segredo não é possível verificar o pedido: responde 503 (serviço indisponível) e termina.
    if (!signingSecret) {
      res.status(503).json({ message: "Webhook secret is not provided" });
      return;
    }

    // O verificador do Clerk espera um "Request" da Web com o corpo original (raw).
    // O express.raw() entrega o corpo como Buffer, por isso convertemos para texto (utf8).
    // Se por alguma razão não for Buffer, converte para string na mesma.
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);

    // Cria um objeto Request padrão com os mesmos cabeçalhos (onde vai a assinatura) e o corpo original.
    // O URL é fictício: só serve para construir o Request, não é chamado.
    const request = new Request("http://internal/webhooks/clerk", {
      method: "POST",
      headers: new Headers(req.headers),
      body: payload,
    });

    // Verifica a assinatura. Lança erro se for falsa ou se o corpo tiver sido alterado.
    // Só depois disto é seguro confiar no conteúdo de "evt".
    const evt = await verifyWebhook(request, { signingSecret });

    // Evento: utilizador criado ou atualizado no Clerk.
    if (evt.type === "user.created" || evt.type === "user.updated") {
      // Dados do utilizador enviados pelo Clerk.
      const u = evt.data;

      // Escolhe o email principal (o que corresponde a primary_email_address_id).
      // Se não encontrar, usa o primeiro email da lista.
      const email =
        u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ??
        u.email_addresses?.[0]?.email_address;

      // Monta o nome completo: nome + apelido (ignorando os vazios).
      // Se não houver nome, usa o username; se também não, usa a parte do email antes do "@".
      const fullName =
        [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || email?.split("@")[0];

      // Procura o utilizador pelo clerkId e atualiza; se não existir, cria (upsert).
      // new: true            -> devolve o documento já atualizado
      // upsert: true         -> cria se não existir
      // setDefaultsOnInsert  -> aplica os valores por defeito do schema ao criar
      await User.findOneAndUpdate(
        { clerkId: u.id },
        { clerkId: u.id, email, fullName, profilePic: u.image_url },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    }

    // Evento: utilizador apagado no Clerk.
    if (evt.type === "user.deleted") {
      // Se vier o id, remove da base de dados o utilizador com esse clerkId.
      if (evt.data.id) await User.findOneAndDelete({ clerkId: evt.data.id });
    }

    // Responde 200 para o Clerk saber que o evento foi recebido (senão tenta reenviar).
    res.status(200).json({ received: true });
  } catch (error) {
    // Qualquer erro (assinatura inválida, falha na base de dados...) é registado no log.
    console.error("Error in Clerk webhook:", error);

    // Responde 400 com uma mensagem genérica, sem expor detalhes internos.
    res.status(400).json({ message: "Webhook verification failed" });
  }
});

// Exporta o router para ser usado no index.js.
export default router;