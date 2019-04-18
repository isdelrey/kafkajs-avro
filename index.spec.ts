import { v4 as uuid } from "uuid";
import KafkaAvro from ".";
import { logLevel } from "kafkajs";
import waitForMessage from "./testHelpers/waitForMessage";

describe("kafkajs-avro", () => {
  let kafka: KafkaAvro, producer: any, consumer: any, topic: string;

  beforeEach(async () => {
    topic = `test-topic-${uuid()}`;
    kafka = new KafkaAvro({
      clientId: `test-client-${uuid()}`,
      brokers: ["localhost:9092"],
      avro: {
        url: "http://localhost:8081"
      },
      logLevel: logLevel.ERROR
    });

    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: true,
      topics: [{ topic }]
    });
    await admin.disconnect();

    producer = kafka.avro.producer();
    await producer.connect();

    const groupId = `test-group-${uuid()}`;
    consumer = kafka.avro.consumer({
      groupId,
      sessionTimeout: 10 * 1000, // 10s
      heartbeatInterval: 1000, // 1s
      minBytes: 1,
      maxBytesPerPartition: 100 * 1024, // 100kb
      maxBytes: 10 * 100 * 1024, // 1MB
      maxWaitTimeInMs: 50
    });
    await consumer.connect();
  });

  afterEach(async () => {
    await consumer.disconnect();
    await producer.disconnect();
  });

  it("can produce and consume an avro encoded message", async () => {
    const value = {
      customer: {
        name: "Test Testsson",
        address: `Test Avenue ${uuid()}`
      },
      purchase: {
        total_amount: 1000,
        line_items: [{ name: "Sneakers", amount: 500, quantity: 2 }]
      }
    };

    await producer.send({
      topic,
      messages: [
        {
          subject: "purchase",
          version: "latest",
          value
        }
      ]
    });

    await consumer.subscribe({ topic, fromBeginning: true });
    await waitForMessage({
      consumer,
      matches: ({ topic: messageTopic, message }) => {
        return (
          topic === messageTopic &&
          JSON.stringify(value) === JSON.stringify(message.value)
        );
      }
    });
  });
});
