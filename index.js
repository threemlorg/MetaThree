const express = require('express') // Importing Express
const dal = require('./dal.js');
const app = express() // Creating Express Server
const host = 'localhost' //'37.97.189.248'// Specifying Host
const port = 8080 // Specifying Port number
// Creating Http Server from Express App to work with socket.io
const http = require('http').Server(app);
const config = require('./config.json');

// Initializing socket.io object
const io = require('socket.io')(http,{
 // Specifying CORS 
 cors: {
 origin: "*",
 }
})
dal.initDB(config.sqlitedb);
app.use(express.urlencoded({ extended: true })) // Specifying to use urlencoded
// Creating object of Socket
const liveData = io.of("/liveData") // URL which will accept socket connection
// Socket event
liveData.on("user-connected",(username)=>{
 console.log(`Receiver ${username} connected..`) // Logging when user is connected
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
    location: "/sub/search",
  });
  res.end();
});

// Post request on home page
app.post('/',(req, res) => {
 liveData.emit("new-data",req.body.message) // Emitting event.
})
//static files
app.use(express.static('public'))

// Listening on Host and Port
http.listen(port, host, () => console.log(`Listening on http://${host}:${port}/`))
