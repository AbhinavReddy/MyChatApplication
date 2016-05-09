'use strict'

const logger = require('../logger')
const passport = require('passport')
const config = require('../config')
const FacebookStrategy = require('passport-facebook').Strategy
const h = require('../helpers')


module.exports = () =>{
	//called after authProcessor()
	passport.serializeUser((user,done)=>{
		done(null,user.id)
	})

	passport.deserializeUser((id,done)=>{
		//find user using _id
		h.findById(id)
			.then(user =>done(null,user))
			.catch(error=>logger.log("error",'Error when deserializing the user : '+error))
	})

	//accessToken and refreshToken provided by facebook
	let authProcessor = (acessToken,refreshToken,profile,done)=>{
		
		//find a user in the local db using profile.id
		h.findOne(profile.id)
			.then(result =>{
				if(result){
					//if user is found , return the user data using the done()
					done(null,result)
				}
				else{
					//if user is not found, create one in the local db and return
					h.createNewUser(profile)
						.then(newChatUser => done(null, newChatUser))
						.catch(error => logger.log("error",'Error creating new user : '+error))
				}
			})
	}
	passport.use(new FacebookStrategy(config.fb,authProcessor))
}