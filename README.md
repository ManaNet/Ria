# Ria
A simple Redis Pubsub-based rate-limiter for Discord bots (mainly from Javacord). The functionality of this rate-limiter is simple and that is to handle the `requestQuota` function of Javacord.

## :package: Usage
You can use Ria by first configuring the `.env` file, we highly recommend not modifying anything that is commented since those fields are pre-filled with the `docker-compose.yml` unless you are planning on using custom values for your rate-limit.
```shell
cp .env.format .env
```

After configuring the `.env` file then you can simply build the container:
```shell
docker build -t ria .
```

If you want to automatically boot two containers for the global and identify rate-limits then simply use the docker-compose file to get you up and running ASAP:
```shell
docker-compose up -d
```

### Requesting a quota
You can easily request a quota by simply sending a message to the `<#channel>.requests` (default: `global.ratelimits.requests` or `identify.ratelimits.requests`) with a callback field that you can use to identify later.
```json
{"callback":"hello world"}
```

Ria should send you a quota within milliseconds (unless there is no quota) with a response on the consumer channel `<#channel>.consumer` (default: `global.ratelimits.consumer` or `identify.ratelimits.consumer`) such as this:
```json
{
    "callback": "hello world",
    "message": {
        "approved": true
    }
}
```

Ria will not send a response until a quota is freed up which should allow you to perform blocking operations accurately until the response of Ria is received. A sample of how we wrote the receiver on Mana is:
```kotlin
class RedisRatelimiter(val channel: String): Ratelimiter {

    override fun requestQuota() {
        try {
            RedisPubsub.send(channel, null).join()
        } catch (exception: Exception) {
            exception.printStackTrace()
            Mana.getLogger().fromSLF4J().error("The rate-limiter failed to respond within the designated one-minute window, permit granted.")
        }
    }

}
```