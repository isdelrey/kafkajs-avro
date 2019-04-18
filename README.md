<p align="left">
    <img alt="stuart logo" src="https://github.com/ivosequeros/kafkajs-avro/blob/master/docs/header.png?raw=true" width="500">
</p>

**A modern Apacha Kafka client for node.js coupled with Avro support**\
This library combines [Kafka.js](https://github.com/tulios/kafkajs) and [Avsc](https://github.com/mtth/avsc) to provide seamless and unopinionated avro encoding/decoding for your kafka messages using a minimum of dependencies.

#### Dependencies

-   [kafkajs](https://www.npmjs.com/package/kafkajs)
-   [avsc](https://www.npmjs.com/package/avsc)
-   [node-fetch](https://www.npmjs.com/package/node-fetch)

#### Install

Run `npm i -s kafkajs-avro` or `yarn add kafkajs-avro`

#### Quickstart code

```typescript
import KafkaAvro from "kafkajs-avro"

(async () {
    const kafka = new KafkaAvro({
        clientId: "<client-id>",
        brokers: ["<hostname>:9092"],
        avro: {
            url: "https://<hostname>:<port>"
        }
    })

    /* Producer */
    const producer = kafka.avro.producer()
    await producer.connect()

    setInterval(() => {
        producer.send({
            topic: "<topic>",
            messages: [{
                subject: "<subject>",
                version: "latest",
                value: { value: 1 }
            }]
        })
    }, 1000)

    /* Consumer */
    const consumer = kafka.avro.consumer({ groupId: "<consumer-group-id>" })
    await consumer.connect()
    await consumer.subscribe({ topic: "<topic>" })

    consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            console.log(message.value)
        }
    })
})()
```

#### Consumer example

```typescript
import KafkaAvro from "kafkajs-avro"

(async () => {
    const kafka = new KafkaAvro({
        clientId: "<client-id>",
        brokers: ["<hostname>:9092"],
        avro: {
            url: "https://<hostname>:<port>" /* [Extra setting] */
        }
    })

    /* Consumer
       The consumer does not require any extra settings to be built.
       You may just remove .avro from the next line and you will see raw messages from
       the brokers - without avro decoding.
    */
    const consumer = kafka.avro.consumer({ groupId: "<consumer-group-id>" })
    await consumer.connect()
    await consumer.subscribe({ topic: "<topic>" })

    consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            /* message.value contains the decoded avro message */
            console.log(message.value)
        }
    })
})()
```

#### Producer example

```typescript
import KafkaAvro from "kafkajs-avro"

(async () => {
    const kafka = new KafkaAvro({
        clientId: "<client-id>",
        brokers: ["<hostname>:9092"],
        avro: {
            url: "https://<hostname>:<port>" /* [Extra setting] */
        }
    })

    const producer = kafka.avro.producer()
    await producer.connect()

    producer.send({
        topic: "<topic>" /* The topic name */,
        messages: [
            {
                subject: "<subject>" /* [Extra setting] Avro subject to send */,
                version:
                    "latest" /* [Extra setting] Version of the avro subject to send */,
                value: { value: 1 } /* Your message value object to send */
            }
        ]
    })
})()
```

#### Underlying features from Kafka.js

All features from Kafka.js are preserved and adapted. Take a look at the [Kafka.js](https://github.com/tulios/kafkajs) project to see what's available. All extra settings and variables required by this library are highlighted with `[Extra setting]` on the examples.

#### Avro schema cache

Requests to the avro registry are minimised by locally caching schemas.

#### Available modules

```typescript
import KafkaAvro, { KafkaAvro, Avro, Kafka } from "kafkajs-avro"
```

`Kafka` is `kafkajs`.

The module `KafkaAvro` is an extension of `Kafka` that requires a few more keys to construct and offers all `Kafka` functions under `KafkaAvro.avro` in a modified version that seemlessly handles avro encoding and decoding.

#### Types

This library uses typescript. This means that you'll see what functions are available to you and what keys are required to invoke a function or construct an instance class.
