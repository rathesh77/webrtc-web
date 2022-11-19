const http = require('http');
const { Server } = require("socket.io");

const requestListener = function (req, res) {
  res.writeHead(200);
  res.end('Hello, World!');
}
const server = http.createServer(requestListener);
const io = new Server(server);

const MAX_CLIENTS_PER_ROOM = 2
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('create or join room', room => {
    const currentRoom = io.sockets.adapter.rooms.get(room.name)
    const size = currentRoom ? currentRoom.size : 0
    if (currentRoom) {
      // la room existe deja
      const { size } = currentRoom
      if (size == MAX_CLIENTS_PER_ROOM) {
        socket.emit('room is full...')
        return
      }
    }
    socket.join(room.name)
    if (size + 1 > 1) {
      socket.emit('create offer', { roomName: room.name })
    }
  })

  socket.on('offer created', (offer, room) => {
    socket.to(room.name).emit('create answer', offer)
  })

  /*
  socket.on('answer created', (answer, room) => {
    socket.to(room.name).emit('send ice candidate', offer)
  })

  socket.on('ice candidate sent', (answer, room) => {
    socket.to(room.name).emit('send ice candidate', offer)
  })*/
});

server.listen(8080);