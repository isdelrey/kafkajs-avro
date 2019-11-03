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
  private async encodeMessages(messages): Promise<AvroProducerMessage[]> {
    // first phase: ensure all schema are downloaded, parsed and cached
    // prepare list of unique schemas here
    const schemas = {};
    messages.forEach(message => {
      const filter = {
        subject: message.subject,
        version: message.version || "latest"
      };
      const subject = `${filter.subject}:${filter.version}`;
      if (!schemas.hasOwnProperty(subject)) {
        schemas[subject] = filter;
      }

      if (message.key) {
        const split = message.subject.split("-value");
        if (split.length == 2 && split[0] != "" && split[1] == "") {
          const keyFilter = {
            subject: split[0] + "-key",
            version: message.keyVersion || "latest"
          };
          const key = `${keyFilter.subject}:${keyFilter.version}`;
          if (!schemas.hasOwnProperty(key)) {
            schemas[key] = keyFilter;
          }
        }
      }

      if (message.key) {
        const split = message.subject.split("-value");
        if (split.length == 2 && split[0] != "" && split[1] == "") {
          const keyFilter = {
            subject: split[0] + "-key",
            version: message.keyVersion || "latest"
          };
          const key = `${keyFilter.subject}:${keyFilter.version}`;
          if (!schemas.hasOwnProperty(key)) {
            schemas[key] = keyFilter;
          }
        }
      }
    });

    // ensure all schemas are downloaded, parsed and cached
    // a better approach would be employing a mutex here to ensure getSchema won't race (cause avsc duplicate type error)
    for (const filter of Object.values(schemas)) {
      try {
        await this.registry.getSchema(filter);
      } catch (err) {
        // unable to download a schema, ignore  the error in this phase
        // as encode will pickup the error
      }
    }

    // second phase: encode the messages
    return Promise.all(
      messages.map(async message => {
        // hack to encode message.key based on assumption that 'subject-key' is exist in schema schema
        // assumption: subject already has '-value', if otherwise fallback to original implmementation
        if (message.key) {
          const split = message.subject.split("-value");
          if (split.length == 2 && split[0] != "" && split[1] == "") {
            try {
              const key = await this.registry.encode(
                split[0] + "-key",
                message.keyVersion || "latest",
                message.key
              );
              message.key = key;
            } catch (err) {
              // maybe there's no schema for key, ignore
            }
          }
        }

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
