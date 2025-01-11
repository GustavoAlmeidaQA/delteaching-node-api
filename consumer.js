const amqp = require('amqplib/callback_api');
const axios = require('axios');
const retry = require('retry');

const amqpUrl = 'amqp://localhost'; 
const queueName = 'contas_queue';  


const apiUrl = 'http://localhost:3000/contas'; 

const sendToApi = async (data) => {
  const operation = retry.operation({
    retries: 3,          
    factor: 2,            
    minTimeout: 1000,     
  });

  operation.attempt(async (currentAttempt) => {
    try {
      const response = await axios.post(apiUrl, data);
      console.log('Dados enviados com sucesso:', response.data);
    } catch (error) {
      if (operation.retry(error)) {
        console.log(`Tentativa ${currentAttempt} falhou. Tentativa de retry`);
      } else {
        console.error('Erro após múltiplas tentativas:', error);
      }
    }
  });
};

const consumeMessages = () => {
  amqp.connect(amqpUrl, (err, conn) => {
    if (err) {
      console.error('Erro ao conectar ao RabbitMQ:', err);
      return;
    }

    conn.createChannel((err, channel) => {
      if (err) {
        console.error('Erro ao criar canal no RabbitMQ:', err);
        return;
      }

      channel.assertQueue(queueName, { durable: true });
      console.log(`Aguardando mensagens na fila: ${queueName}`);

      channel.consume(queueName, (msg) => {
        if (msg !== null) {
          const data = JSON.parse(msg.content.toString());
          console.log('Mensagem recebida:', data);

          sendToApi(data).then(() => {
            channel.ack(msg);
          }).catch((error) => {
            console.error('Erro ao enviar dados para a API:', error);
            channel.nack(msg);
          });
        }
      }, { noAck: false });
    });
  });
};

consumeMessages();