const http = require('http');
const { Server } = require("socket.io");

const requestListener = function (req, res) {
  res.writeHead(200);
  res.end('Hello, World!');
}
const server = http.createServer(requestListener);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5500', 'http://localhost:5500']
  }
});

const MAX_CLIENTS_PER_ROOM = 2
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('create or join room', roomName => {
    console.log('socket is trying to join a room')
    const currentRoom = io.sockets.adapter.rooms.get(roomName)
    const size = currentRoom ? currentRoom.size : 0
    if (currentRoom) {
      // la room existe deja
      const { size } = currentRoom
      if (size == MAX_CLIENTS_PER_ROOM) {
        socket.emit('room is already full...')
        console.log('room is already full...')
        return
      }
    }
    socket.join(roomName)
    if (size + 1 > 1) {
      console.log('room is now full')
      socket.to(roomName).emit('message',  {type: 'offer',roomName})
    }
  })
  socket.on('message', message => {
    const {roomName} = message
    console.log(message.type, roomName)

    socket.to(roomName).emit('message', {...message})
  })
});

server.listen(8080);