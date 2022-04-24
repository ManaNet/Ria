import winston, { format } from 'winston'

export default winston.createLogger({
    format: format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
})
