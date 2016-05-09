'use strict'

const config = require('../config')
const logger = require('../logger')
const Mongoose = require('mongoose').connect(config.dbURI)

Mongoose.connection.on('error',error=>{
	logger.log("error","MongoDB Error : " + error)
})

//Create a schema the stucture for storing user data
const chatUser = new Mongoose.Schema({
	profileId: String,
	fullName: String,
	profilePic: String
})

let userModel = Mongoose.model('chatUser',chatUser)

//Create a schema the stucture for storing files
const chatFile = new Mongoose.Schema({
	fileName : String,
	fileContent : Buffer
})

let fileModel = Mongoose.model('chatFile',chatFile)


module.exports = {
	Mongoose,
	userModel,
	fileModel
}