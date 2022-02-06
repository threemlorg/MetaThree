const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const url = require('url');
const https = require('https');
var dbName='./data/threeml.db';
const whoisapi='https://ipwhois.app/json/';
var customerId=-1;

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

          let sql = `INSERT INTO Chat (IP, Nickname, Message, CreateDate, Room, itsCustomer_ID)
          VALUES (
            '${chat.ip}',
            '${chat.u}',
            '${chat.m}',
            DATETIME('now'),
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
                var arr=[];
                arr.push(chat);
                io.sockets.in(chat.r).emit("new-data",arr);
            });
         
      
          });
        }
        });
      }
  
  
  });

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


exports.printDate = function() {
  var temp = new Date();
  var dateStr = padStr(temp.getFullYear()) +'-'+
                padStr(1 + temp.getMonth()) +'-'+
                padStr(temp.getDate()) +' '+
                padStr(temp.getHours()) +':'+
                padStr(temp.getMinutes());// +':'+
               // padStr(temp.getSeconds());
  return (dateStr );
}

function padStr(i) {
  return (i < 10) ? "0" + i : "" + i;
}


/////////////////////////////////////////////


