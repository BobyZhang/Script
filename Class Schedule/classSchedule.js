
var http = require('http');
var md5 = require('md5');

getScheule('20131801', '251712');

function getScheule(sid, password) {
  var login_src = "http://202.202.1.176:8080/_data/index_login.aspx";
  
  var sessionId;  // cookie
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

      var header = {
        "Accept": "﻿application/x-ms-application, image/jpeg, application/xaml+xml,image/gif, image/pjpeg, application/x-ms-xbap, */*",
        "Referer": "http://202.202.1.176:8080/_data/index_login.aspx",
        "Accept-Language": "zh-CN",
        //"User-Agent": "﻿Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; WOW64; Trident/4.0;SLCC2;)",
        "Connection": "Keep-Alive",
        "Cookie": "ASP.NET_SessionId=" + sessionId
      }

      var hash_value = '';
      console.log(md5('message'))
      post_data = {
        "__VIEWSTATE": viewstate,
        "__VIEWSTATEGENERATOR": viewstateg,
        "Sel_Type": "STU",
        "txt_dsdsdsdjkjkjc": sid,
        "txt_dsdfdfgfouyy": password,
        "txt_ysdsdsdskgf": "",
        "pcInfo": "﻿Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; WOW64; Trident/4.0; SLCC2;.NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729;Media Center PC 6.0)x860 SN:NULL",
        "typeName": "学生",
        "aerererdsdxcxdfgfg": "",
        "efdfdfuuyyuuckjg": hash_value
      }

    });

    
    
  });

  req.end();
}


