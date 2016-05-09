'use strict'

const h = require('../helpers')

module.exports = (io,app) =>{
	let allrooms = app.locals.chatrooms;

	

	io.of('/roomslist').on('connection',socket =>{
		socket.on('getChatrooms',() =>{
			socket.emit('chatRoomslist',JSON.stringify(allrooms))
		})	
		socket.on('createNewRoom',(newRoomInput) =>{
			//console.log(newRoomInput)
			//check if room exists
			//if not create one and broadcast it to every one
			if(!h.findRoomByName(allrooms, newRoomInput)){
				allrooms.push({
					room : newRoomInput,
					roomID : h.randomHex(),
					users:[],
					messages:[]
				})

				//Emit an updated list to the creater
				socket.emit('chatRoomslist', JSON.stringify(allrooms))
				//Emit an updated list to everyone
				socket.broadcast.emit('chatRoomslist', JSON.stringify(allrooms))
			}
		})	
	})

	io.of('/chatter').on('connection', socket =>{
		//join room
		socket.on('join',data =>{
			//console.log('all Rooms',allrooms)
			let userList = h.addUserToRoom(allrooms, data, socket)

			//update the list of users on this room 
			//console.log('allrooms : ',allrooms)
			//console.log(userList)
			if(userList){
				socket.broadcast.to(data.roomID).emit('updateUserList',JSON.stringify(userList.users))
				socket.emit('updateUserList',JSON.stringify(userList.users))
			}
		})

		socket.on('getPreviosChats',data =>{
			//console.log('roomID :',roomID)
			//console.log('all Rooms',allrooms)
			let room = h.findRoomById(allrooms,data.roomID)
			//console.log('chat room :',room)
			//update the list of users on this room 
			//console.log('allrooms : ',allrooms)
			if(room){
				//console.log('chat room :',room)
				socket.emit('updatePreviosChats',JSON.stringify(room.messages))
			}
		})

		//when a socket exits
		socket.on('disconnect',()=>{
			//find the room to which the socket is connected to and remove the user
			let room = h.removeUserFromRoom(allrooms,socket)
			//console.log('userList : ',room.users)
			if(room){
				socket.broadcast.to(room.roomID).emit('updateUserList',JSON.stringify(room.users))
			}
		})

		//when a new mssg arraives
		socket.on('newMesaage',data =>{
			h.pushMessage(allrooms,data.roomID,data.userPic,data.message)
			socket.broadcast.to(data.roomID).emit('inMessage', JSON.stringify(data))
			socket.emit('inMessage', JSON.stringify(data))
		})

		//new attachment
		socket.on('newAttachment',data =>{
			console.log("in newAttachment")
			h.pushMessage(allrooms,data.roomID,data.userPic,data.attachmentData)
			socket.broadcast.to(data.roomID).emit('inMessage', JSON.stringify(data))
			socket.emit('inMessage', JSON.stringify(data))
		})

	})

}