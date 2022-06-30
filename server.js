const express = require('express')
const app = express()
// const httpServer = require('http').createServer(app)
// const hostName = 'itmines.in';
 //removed httpsOptions
const fs = require("fs");
// const httpPort = 3000;
const httpsPort = 443;
// const constants = require('constants')

const httpsOptions = {
  //secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2, // tride before node version was updated on server
  key: fs.readFileSync('/etc/letsencrypt/live/itmines.in/privkey.pem', 'utf8'),
  ca: fs.readFileSync('/etc/letsencrypt/live/itmines.in/chain.pem', 'utf8'),
  cert: fs.readFileSync('/etc/letsencrypt/live/itmines.in/cert.pem', 'utf8')
}

const httpsServer = require("https").createServer(httpsOptions, app)

const io = require('socket.io')(httpsServer);


app.use('/', express.static('public'))

// redirecting http to https
// app.use((req,res,next) =>{
//   if(req.protocol === 'http'){
//     res.redirect(301, `https://${req.headers.host}${req.url}`);
//   }
//   next();
// });

// for ios devices to work
   // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Local Microphone and Camera Media (one per device)
    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // navigator.mediaDevices.getUserMedia = 
    //     navigator.getUserMedia       ||
    //     navigator.webkitGetUserMedia ||
    //     navigator.mozGetUserMedia    ||
    //     navigator.msGetUserMedia;


io.on('connection', (socket) => {
  socket.on('join', (roomId) => {
    const selectedRoom = io.sockets.adapter.rooms[roomId]
    const numberOfClients = selectedRoom ? selectedRoom.length : 0

    // These events are emitted only to the sender socket.
    if (numberOfClients == 0) {
      console.log(`Creating room ${roomId} and emitting room_created socket event`)
      socket.join(roomId)
      socket.emit('room_created', roomId)
    } else if (numberOfClients == 1) {
      console.log(`Joining room ${roomId} and emitting room_joined socket event`)
      socket.join(roomId)
      socket.emit('room_joined', roomId)
    } else {
      console.log(`Can't join room ${roomId}, emitting full_room socket event`)
      socket.emit('full_room', roomId)
    }
  })

  // These events are emitted to all the sockets connected to the same room except the sender.
  socket.on('start_call', (roomId) => {
    console.log(`Broadcasting start_call event to peers in room ${roomId}`)
    socket.broadcast.to(roomId).emit('start_call')
  })
  socket.on('webrtc_offer', (event) => {
    console.log(`Broadcasting webrtc_offer event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_offer', event.sdp)
  })
  socket.on('webrtc_answer', (event) => {
    console.log(`Broadcasting webrtc_answer event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_answer', event.sdp)
  })
  socket.on('webrtc_ice_candidate', (event) => {
    console.log(`Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_ice_candidate', event)
  })
})


// START THE SERVER =================================================================
// const port = process.env.PORT || httpsPort
// httpServer.listen(httpPort, () => {
//   console.log(`Express http server listening on port ${httpPort}`)
// })

httpsServer.listen(httpsPort, ()=>{
  console.log(`Express https server is listening on port ${httpsPort}`)
})

