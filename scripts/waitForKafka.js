#!/usr/bin/env node

const execa = require('execa')

const findContainerId = node => {
  const cmd = `
    docker ps \
      --filter "status=running" \
      --filter "label=custom.project=kafkajsavro" \
      --filter "label=custom.service=${node}" \
      --no-trunc \
      -q
  `
  const containerId = execa.shellSync(cmd).stdout.toString('utf-8')
  console.log(`${node}: ${containerId}`)
  return containerId
}

const waitForNode = containerId => {
  const cmd = `
    docker exec \
      ${containerId} \
      bash -c "JMX_PORT=9998 /opt/kafka/bin/kafka-topics.sh --zookeeper zookeeper:2181 --list 2> /dev/null"
    sleep 5
  `

  execa.shellSync(cmd)
  console.log(`Kafka container ${containerId} is running`)
}

console.log('\nFinding container ids...')
const kafkaContainerId = findContainerId('kafka')

console.log('\nWaiting for nodes...')
waitForNode(kafkaContainerId)

console.log('\nAll nodes up:')
console.log(
  execa
    .shellSync(`docker-compose ps`)
    .stdout.toString('utf-8')
)