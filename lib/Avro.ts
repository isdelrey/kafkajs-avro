import { Kafka, ProducerMessage, MessagePayload } from "kafkajs";
import Registry from "./Registry";

interface AvroProducerMessage extends ProducerMessage {
  subject: string;
  version?: string;
  value: any;
}

interface AvroMessagePayload extends MessagePayload {
  topic: string;
  messages: AvroProducerMessage[];
}

class Avro {
  registry: Registry;
  kafka: Kafka;
  parseOptions: any;
  constructor(kafka: Kafka, opts) {
    this.registry = new Registry(opts);
    this.kafka = kafka;
  }
  consumer(args) {
    const consumer = this.kafka.consumer(args);
    return {
      ...consumer,
      run: args =>
        consumer.run({
          ...args,
          eachMessage: async messageArgs => {
            // Discard invalid avro messages
            if (messageArgs.message.value.readUInt8(0) !== 0) return;

            const value = await this.registry.decode(messageArgs.message.value);
            return args.eachMessage({
              ...messageArgs,
              message: {
                ...messageArgs.message,
                value
              }
            });
          }
        })
    };
  }
  private encodeMessages(messages): Promise<AvroProducerMessage[]> {
    return Promise.all(
      messages.map(async message => {
        const value = await this.registry.encode(
          message.subject,
          message.version || "latest",
          message.value
        );

        return {
          ...message,
          value
        };
      })
    );
  }
  producer(args?) {
    const producer = this.kafka.producer(args);
    return {
      ...producer,
      send: async ({ topic, ...args }: AvroMessagePayload) => {
        return producer.send({
          ...args,
          topic,
          messages: await this.encodeMessages(args.messages)
        });
      },
      sendBatch: async args => {
        return await producer.sendBatch({
          ...args,
          topicNames: await Promise.all(
            args.topicNames.map(async topicName => ({
              ...topicName,
              messages: await this.encodeMessages(topicName.messages)
            }))
          )
        });
      }
    };
  }
}

export default Avro;
