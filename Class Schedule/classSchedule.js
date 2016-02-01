var express = require('express');
var http = require('http');
var md5 = require('md5');
var querystring = require('querystring');
var fs = require('fs');
var jsdom = require("jsdom");
var $ = require('jquery')(jsdom.jsdom().defaultView);
var ical = require('ical-generator');
var iconv = require('iconv-lite');

var app = express();

var allsubject = [];
// term begins
var termBeginY = 2016;
var termBeginM = 2;
var termBeginD = 22;
// class time
var classStart = [
  new Time(8, 30), new Time(9, 25), new Time(10, 30), new Time(11, 25),
  new Time(14, 0), new Time(14, 55), new Time(16, 0), new Time(16, 55),
  new Time(19, 0), new Time(19, 55), new Time(20, 50), new Time(21, 45 )
]

// get timetable
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
        // console.log(post_res.headers);
        // post_res.setEncoding('utf8');
        var chunks = [];
        post_res.on('data', function (data) {
          chunks.push(data);
        })
        .on('end', function () {
          // console.log(timetable);
          // fs.open("test.html", "w", function (e, fd) {
          //   if (e) throw e;
          //   fs.write(fd, timetable, 0, 'utf8', function (e) {
          //     if (e) throw e;
          //     fs.closeSync(fd);
          //   })
          // });
          var buf = iconv.decode(Buffer.concat(chunks), 'GBK');
          console.log('Read success.');

          // start to parse
          parseTimetable(buf);
        })
      });
      
      post_req.write(post_data_st);

      post_req.end();

      // log out
      http.get('http://202.202.1.176:8080/sys/Logout.aspx', function (logout_res) {
        if (logout_res.statusCode == 200) {
          // console.log('Log out success.');
        }
      });

      login_req.end();
      // console.log(timetable);
      //return timetable;

    });
  });

  req.end();
}


function parseTimetable(timetable) {
  // console.log(timetable);
  //var tr = timetable.match(/<tr >(<td.*>.*<\/td>){13}<\/tr>/g);
  var table = timetable.match(/<TABLE.*\/table>/g)[0];
  var tbody = table.match(/<tbody.*?\/tbody/g)[0];
  var perSubject = tbody.match(/<tr.*?\/tr>/g);
  // console.log(perSubject.length);
  
  // var subject = new Subject()
  var lastSubject = new Subject();
  for (var i = 0; i < perSubject.length; ++i) {
    var subject = new Subject();
    var row = perSubject[i].match(/<td.*?\/td>/g);
    var col = [];
    for (var j = 0; j < row.length; ++j) {
      col[j] = $(row[j]).html().split('<')[0];
    }
    // Number
    var num = col[0];
    
    if (col[1].length > 0) {
      // code and name
      var str = col[1].split(']');
      subject.code = str[0].split('[')[1];
      subject.name = str[1];    
      // credit
      subject.credit = col[2];
      // period
      subject.period = col[3];
      // teach_period
      subject.teach_period = col[4];
      // exp_period
      subject.exp_period = col[5];
      // classification
      subject.classification = col[6];
      // teach_method
      subject.teach_method = col[7];
      // exam_method
      subject.exam_method = col[8];
      // teacher
      subject.teacher = col[9];
    }
    else {
      subject.code = lastSubject.code;
      subject.name = lastSubject.name;
      subject.credit = lastSubject.credit;
      subject.period = lastSubject.period;
      subject.teach_period = lastSubject.teach_period;
      subject.exp_period = lastSubject.exp_period;
      subject.classification = lastSubject.classification;
      subject.teach_method = lastSubject.teach_method;
      subject.exam_method = lastSubject.exam_method;
      subject.teacher = lastSubject.teacher;
    }
    // weeks
    var weeks = col[10].split('-');
    for (var k = parseInt(weeks[0]); k <= parseInt(weeks[1]); ++k) {
      subject.weeks.push(k);
    }
    // session and days
    var session = col[11].match(/\d\d?\-\d\d?/g)[0].split('-');
    for (var k = parseInt(session[0]); k <= parseInt(session[1]); ++k) {
      subject.session.push(k);
    }
    var days = col[11].split('[')[0];
    console.log(days);
    subject.days = toDays(days);
    console.log(subject.days);
    // address
    subject.address = col[12];
    
    // for hideValue
    lastSubject = subject;
    
    // push to all subject
    allsubject.push(subject);
  }
  
  // export to ics
  exportics(allsubject);
}

function exportics(allSub) {
  var cal = ical({
    prodId: {company: 'bobyZhang.com', product: 'CQU-ClassTimetable'},
    name: 'CQU-Timetable',
    timezone: 'CST'
  });
  
  for(var i = 0; i < allSub.length; ++i) {
    for (var j = 0; j < allSub[i].weeks.length; ++j) {
      // calculate days, hours and minutes
      // console.log(termBeginD);
      // console.log(allSub[i].weeks[j] - 1);
      // console.log(allSub[i].days - 1);
      // console.log();
      var day = termBeginD + (allSub[i].weeks[j] - 1) * 7 + (allSub[i].days - 1);
      var shour = classStart[allSub[i].session[0] - 1].hour;
      var sminute = classStart[allSub[i].session[0] - 1].minute;
      var ehour = classStart[allSub[i].session[allSub[i].session.length - 1] - 1].hour;
      var eminute = classStart[allSub[i].session[allSub[i].session.length - 1] - 1].minute + 45;
      
      // var dtstart = new Date(termBeginY, termBeginM, day);
      // var dtend = new Date(termBeginY, termBeginM, day);
      
      // add event
      cal.createEvent({
        // mth form 0 to 11
        start: new Date(termBeginY, termBeginM - 1, day, shour, sminute, 0),
        end: new Date(termBeginY, termBeginM - 1, day, ehour, eminute, 0),
        summary: allSub[i].name + '[' + allSub[i].code + ']',
        description: allSub[i].teacher,
        location: allSub[i].address
      });
    }
  } 
  
  // write to ics
  fs.open("CQU-timetable.ics", "w", function (e, fd) {
    if (e) throw e;
    fs.write(fd, cal.toString(), 0, 'utf8', function (e) {
      if (e) throw e;
      fs.closeSync(fd);
      console.log('Success!');
    })
  });
}

function Subject() {
  this.code = '',
  this.name = '',
  this.credit = '',
  this.period = '',
  this.teach_period = '',
  this.exp_period = '',
  this.classification = '',
  this.teach_method = '',
  this.exam_method = '',
  this.teacher = '',
  this.weeks = [],
  this.days = 0,
  this.session = [];
  this.address = ''
}

function Time(hour, minute) {
  this.hour = hour;
  this.minute = minute;
}

function toDays(days) {
  var d = 0;
  switch (days) {
    case "一":
      d = 1;
      break;
    case "二":
      d = 2;
      break;
    case "三":
      d = 3;
      break;
    case "四":
      d = 4;
      break;
    case "五":
      d = 5;
      break;
    case "六":
      d = 6;
      break;
    case "日":
      d = 7;
      break;
    default:
      break;
  } 
  return d;
}
