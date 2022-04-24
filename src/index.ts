import * as redis from 'redis'
import dotenv from 'dotenv'
import { RateLimiterMemory, RateLimiterQueue } from 'rate-limiter-flexible'
import logger from './logger'

dotenv.config()

const SPECIFICATIONS = {
    POINTS_PER_DURATION: process.env.POINTS_PER_DURATION!!,
    SECONDS_DURATION: process.env.SECONDS_DURATION!!,
    REDIS_CHANNEL: process.env.REDIS_CHANNEL,
    REDIS_URI: process.env.REDIS_URI
}

let errors: any[] = []
Object.entries(SPECIFICATIONS).forEach((value) => {
    if (value[1] == null) {
        errors.push({
            error: "Missing configuration field.",
            field: value[0]
        })
    }
});

if (errors.length > 0) {
    logger.error({
        errors: errors
    })
    process.exit(1)
}

logger.info({
    points: SPECIFICATIONS.POINTS_PER_DURATION,
    duration: SPECIFICATIONS.SECONDS_DURATION,
    channels: [
        `${SPECIFICATIONS.REDIS_CHANNEL}.consumer`,
        `${SPECIFICATIONS.REDIS_CHANNEL}.requests`
    ]
})

const bucket = new RateLimiterMemory({
    points: Number.parseInt(SPECIFICATIONS.POINTS_PER_DURATION),
    duration: Number.parseInt(SPECIFICATIONS.SECONDS_DURATION)
});

const queue = new RateLimiterQueue(bucket);

(async () => {
    const consumer = redis.createClient({
        url: SPECIFICATIONS.REDIS_URI
    })

    const publisher = redis.createClient({
        url: SPECIFICATIONS.REDIS_URI
    })

    await publisher.connect()
    await consumer.connect()
    logger.info({
        publisher_connected: true,
        consumer_connected: true
    })

    await consumer.subscribe(`${SPECIFICATIONS.REDIS_CHANNEL}.requests`, async (message, channel) => {
        try {
            const context = JSON.parse(message)

            if (!context.callback) {
                throw {
                    message: "Invalid request format, missing callback field."
                }
            }

            try {
                const remainingTokens = await queue.removeTokens(1)
                publisher.publish(`${SPECIFICATIONS.REDIS_CHANNEL}.consumer`, JSON.stringify({
                    callback: context.callback,
                    message: {
                        approved: true
                    }
                }))

                logger.info('A quota request was granted.', {
                    remaining: remainingTokens
                })
            } catch (error) {
                logger.error({
                    errors: [
                        {
                            message: "The rate-limit queue is full, this shouldn't happen as the maximum size is 4294967295!",
                        }
                    ]
                })
                console.error(error)
            }
        } catch (error) {
            logger.error("A message was received but didn't meet the proper format required.", {
                message: message,
                channel: channel
            })
            
            console.error(error)
        }
    })

    logger.info({
        client_subscribed: true,
        client_listening: true
    })
})()