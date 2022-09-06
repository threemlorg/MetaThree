const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const url = require('url');
const https = require('https');
var dbName='./data/threeml.db';
const whoisapi='https://ipwhois.app/json/';
var local_io;
var customerId=-1;

const connectedUsers = new Map();

////////////////////////////////////////////////////////////////////////////////////////////////////////
const connectedPlayers = new Map();

exports.setLocalIO= function(io){
  local_io=io;
}
exports.playerUpdateToRoom=function( j) {
  if(j && j.r){
    var room=j.r;
    //console.log(j.g + " joined "+ room);
    // create users array, if key not exists
    if (!connectedPlayers.has(room)) {
      connectedPlayers.set(room, []);
    }
    // remove user from room array
    let userList = connectedPlayers.get(room);
    userList = userList.filter(u => u.g !=j.g);
    userList.push(j);
    connectedPlayers.set(room, userList);  
    //add user
    //connectedPlayers.get(room).push(j);
    //console.log(userList.length + ' players in room' + room);
  }
}

exports.playerLeaveRoom=function( id) {
  // delete user

  for (var [room, roomUsers] of connectedPlayers.entries()) {  
    for(var j=0;j<roomUsers.length;j++){
      var us=roomUsers[j];
      if(us.id==id){
        // userList=playerLeaveTheRoom(io, room, id );
        // connectedPlayers.set(room, userList);
        us.left=true;
        us.steps=10;
      }
    }
  }

}
function playerLeaveTheRoom(room, id ){
  let userList = connectedPlayers.get(room);
  userList = userList.filter(u => u.id !== id);
  return userList;
 
}

exports.updatePlayers=function(){
  for (var [room, roomUsers] of connectedPlayers.entries()) {  
    checkPartedPlayers(room, roomUsers);
    //console.log(roomUsers.length + ' players emitted in room' + room);
    local_io.sockets.in(room).emit('new-playerdata', roomUsers);
  }
}

function checkPartedPlayers(room, roomUsers){
  var parted=roomUsers.filter(u => u.left==true);
 
 
  for(var i=0; i<parted.length;i++){
     var p=parted[i];
     console.log(`p.steps ${p.steps}` );
 
    if(p.steps){
      p.steps--;
      if(p.steps==0){
        roomUsers=roomUsers.filter(u => u.id !=p.id);
        connectedPlayers.set(room, roomUsers);  
        console.log(` player ${p.id} removed from room ${room}` );
        break;
      }
    }
  }
}
// function playerUpdateUsersList(io, room){
//   let userList = connectedPlayers.get(room);
//   let users=[]
//   for(var i=0;i<userList.length;i++){
//     let user=userList[i];
//     users.push(user.u);
//   } 
//   io.sockets.in(room).emit('playersList', users);
// }


/////////////////////////////////////////////////////////////////////
exports.getRemoteIp=function(socket){
  return socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
}
exports.joinToRoom=function(io, room, remoteip, user) {
  // create users array, if key not exists
  if (!connectedUsers.has(room)) {
      connectedUsers.set(room, []);
  }
  // add user to room array
  let userList = connectedUsers.get(room);
  userList = userList.filter(u => u.ip == remoteip && u.u==user);
  if(userList.length==0){
  let item={
    'u':user,
    'ip':remoteip
  }

  connectedUsers.get(room).push(item);
  // call update function
  updateUsersList(io, room);
}
}

exports.leaveRoom=function(io,  remoteip) {
  // delete user

  for (var [room, roomUsers] of connectedUsers.entries()) {  
    for(var j=0;j<roomUsers.length;j++){
      var us=roomUsers[j];
      if(us.ip==remoteip){
        userList=leaveTheRoom(io, room, remoteip );
            connectedUsers.set(room, userList);
            // call update function
            updateUsersList(io, room);

      }
    }
  }

}
function leaveTheRoom(io, room, remoteip ){
  let userList = connectedUsers.get(room);
  userList = userList.filter(u => u.ip !== remoteip);
  return userList;
 
}
function updateUsersList(io, room){
  let userList = connectedUsers.get(room);
  let users=[]
  for(var i=0;i<userList.length;i++){
    let user=userList[i];
    users.push(user.u);
  } 
  io.sockets.in(room).emit('usersList', users);
}


exports.initDB= function(tsqldb){
  if(tsqldb){
    dbName=tsqldb;
  }
  if(customerId<0) {
    let db = new sqlite3.Database(dbName,sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error(err.message);
      }
      else {
      //Get website id:
      let sql = `SELECT ID FROM customer`;
         console.log(sql);
        db.all(sql, [], (err, rows) => {
          if (err) {
            throw err;
          }
          if(rows.length>0){
          let row=rows[0];
          customerId=row.ID;
        
        }
        });
      }
    });
  }
}

exports.getScenePart=function(req, res){
  var guid;
  var q=url.parse(req.url, true).query;
  if(q){
    guid=q.g;
  }
  let db = new sqlite3.Database(dbName,sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    else {
        let sql = `SELECT Code code
        FROM Scenepart Where  Guid = '${guid}' `;
       console.log(sql);
        db.all(sql, [], (err, rows) => {
        if (err) {
          throw err;
        }
        if(rows.length>0){
          let row=rows[0];
          res.end(row.code);
        }   
      });
    }
  });
}



exports.getWebsites=function(req, res){
  var filter;
  var q=url.parse(req.url, true).query;
  if(q){
    filter=q.s;
  }
  
  let db = new sqlite3.Database(dbName,sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    else {
   
    let sql = `SELECT ID id, Name name, Description description, Url url, ImageUrl imageurl
    FROM Website Where Disable is NULL`;
if(filter && filter.length>0){
  sql+=` AND Name like '%${filter}%' `;
}
sql+=' Order by ID DESC '
       console.log(sql);
        db.all(sql, [], (err, rows) => {
        if (err) {
          throw err;
        }
        res.end( JSON.stringify(rows));
      });
    }
  });
}

exports.getStats=function(req, res){
  var round=0;
  var q=url.parse(req.url, true).query;
  if(q && !isNaN(q.s)){
    round=Number(q.s);
  }
  let db = new sqlite3.Database(dbName,sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    else {
   
    let sql = `SELECT sum(Visits) visits, max(latitude) lat, max(longitude) lon,
    max(City) city, max(Region) region, max(Country) country, max(strftime('%Y-%m-%dT%H:%M:%fZ',Updated)) d
        FROM callingIP WHERE (Blocked is NULL OR Blocked <>1) AND IP!='86.86.183.64' AND IP!='31.20.43.236' AND IP is not NULL 
		AND Latitude is not NULL  AND Longitude is not NULL GROUP BY ROUND(latitude, ${round}), ROUND(longitude,  ${round})`;
       console.log(sql);
        db.all(sql, [], (err, rows) => {
        if (err) {
          throw err;
        }
        res.end( JSON.stringify(rows));
      });
    }
  });
}

exports.getSnippets=function(res){
  let db = new sqlite3.Database(dbName,sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    else {
    let sql = `SELECT Description description, Example example, ImageUrl imageurl
    from Snippet`;
       console.log(sql);
        db.all(sql, [], (err, rows) => {
        if (err) {
          throw err;
        }
        res.end( JSON.stringify(rows));
      });
    }
  });
}

exports.getChats=function(room, io){
  let db = new sqlite3.Database(dbName,sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    else {
    let sql = `SELECT Nickname u, Message m, STRFTIME('%Y-%m-%d %H:%M', CreateDate) d
    from Chat where (Disabled=0 or Disabled is NULL) and Room='${room}' `;
       console.log(sql);
        db.all(sql, [], (err, rows) => {
        if (err) {
          throw err;
        }
        io.sockets.in(room).emit("new-data",rows);
      });
    }
  });
}

exports.saveChat=function(chat, io){
  let db = new sqlite3.Database(dbName,sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    else {

      let sql = `SELECT IP FROM BlockedIP
      Where IP='${chat.ip}'`;
      console.log(sql);
      db.all(sql, [], (err, rows) => {
        if (err) {
          throw err;
        }
          if(rows.length==0){
            //let nowDateTime=new Date();
            //#nowDateTime.setSeconds(nowDateTime.getSeconds()-3);
            let strdateFrom=this.printDate(true);
            let sql = `SELECT Id FROM Chat 
          Where IP='${chat.ip}' AND CreateDate=='${strdateFrom}'`;
          console.log(sql);
          db.all(sql, [], (err, rows) => {
            if (err) {
              throw err;
            }

        ///////////////////
            if(rows.length==0){

              let sql = `INSERT INTO Chat (IP, Nickname, PlayerGuid, Message, CreateDate, Room, itsCustomer_ID)
              VALUES (
                '${chat.ip}',
                '${escquote(chat.u)}',
                '${chat.g}',
                '${escquote(chat.m)}',
                '${strdateFrom}',
                '${chat.r}',
                ${customerId}
              ) `;
                console.log(sql);
                db.serialize(() => {
                    db.run(sql);

                    db.close((err) => {
                    if (err) {
                      return console.error(err.message);
                    }
                    chat.d=this.printDate();
                    updateLastChat(chat);
                    var arr=[];
                    arr.push(chat);
                    io.sockets.in(chat.r).emit("new-chat",arr);
                });
            
          
              });
            }
        ////////////
          
        
            });
          }
        });
      }
  
  
  });

}

function escquote(txt){
  if(txt){
    txt=txt.replace(/'/g, `\``);
    txt=txt.replace(/"/g, `\`\``);
  }
  return txt;
}
function updateLastChat(chat){
  let roomUsers = connectedPlayers.get(chat.r);
  if(roomUsers){
    for(var j=0;j<roomUsers.length;j++){
      var us=roomUsers[j];
      if(us.g==chat.g){
        us.m=chat.m;
        console.log(`Chat added: ${chat.m} `);
        break;
      }
    }
    connectedPlayers.set(chat.r, roomUsers);  
  }

}
//Whois

exports.checkRequest = function(req){
  var ip=getIp(req);
  if(ip){
    const queryObject = url.parse(req.url, true).query;
    const p=removeDomain(queryObject.p);

    getWhoIsData(ip, p);
  }

}
function removeDomain(url){
  if(url.indexOf('http')==0){
    let p=url.indexOf('//')+2;
    p=url.indexOf('/',p);
    url=url.substring(p);
    if(url.substring(url.length-1)=='/'){
      url=url.substring(0, url.length-1);
    }
  }
  return url;
}
function getIp(req){
  
    return (req.headers['x-forwarded-for'] || '').split(',')[0] 
    || req.connection.remoteAddress;

}

function getWhoIsData(ip, websiteUrl){
  performRequest(whoisapi, ip, 
  function(w) {
    if(w){
      let db = new sqlite3.Database(dbName,sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
          console.error(err.message);
        }
        else {
        //Get website id:
        let sql = `SELECT ID FROM website
           Where Url='${websiteUrl}'`;
           console.log(sql);
          db.all(sql, [], (err, rows) => {
            if (err) {
              throw err;
            }
            if(rows.length>0){
            let row=rows[0];
            let websiteId=row.ID;

 
        
        var ip=w.ip?w.ip:'';
        var country=w.country?w.country:'';
        var city=w.city?w.city:'';
        var latitude=w.latitude?w.latitude:0;
        var longitude=w.longitude?w.longitude:0;
        var region=w.region?w.region:'';
        //Check whether there allready is a record for this ip and website:
        var sql0=`SELECT ID id, Visits visits FROM CallingIP WHERE IP = ? AND itsWebsite_ID = ?`;
        console.log(sql0);
        db.all(sql0, [ip, websiteId], (err, rows) => {
          if (err) {
            console.log('err')
            throw err;
          }
          var str='';
          console.log(`number of rows: ${rows.length}`);
          if(rows.length>0){ //If there is a record, add visit:
              var row=rows[0];
              var id=row.id;
              var visits=row.visits+1;
              str=`UPDATE CallingIP SET Visits=${visits}, Updated=DATETIME('now') WHERE ID=${id}`
            }
          else
          {
            //If not, insert new record:
  
            str=`INSERT INTO CallingIP (IP, Visits, itsCustomer_ID, itsWebsite_ID, Created, Updated, Country, 
              City, Latitude, Longitude, Region)
            VALUES('${ip}',
                1,
                ${customerId},
                ${websiteId},
                DATETIME('now'),
                DATETIME('now'),
                '${country}',
                '${city}',
                ${latitude},
                ${longitude},
                '${region}')
                `                                               
          }
        //console.log(str);
        db.serialize(() => {
          db.run(str);

          db.close((err) => {
          if (err) {
            return console.error(err.message);
          }
      });
    });
  }
        )}
    });
  
  }

    });
    
    
  }
  });
}


function performRequest(endpoint, ip, success) {
  var headers = {};
 endpoint += '' + ip;

  var options = {
    path: endpoint,
    method: 'GET',
    headers: headers
  };

  var req = https.request(endpoint, function(res) {
    res.setEncoding('utf-8');

    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });

    res.on('end', function() {
      console.log(responseString);
      var responseObject = JSON.parse(responseString);
      success(responseObject);
    });
  });

  req.write('');
  req.end();
}


exports.printDate = function(includeSeconds=false) {
  var temp = new Date();
  var dateStr = this.printDateFrom(temp, includeSeconds);
  return dateStr;
}

exports.printDateFrom = function(temp, includeSeconds=false) {
  
  var dateStr = padStr(temp.getFullYear()) +'-'+
                padStr(1 + temp.getMonth()) +'-'+
                padStr(temp.getDate()) +' '+
                padStr(temp.getHours()) +':'+
                padStr(temp.getMinutes());// +
  if(includeSeconds){
    dateStr += ':'+padStr(temp.getSeconds());
  }
  return dateStr ;
}

function padStr(i) {
  return (i < 10) ? "0" + i : "" + i;
}


/////////////////////////////////////////////


