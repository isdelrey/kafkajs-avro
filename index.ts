import { Kafka } from "kafkajs"
import Avro from "./lib/Avro"

interface Settings {
    avro: {
        url: string
        parseOptions: any
    }
}

class KafkaAvro extends Kafka {
    avro: Avro
    constructor({ avro, ...args }: Settings) {
        super(args)
        this.avro = new Avro(this, avro)
    }
}

export { KafkaAvro, Kafka, Avro }
export default KafkaAvro
