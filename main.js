/* jshint esversion:6, node:true, loopfunc:true, undef: true, unused: true, sub:true */
const {app,BrowserWindow,ipcMain} = require('electron');
const fs = require('fs');
const path = require("path");
const async = require("async");
const parse = require("./parse");
//require('crash-reporter').start();

ipcMain.on('list', function(event) {
  fs.readdir(path.join(__dirname,"db"),function(err, dbs){
    if(err) return event.sender.send('error', err);
    event.sender.send('list', dbs);
  });
});


ipcMain.on('get', function(event, dbname) {
  let dir = path.join(__dirname,"db",dbname);
  function parseFile(filename,cb){
    let name = path.parse(filename).name;
    let filepath = path.join(dir,filename);
    fs.readFile(filepath,function(err,data){
      if(err) return cb(err);
      try {
        data = parse(""+data);
      }catch(err){
        return cb(null,{name,error:"cannot parse the file"});
      }
      return cb(null,{name,data});
    });
  }
  fs.readdir(dir,function(err,files){
    if(err) return event.sender.send('error', err);
    async.map(files, parseFile, function(err,data){
      if(err) return event.sender.send('error', err);
      event.sender.send('get', data);
    });
  });
});

app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

app.on('ready', function() {
  let mainWindow = new BrowserWindow({width: 1280, height: 720});
  mainWindow.setMenuBarVisibility(false);
  //mainWindow.maximize();
  mainWindow.loadURL('file://' + __dirname + '/index.html');
  mainWindow.on('closed', function() { mainWindow = null; });
  mainWindow.openDevTools();
});
