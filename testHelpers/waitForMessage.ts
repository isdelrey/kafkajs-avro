import waitFor from './waitFor'

export default async ({ consumer, matches, timeout = 10000 }) => {
    let matchingMessage

    consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (matches({ topic, partition, message })) {
          matchingMessage = message
        }
      },
    })
  
    return waitFor(async duration => {
      if (duration > timeout) {
        throw new Error('Timeout waiting for message')
      }
  
      return matchingMessage != null
    })
  }