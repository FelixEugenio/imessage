// Importa a classe CronJob da biblioteca "cron".
// Ela permite executar uma função automaticamente em intervalos de tempo definidos.
import { CronJob } from 'cron';

// Módulos nativos do Node para fazer pedidos HTTP (http) e HTTPS (https).
// Não precisa de instalar nada, já vêm com o Node.
import http from 'http';
import https from 'https';

// Cria uma tarefa agendada (cron job).
// '*/14 * * * *' significa "a cada 14 minutos".
// Formato: minuto hora dia-do-mês mês dia-da-semana
// O objetivo típico é manter o servidor "acordado" no Render (plano gratuito),
// que adormece após ~15 minutos sem receber pedidos.
const job = new CronJob('*/14 * * * *', function () {
  // Lê do .env / variáveis de ambiente a URL base que vai ser chamada.
  const base = process.env.FRONTEND_URL;

  // Se a variável não estiver definida, termina aqui e não faz nada.
  if (!base) return;

  // Monta a URL completa juntando a base com o caminho "/health".
  // Ex.: "https://meu-app.onrender.com" + "/health" -> "https://meu-app.onrender.com/health"
  // O ".href" devolve a URL final como texto.
  const url = new URL('/health', base).href;

  // Escolhe o módulo certo conforme o protocolo:
  // se a URL começar por "https:" usa https, caso contrário usa http.
  const client = url.startsWith('https:') ? https : http;

  // Faz um pedido GET à URL.
  client
    .get(url, (res) => {
      // "res.statusCode" é o código HTTP da resposta (200 = OK).
      // CORRIGIDO: no original a condição estava invertida
      // (dizia "successful" quando o código era diferente de 200).
      if (res.statusCode === 200) {
        console.log('GET request successful');
      } else {
        console.log('GET request failed', res.statusCode);
      }

      // Descarta o corpo da resposta para libertar a ligação/memória.
      res.resume();
    })
    // Se o pedido falhar (sem internet, servidor em baixo, DNS...), regista o erro.
    .on('error', (err) => {
      console.error('Error while sending request', err);
    });
});

// Exporta o job para ser usado noutro ficheiro (ex.: index.js).
export default job;
