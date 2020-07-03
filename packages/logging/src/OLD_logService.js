import winston from 'winston';
import path from 'path';
import os from 'os';
import contracts from 'ganchasContracts';

const { combine, timestamp, prettyPrint, printf } = winston.format;

// eslint-disable-next-line func-names
module.exports = (function () {
    const homeDir = os.homedir();
    const { levels } = contracts.logConstants;
    const generalConst = contracts.generalConstants;

    // Set by init()
    let logger;

    const init = () => {
        const errorLog = path.join(homeDir, generalConst.AppDirName, `${generalConst.AppName}_error.log`);
        const combinedLog = path.join(homeDir, generalConst.AppDirName, `${generalConst.AppName}_combined.log`);

        const logFormat = printf(info =>
            `[${info.timestamp}]\t[${info.area}]\t[${info.plugin || 'NA'}]\t[${info.extra || 'NA'}]\t[${info.level}]\t[${info.message}]`);

        logger = winston.createLogger({
            format: combine(
                timestamp(),
                prettyPrint(),
                logFormat
            ),
            transports: [
                new winston.transports.Console(),
                // Write all logs error (and below) to error log
                new winston.transports.File({ filename: errorLog, level: levels.error }),
                // Write to all logs with level `info` and below to combined log
                new winston.transports.File({ filename: combinedLog }),
            ],
        });

        // If we're not in production then log to the `console` with the format:
        // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
        if (process.env.NODE_ENV !== 'production') {
            logger.add(new winston.transports.Console({
                format: winston.format.simple(),
            }));
        }
    };

    const log = (level, message, area, plugin, extra) => {
        if (typeof level !== 'string' || typeof message !== 'string' || level in levels === false) {
            throw TypeError(`Parameters "level" and "message" must be strings and level must be one of the following: ${Object.getOwnPropertyNames(levels).join()}`);
        }

        logger || init();

        logger.log({
            level,
            message,
            area,
            plugin,
            extra,
        });
    };

    return {
        // Params: level (string), message (string)
        // Logs message based on the logging level
        log,
    };
});
