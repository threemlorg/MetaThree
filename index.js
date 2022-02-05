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
  console.log(`LOG: [EVENT=connection] New client connected: ${socket.conn.remoteAddress}.`);
//A client left
  socket.on('disconnect', function() {
      console.log("LOG: [EVENT=disconnect] client has disconnected.");
  });
  socket.on("message",(j)=>{
    console.log(`Message from: ${socket.conn.remoteAddress}.`);
    j.ip=socket.conn.remoteAddress;
    j.d=dal.printDate();
    if(j.m.length>0 && j.m.length<=250)
    {
      j.m=j.m.split('<').join('&lt;').split('>').join('&gt;').split("'").join("`");
      dal.saveChat(j, socket);
    }
    // Emitting event.
   });
   socket.on("initiate-chat",(r)=>{
    dal.getChats(r, socket);
   }
   );
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
