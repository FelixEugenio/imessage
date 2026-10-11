// Importa o multer, o middleware do Express para lidar com uploads de ficheiros (multipart/form-data)
import multer from "multer";

// Tamanho máximo permitido por ficheiro: 25 MB
// 25 * 1024 * 1024 converte megabytes para bytes (o multer trabalha em bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25mb

// Cria e exporta o middleware de upload, para usares nas rotas.
// Exemplo: router.post("/upload", upload.single("file"), controller)
export const upload = multer({
  // memoryStorage guarda o ficheiro na memória RAM (em file.buffer)
  // em vez de o gravar no disco do servidor.
  // É o que permite enviar o buffer diretamente para o ImageKit (uploadChatMedia).
  storage: multer.memoryStorage(),

  // Limites do upload
  limits: {
    // Se o ficheiro passar de 25 MB, o multer rejeita com o erro "LIMIT_FILE_SIZE"
    fileSize: MAX_FILE_SIZE,
  },

  // Filtro que decide se um ficheiro é aceite ou não.
  // Corre antes de o ficheiro ser processado.
  //   req  -> o pedido HTTP
  //   file -> info do ficheiro (originalname, mimetype, etc.)
  //   cb   -> callback para aceitar ou rejeitar
  fileFilter: (req, file, cb) => {
    // O mimetype indica o tipo do ficheiro, ex.: "image/png", "video/mp4"
    // startsWith verifica a categoria (image/* ou video/*)
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    // Se não for nem imagem nem vídeo, rejeita o ficheiro com um erro
    if (!isImage && !isVideo) {
      cb(new Error("Only image and video uploads are allowed"));
      return; // pára aqui para não chamar o cb de aceitação abaixo
    }

    // cb(null, true) = sem erro, ficheiro aceite
    cb(null, true);
  },
});