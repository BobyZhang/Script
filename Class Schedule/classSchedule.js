
var http = require('http');
var md5 = require('md5');
var querystring = require('querystring');
var fs = require('fs');
var jsdom = require("jsdom");
var $ = require('jquery')(jsdom.jsdom().defaultView);

getScheule('20131801', '251712');

function getScheule(sid, password) {
  var login_src = "http://202.202.1.176:8080/_data/index_login.aspx";
  
  var sessionId;  // cookie
  var timetable = '';
  var viewstate;
  var viewstateg;

  var options = {
    hostname: '202.202.1.176',
    port: 8080,
    path: '/_data/index_login.aspx',
    method: 'GET'
  };

  //console.log('haha');

  // Fisrt visit to  get ASP.NET_SessionId
  var req = http.request(options, function (res) {
    // force on ASP.NET_SessionId(cookie)
    sessionId = res.headers['set-cookie'][0].split(';')[0].split('=')[1];

    //res.setEncoding('utf8');
    var html = '';
    res.on('data', function (data) {
      html += data;
    })
    .on('end', function () {
      // get __VIEWSTATE and __VIEWSTATEGENERATOR
      var __viewstateA = html.match(/<.*__VIEWSTATE.*>/g);
      viewstate = __viewstateA[0].match(/value=".*"/g)[0].split('"')[1];   // __VIEWSTATE
      viewstateg = __viewstateA[1].match(/value=".*"/g)[0].split('"')[1];  // __VIEWSTATEGENERATOR

      var headers = {
        "Accept": "﻿application/x-ms-application, image/jpeg, application/xaml+xml,image/gif, image/pjpeg, application/x-ms-xbap, */*",
        "Referer": "http://202.202.1.176:8080/_data/index_login.aspx",
        "Accept-Language": "zh-CN",
        "User-Agent": "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.2; WOW64; Trident/7.0; .NET4.0C; .NET4.0E)",
        //"Connection": "Keep-Alive",
        "Content-Type": "application/x-www-form-urlencoded",
        //"Content-Type": "text/html; charset=gb2312",
        "Accept-Encoding": "gzip, deflate",
        "Cookie": "ASP.NET_SessionId=" + sessionId
      }
      
      var hash_value = md5(sid + md5(password).substring(0, 30).toUpperCase() + '10611').substring(0, 30).toUpperCase();
      //console.log(hash_value)
      //hash_value = md5(sid + md5(passwd).hexdigest()[0:30].upper() + "10611").hexdigest()[0:30].upper()

      var login_options = {
        method: 'POST',
        hostname: '202.202.1.176',
        port: 8080,
        path: '/_data/index_login.aspx',
        headers: headers
      };

      var post_data = querystring.stringify({
        "__VIEWSTATE": viewstate,
        "__VIEWSTATEGENERATOR": viewstateg,
        "Sel_Type": "STU",
        "txt_dsdsdsdjkjkjc": sid,
        "txt_dsdfdfgfouyy": password,
        "txt_ysdsdsdskgf": "",
        "pcInfo": "﻿Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.2; WOW64; Trident/7.0; .NET4.0C; .NET4.0E)x860 SN:NULL",
        "typeName": "学生",
        "aerererdsdxcxdfgfg": "",
        "efdfdfuuyyuuckjg": hash_value
      });

      var login_req = http.request(login_options, function (login_res) {
        //console.log(login_res.statusCode);
        //console.log(login_res.headers);
        
      });

      login_req.write(post_data);
      
      var post_data_st = querystring.stringify({
        "Sel_XNXQ": "20151",
        "rad": "on",
        "px": "1",
        "Submit01": "检索"
      });
      var post_options = {
        method: 'POST',
        hostname: '202.202.1.176',
        port: 8080,
        path: '/znpk/Pri_StuSel_rpt.aspx',
        headers: headers
      };

      var post_req = http.request(post_options, function (post_res) {
        post_res.setEncoding('utf8');
        //console.log(post_res.statusCode)
        //console.log(post_res)
        post_res.on('data', function (data) {
          timetable += data;
        })
        .on('end', function () {
          //console.log(timetable);
          fs.open("test.html", "w", 0644, function (e, fd) {
            if (e) throw e;
            fs.write(fd, timetable, 0, 'utf8', function (e) {
              if (e) throw e;
              fs.closeSync(fd);
            })
          });
          console.log('Read success.');

          // start to parse
          parseTimetable(timetable);
        })
      });
      post_req.write(post_data_st);
      post_req.end();

      // log out
      http.get('http://202.202.1.176:8080/sys/Logout.aspx', function (logout_res) {
        if (logout_res.statusCode == 200) {
          console.log('Log out success.');
        }
      });

      login_req.end();
      console.log(timetable);
      //return timetable;

    });
  });

  req.end();
}


function parseTimetable(timetable) {
  //var tr = timetable.match(/<tr >(<td.*>.*<\/td>){13}<\/tr>/g);
  var html = $(timetable);
  console.log(html.find('.page_title'));
}
