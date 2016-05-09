'use strict'

const router = require('express').Router()
const db = require('../db')
const crypto = require('crypto')
const fs = require('fs')
const path = require("path")
const Grid = require('gridfs-stream')

//iterate through the route object and register to express router
let _registerRoutes = (routes,method) =>{
	for(let key in routes){
		if(typeof routes[key] === 'object' && routes[key]!==null && !(routes[key] instanceof Array)){
			_registerRoutes(routes[key],key)
		}
		else{
			//Register the routes
			if(method ==='GET'){
				router.get(key,routes[key])
			}
			else if(method ==='POST'){
				router.post(key,routes[key])
			}
			else{
				//last matching route
				router.use(routes[key])
			}
		}
	}
}

let route = (routes) =>{
	_registerRoutes(routes)
	return router
}

//Find a single user based on key
let findOne = (profileID) =>{
	return db.userModel.findOne({
		'profileId' : profileID
	})
}

let createNewUser = (profile) =>{
	return new Promise((resolve,reject)=>{
			let newChatUser = new db.userModel({
				profileId: profile.id,
				fullName: profile.displayName,
				profilePic: profile.photos[0].value || ''
			})
			newChatUser.save(error=>{
				if(error){
					reject(newChatUser)
				}
				else{
					resolve(newChatUser)
				}
			})
	})
}

//es6 promisified version of findById
let findById = (id) =>{
	return new Promise((resolve,reject)=>{
		db.userModel.findById(id,(error,user)=>{
			if(error){
				reject(error)
			}
			else{
				resolve(user)
			}
		})
	})
}

//a middleware that check to see if user is logged in
let isAuthenticated = (req,res,next)=>{
	if(req.isAuthenticated()){
		next()
	}
	else{
		res.redirect('/')
	}
}

// socket helper code

let findRoomByName = (allrooms,room)=>{
	//iterating array of objects
	let findRoom = allrooms.findIndex((element,index,array)=>{
		if(element.room === room){
			return true
		}
		else{
			return false
		}
	})
	return findRoom >-1 ?true : false
}

//A function that generates a unique roomID
let randomHex = () =>{
	return crypto.randomBytes(24).toString('hex')
}

//find a chatroom with a id
let findRoomById = (allrooms,roomID)=>{
	return allrooms.find((element,index,array)=>{
		if(element.roomID === roomID){
			return true
		}
		else{
			return false
		}
	})
}

//add user to room
let addUserToRoom = (allrooms,data,socket)=>{
	let getRoom = findRoomById(allrooms,data.roomID)
	if(getRoom != undefined){
		//get the active user's ID (ObjectID as used in the session)
		let userID = socket.request.session.passport.user;
		// check if this user is already in the room
		let checkUSer = getRoom.users.findIndex((element,index,array)=>{
			if(element.userID === userID){
			return true
		}
		else{
			return false
		}
		})

		//if the user is already present in room , remove him first
		if(checkUSer >-1){
			getRoom.users.splice(checkUSer , 1)
		}
		//push user into array
		getRoom.users.push({
			socketID : socket.id,
			userID,
			user : data.user,
			userPic : data.userPic
		})

		//join the room channel
		socket.join(data.roomID)

		//return the updated room object
		return getRoom;
	}
}

//Find and remove the user when socket disconnects
let removeUserFromRoom = (allrooms , socket) =>{
	for(let room of allrooms){
		//find the user
		let findUser = room.users.findIndex((element,index,array)=>{
			if(element.socketID === socket.id){
				return true
			}
			else{
				return false
			}
		})

		if(findUser > -1){
			socket.leave(room.roomID)
			room.users.splice(findUser ,1)
			return room
		}
	}
}

//push messages to room
let pushMessage = (allrooms,roomID,userPic,data) =>{
	let getRoom = findRoomById(allrooms,roomID)
	if(getRoom != undefined){
		getRoom.messages.push({
			userPic,
			data
		})
	}
}

// File access
let fileAccess = (filePath) => {
	return new Promise((resolve,reject)=>{
		fs.access(filePath,fs.F_OK, error => {
			if(!error){
				//console.log('successful file exists')
				resolve(filePath)
			}
			else{
				reject(error)
			}
		})
	});
}

let fileOpen = (filePath) =>{
	return new Promise((resolve,reject)=>{
		fs.open(filePath, 'r', (error, fd)=>{
			if(error){
				return reject(error)
			}
			else{
				//console.log('successful file open')
				return resolve(fd)
			}
		})
	})
}

//readfile
let readFile = (filePath) =>{
	return new Promise((resolve,reject)=>{
		fs.readFile(filePath,(error,content)=>{
			if(error){
				return reject(error)
			}
			else{
				//remove file from server
				fs.unlinkSync(filePath);
				//console.log('successful file read',content)
				return resolve(content)
			}
		})
	})
}

//writeFile
let writeFile = (fileName,data) =>{
		fs.writeFile((process.cwd()+'/uploads/'+fileName),data,(error)=>{
			if(error){
				console.log('write file ',error)
			}
			else{
				//console.log('successful file read',content)
				console.log('success')
			}
		})
}

let createNewFile = (fileContent,fileName)=>{
	console.log('saving to db')
	return new Promise((resolve,reject) =>{
			let newFile = new db.fileModel({
				fileName : fileName,
				fileContent: fileContent
			})
			
			newFile.save(error=>{
				if(error){
					reject(newFile)
				}
				else{
					console.log('saved to db')
					resolve(newFile)
				}
			})
		})
}

//store data to DB
let saveFile = (mimeType,fileName,filePath,res)=>{
	fileAccess(filePath)
		.then(readFile)
		.then((content)=>{
			//writeFile(fileName,content)
			return createNewFile(content,fileName)
		})
		.then((newFile)=>{
			console.log('successful saved file : ',newFile.id)
			res.end(JSON.stringify({
				fileID : newFile.id,
				filename : newFile.fileName,
				mimeType : mimeType
			}))
		})
		.catch(error =>{
			console.log('error reading or saving file',error)
			res.send('failed file upload')
		})
}

//readStream
/*let streamFile = (filePath) => {
	return new Promise((resolve,reject)=>{
		let fileStream = fs.createReadStream(filePath);

		fileStream.on('open',()=>{
			resolve(fileStream)
		})
		fileStream.on('error',error=>{
			reject(error)
		})
	})
}*/

let findChatFilesById = (attachmentId)=>{
	return new Promise((resolve,reject)=>{
		db.fileModel.findById(attachmentId,(error,file)=>{
			if(error){
				reject(error)
			}
			else{
				console.log("file.fileName : ",file.fileName)
				resolve(file)
			}
		})
	})
}

//serve images
let getAttachments = (id,res)=>{
	let mimes = {
		".gif":"image/gif",
		".png":"image/png",
		".jpg":"image/jpeg",
		".mp3":"audio/mp3"
	}
	findChatFilesById(id)
		.then((file)=>{
			//writeFile(file.fileName,file.fileContent)
			let contentType = mimes[path.extname(file.fileName.toLowerCase())]
			console.log("contentType : ",contentType)
			res.writeHead(200,{'Contenet-type':contentType})
			res.end(file.fileContent,'utf-8')
		})
		.catch(error=>{
			res.writeHead(404)
			res.end('Contenet not found')
		})
}

//using GridFS to store files

let saveFilesUsingGridFS = (req,res)=>{
	let file = req.file;
	console.log(file)
	//save file to db
	let filePath = process.cwd()+'/'+file.path
	let fileName = file.originalname

	let conn = db.Mongoose.connection
	//let Grid = require('gridfs-stream')
	Grid.mongo = db.Mongoose.mongo
	let gfs = Grid(conn.db);

	let writestream = gfs.createWriteStream({
        filename: fileName
    });
    fs.createReadStream(filePath).pipe(writestream);
 
    writestream.on('close', function (file) {
        // do something with `file`
        console.log(file.filename + 'Written To DB with id',file.fileName);
        res.send('success file upload')
    });
}

let getFilesUsingGridFS = (id,res) =>{
	
	let conn = db.Mongoose.connection
	Grid.mongo = db.Mongoose.mongo
	let gfs = Grid(conn.db);
	
	var readstream = gfs.createReadStream({
	    _id: '572e5c5fe490420827febf0e'
	});

	res.writeHead(200,{'Contenet-type':'audio/mp3'})
	readstream.pipe(res);
}

module.exports = {
	route,
	findOne,
	createNewUser,
	findById,
	isAuthenticated,
	findRoomByName,
	randomHex,
	findRoomById,
	addUserToRoom,
	removeUserFromRoom,
	pushMessage,
	saveFile,
	getAttachments,
	saveFilesUsingGridFS,
	getFilesUsingGridFS
}