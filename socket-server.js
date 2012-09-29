var socket_io = require('socket.io');
var util = require('util');

module.exports.startServer = function(httpServer) {
	var socketIO = socket_io.listen(httpServer);
	var allOnlineUsers = {};

	socketIO.on('connection', function(socket) {
		socket.emit("ready");

		socket.on('join_room', function(data) {
			socket.room = data.roomName;
			socket.nickName = data.nickName;
			socket.join(data.roomName);
			storeOnlineUsers(socket);
			socket.emit('joined');
			socket.broadcast.to(socket.room).emit('online', data.nickName);
		});

		socket.on('leave_room', function(data) {
			removeOnlineUser(socket);
			socket.broadcast.to(socket.room).emit('offline', socket.nickName);
			socket.leave(socket.room);
		});

		socket.on('disconnect', function() {
			if (socket.room && socket.nickName) {
				removeOnlineUser(socket.room, socket.nickName);
				socket.broadcast.to(socket.room).emit('offline', socket.nickName);
				socket.leave(socket.room);
			}
		});

		socket.on('get_online_users', function() {
			var onlineUsers = getOnlineUserByRoom(socket.room);
			socket.emit('online_users', {users:onlineUsers});
		});

		socket.on('start_call', function(msg) {
			socket.broadcast.to(socket.room).emit('call_invitation', msg);
		});

		socket.on('invitation_answer', function(data){
			socket.broadcast.to(socket.room).emit('invitation_answer', data);
		});

		socket.on('invitation_ack', function(data){
			socket.broadcast.to(socket.room).emit('invitation_ack', data);
		});

		socket.on('signal_message', function(data){
			console.log('SIGNAL received: ' + util.inspect(data));
			socket.broadcast.to(socket.room).emit('signal_message', data);
		});
	});

	function getOnlineUserByRoom(roomName) {
		var roomOnlines = allOnlineUsers[roomName];
		if (!roomOnlines) return [];
		return roomOnlines;
	}

	function storeOnlineUsers(socket) {
		var roomOnlines = allOnlineUsers[socket.room];
		if (!roomOnlines) {
			roomOnlines = [];
			allOnlineUsers[socket.room] = roomOnlines;
		}
		var index = roomOnlines.indexOf(socket.nickName);
		if (index > -1) {
			return;
		}
		allOnlineUsers[socket.room].push(socket.nickName);
	}

	function removeOnlineUser(roomName, nickName) {
		var roomOnlines = allOnlineUsers[roomName];
		if (!roomOnlines) {
			return;
		}
		var index = roomOnlines.indexOf(nickName);
		if (index > -1) {
			return;
		}
		roomOnlines.splice(index, 1);
	}
}