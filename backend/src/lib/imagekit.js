// Importa o SDK oficial do ImageKit para Node.js
// "toFile" é um helper que converte um Buffer num objeto de ficheiro aceite pelo SDK
import ImageKit, { toFile } from "@imagekit/nodejs";

// Cria a instância do cliente ImageKit.
// A privateKey vem das variáveis de ambiente (.env), nunca deve ficar escrita no código.
const imagekit = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY });

// Verifica se o ImageKit está configurado.
// Devolve true se a variável IMAGEKIT_PRIVATE_KEY existir e não estiver vazia.
// Útil para desativar uploads (ou mostrar um erro claro) quando a chave não está definida.
function hasImageKitConfig() {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY);
}

// Gera um nome de ficheiro seguro e único para cada upload.
// Exemplo:
//   originalName = "My Photo (1).png"
//   resultado    = "chat-1749300000000-My_Photo__1_.png"
function createFileName(originalName = "upload") {
  // Substitui qualquer caracter que NÃO seja letra, número, ponto, underscore ou hífen por "_"
  // Isto evita espaços, parênteses, acentos e outros caracteres problemáticos em URLs
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Adiciona o prefixo "chat-" e o timestamp atual (Date.now())
  // O timestamp garante que dois ficheiros com o mesmo nome não se sobrepõem
  return `chat-${Date.now()}-${safeName}`;
}

/**
 * Faz upload de uma imagem ou vídeo para o ImageKit
 * @see https://imagekit.io/docs/api-reference/upload-file/upload-file
 *
 * @param file - ficheiro recebido do multer (tem .buffer, .originalname e .mimetype)
 * @returns a URL pública do ficheiro enviado
 */
async function uploadChatMedia(file) {
  // Gera o nome seguro e único para o ficheiro
  const fileName = createFileName(file.originalname);

  const result = await imagekit.files.upload({
    // Converte o buffer em memória (do multer) num ficheiro que o SDK consegue enviar,
    // mantendo o nome e o tipo MIME (ex.: "image/png", "video/mp4")
    file: await toFile(file.buffer, fileName, { type: file.mimetype }),

    // Nome com que o ficheiro fica guardado no ImageKit
    fileName,

    // Pasta de destino no ImageKit (será criada se não existir)
    folder: "/chat",
  });

  // O ImageKit devolve vários dados (fileId, name, size, etc.);
  // aqui só devolvemos a URL para guardar na base de dados ou enviar ao frontend
  return result.url;
}

// Exporta as funções para serem usadas noutros ficheiros
export { uploadChatMedia, hasImageKitConfig };