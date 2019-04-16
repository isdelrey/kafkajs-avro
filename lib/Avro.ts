import { Kafka } from "kafkajs"
import Registry from "./Registry"

class Avro {
    registry: Registry
    kafka: Kafka
    parseOptions: any
    constructor(
        kafka: Kafka,
        { url, parseOptions }: { url: string; parseOptions: any }
    ) {
        this.registry = new Registry({ url, parseOptions })
        this.parseOptions = parseOptions
        this.kafka = kafka
    }
    consumer() {
        const consumer = this.kafka.consumer()
        return {
            ...consumer,
            run: args =>
                consumer.run({
                    ...args,
                    eachMessage: async messageArgs => {
                        const message = await this.registry.decode(
                            messageArgs.message
                        )
                        return args.eachMessage({
                            ...messageArgs,
                            message
                        })
                    }
                })
        }
    }
    producer() {
        const producer = this.kafka.producer()
        return {
            ...producer,
            send: async ({ version, topic, ...args }) => {
                return await producer.send({
                    ...args,
                    topic,
                    messages: await Promise.all(
                        args.messages.map(message =>
                            this.registry.encode(topic, args, message)
                        )
                    )
                })
            },
            sendBatch: async args => {
                return await producer.sendBatch({
                    ...args,
                    topicNames: await Promise.all(
                        args.topicNames.map(async topicName => ({
                            ...topicName,
                            messages: await Promise.all(
                                topicName.messages.map(message =>
                                    this.registry.encode(
                                        topicName.topic,
                                        topicName.version,
                                        message
                                    )
                                )
                            )
                        }))
                    )
                })
            }
        }
    }
}

export default Avro
