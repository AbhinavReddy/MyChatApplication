'use strict'

const h = require('../helpers')
const passport = require('passport')
const config = require('../config')
const multer = require('multer')
const upload = multer({dest:'uploads/'})

module.exports = () =>{
	let routes ={
		'GET':{
			'/' : (req,res,next)=>{
				res.render('login')
			},
			'/rooms': [h.isAuthenticated , (req,res,next) =>{
				res.render('rooms',{
					user : req.user,
					host : config.host
				})
			}],
			'/chat/:id': [h.isAuthenticated , (req,res,next) =>{
				//find a chatroom with givn id
				//render if the id is found
				let getRoom = h.findRoomById(req.app.locals.chatrooms,req.params.id)
				if(getRoom === undefined){
					next();
				}
				else{
					res.render('chatroom',{
					user : req.user,
					host : config.host,
					room : getRoom.room,
					roomID : getRoom.roomID
					})
				}
			}],
			'/auth/facebook': passport.authenticate('facebook'),
			'/auth/facebook/callback' : passport.authenticate('facebook',{
				successRedirect : '/rooms',
				failureRedirect : '/'
			}),
			'/logout' : (req,res,next)=>{
				req.logout();
				res.redirect('/')
			},
			'/attachment/:id' : (req,res,next)=>{
				//send image
				//res.render('login')
				//console.log('router : ',req.params.id)
				h.getAttachments(req.params.id,res)
				//h.getFilesUsingGridFS(req.params.id,res)
			},
		},
		'POST' :{
			'/upload' : [upload.single('myFile'),(req,res,next) =>{
				let file = req.file;
				//console.log(file)
				//save file to db
				let filePath = process.cwd()+'/'+file.path
				let fileName = file.originalname
				let mimeType = file.mimetype
				//console.log(filePath,fileName)
				h.saveFile(mimeType,fileName,filePath,res)
				//send the image id
				//res.send('success file')
				//h.saveFilesUsingGridFS(req,res)
			}]
		},
		'NA' : (req,res,next) =>{
			res.status(404)
				.sendFile(process.cwd()+'/views/404.htm')
		}
	}

	return h.route(routes);
}