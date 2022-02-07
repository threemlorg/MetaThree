const express = require('express') // Importing Express
const dal = require('./dal.js');
const app = express(); // Creating Express Server
const host = 'localhost' //'37.97.189.248'// Specifying Host
const port = 8080; // Specifying Port number
// Creating Http Server from Express App to work with socket.io
const http = require('http').Server(app);
const config = require('./config.json');

// Initializing socket.io object
const io = require('socket.io')(http,{
 // Specifying CORS 
 cors: {
 origin: "*",
 }
});
dal.initDB(config.sqlitedb);

app.use(express.urlencoded({ extended: true })); // Specifying to use urlencoded
io.sockets.on('connection', function(socket) {
  socket.on('room', function(room) {  
    var remoteip=dal.getRemoteIp(socket);
      socket.join(room);
       console.log(`in room ${room}.`);
      dal.getChats(room, io);
  });

  console.log(`LOG: [EVENT=connection] New client connected: ${socket.conn.remoteAddress} .`);
//A client left
  socket.on('disconnect', function() {
    var remoteip=dal.getRemoteIp(socket);
    console.log("LOG: [EVENT=disconnect] client has disconnected.");
      dal.leaveRoom(io, remoteip);
    });
  socket.on("message",(j)=>{
    var remoteip=dal.getRemoteIp(socket);
    console.log(`Message from: ${remoteip}.`);
    j.ip=remoteip;
    if(j.m.length>0 && j.m.length<=250 && j.u.length>0 && j.u.length<=20)
    {
      j.m=j.m.split('<').join('&lt;').split('>').join('&gt;').split("'").join("`");
      dal.saveChat(j, io);
      dal.joinToRoom(io, j.r, remoteip, j.u);
    }
    // Emitting event.
   });
   //  socket.on("initiate-chat",(r)=>{
  //   dal.getChats(r, socket);
  //  }
  // );
});



//API
app.get('/api_getscenepart', (req, res) => {
  console.log(`HERE NOW ..`);
  dal.getScenePart(req, res);
});

app.get('/api_getwebsites', (req, res) => {
  dal.getWebsites(req, res);
});

app.get('/api_stat', (req, res) => {
  dal.checkRequest(req);
});
app.get('/api_getstats', (req, res) => {
  dal.getStats(req, res);
});
app.get('/api_getsnippets', (req, res) => {
  dal.getSnippets(res);
});
// Get request on home page
app.get('/', (req, res) => {
    res.writeHead(302, {
    location: config.homepage,
  });
  res.end();
});


//static files
app.use(express.static('public'))

// Listening on Host and Port
http.listen(port, host, () => console.log(`Listening on http://${host}:${port}/`))
