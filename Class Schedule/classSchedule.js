﻿var express = require('express');
var http = require('http');
var md5 = require('md5');
var querystring = require('querystring');
var fs = require('fs');
var jsdom = require("jsdom");
var $ = require('jquery')(jsdom.jsdom().defaultView);
var ical = require('ical-generator');
var iconv = require('iconv-lite');
var request = require('request');
var step = require('step');

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
  var timetable_src = "http://202.202.1.176:8080/znpk/Pri_StuSel_rpt.aspx";
  var headers;  // request headers
  
  step(
    // Fisrt visit to get ASP.NET_SessionId 
    function firstVisit() {
      request.get(login_src, this);
    },
    
    // Login operation
    function login(err, res, body, callback) {
      if (err || res.statusCode != 200) {
        if (err) console.log(err);
        else console.log('Error code is ' + res.statusCode);
        return;
      }
      
      // force on ASP.NET_SessionId(cookie)
      var sessionId = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
      
      var html = body;
      // get __VIEWSTATE and __VIEWSTATEGENERATOR
      var __viewstateA = html.match(/<.*__VIEWSTATE.*>/g);
      var viewstate = __viewstateA[0].match(/value=".*"/g)[0].split('"')[1];   // __VIEWSTATE
      var viewstateg = __viewstateA[1].match(/value=".*"/g)[0].split('"')[1];  // __VIEWSTATEGENERATOR

      // also need in getTimetable
      headers = {
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
      
      // need a hash operation to ensure security
      var hash_value = md5(sid + md5(password).substring(0, 30).toUpperCase() + '10611').substring(0, 30).toUpperCase();

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
      
      request({
        headers: headers,
        url: login_src, 
        body: post_data, 
        method: 'POST'
      }, function (err, httpResponse, body) {
        if (httpResponse.statusCode == 200) {
          console.log('login success!');
        }
      });
      
      callback(null);
    },
    
    // Get taimetable operation
    function getTimetable(err, callback) {
      var post_data_st = querystring.stringify({
        "Sel_XNXQ": "20151",
        "rad": "on",
        "px": "1",
        "Submit01": "检索"
      });

      request({
        headers: headers,
        // return buffer directly to resolve decode problem
        encoding: null,
        url: timetable_src,
        body: post_data_st,
        method: 'POST'
      }, function (err, post_res, body) {
        console.log("Read success");
        var page = iconv.decode(body, 'GBK');
        
        // start to parse
        parseTimetable(page);
      });
      
      callback(null);
    },
    
    // Logout operation
    function logout(err) {
      request.get("http://202.202.1.176:8080/sys/Logout.aspx", function (err, res, body) {
        if (res.statusCode == 200) console.log('Log out success');
      });
    }
  );
}


function parseTimetable(timetable) {
  var table = timetable.match(/<TABLE.*\/table>/g)[0];
  var tbody = table.match(/<tbody.*?\/tbody/g)[0];
  var perSubject = tbody.match(/<tr.*?\/tr>/g);

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
      subject.credit = col[2];         // credit
      subject.period = col[3];         // period
      subject.teach_period = col[4];   // teach_period
      subject.exp_period = col[5];     // exp_period
      subject.classification = col[6]; // classification
      subject.teach_method = col[7];   // teach_method
      subject.exam_method = col[8];    // exam_method
      subject.teacher = col[9];        // teacher
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
    subject.days = toDays(days);
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
      var day = termBeginD + (allSub[i].weeks[j] - 1) * 7 + (allSub[i].days - 1);
      var shour = classStart[allSub[i].session[0] - 1].hour;
      var sminute = classStart[allSub[i].session[0] - 1].minute;
      var ehour = classStart[allSub[i].session[allSub[i].session.length - 1] - 1].hour;
      var eminute = classStart[allSub[i].session[allSub[i].session.length - 1] - 1].minute + 45;
      
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
      console.log('Success, all done!');
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
