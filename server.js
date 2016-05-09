'use strict';

const express = require('express')
const app = express();
const chatCat = require('./app')
const passport = require('passport')


// this helps u to access port through out the application
app.set('port',process.env.PORT || 3000);
//express file streams to response 
app.use(express.static('public'))
app.set('view engine','ejs')

app.use(chatCat.session)
app.use(passport.initialize())
//serialize and deserialize in auth helps hook passport to express session
app.use(passport.session())

//using morgan to log requests
//default format
// this format will output -- date url etc
//other formats dev (color coded strings), tiny 
app.use(require('morgan')('combined',{
	stream:{
		write : message =>{
			// write to logs
			chatCat.logger.log('info',message)
		}
	}
}))

app.use('/',chatCat.router)

chatCat.ioServer(app).listen(app.get('port'),()=> {
	console.log("running on port",3000)
})


