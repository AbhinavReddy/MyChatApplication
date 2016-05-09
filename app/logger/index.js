'use strict'

const winston = require('winston')
//(winston.Logger)
//the above wll resolve to 
//require('./winston/logger').Logger
const logger = new (winston.Logger)({
	//configs
	transports:[
		new (winston.transports.File)({
			//sevirety level  more options warn etc
			level: 'debug',
			filename: './chatCatDebug.log',
			//any exceptions 
			//we are not catching 
			handleExceptions: true
		}),
		new (winston.transports.Console)({
			level: 'debug',
			json: true,
			handleExceptions : true
		})
	],
	exitOnError: false
})


module.exports = logger
