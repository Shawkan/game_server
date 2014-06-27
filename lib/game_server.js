var socketio = require('socket.io');
var io;
var playerNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};
var players = {};

exports.listen = function(server) {
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function(socket) {
        playerNumber = assignPlayerName(socket, playerNumber, nickNames, namesUsed);
        joinRoom(socket);
        handleKeyPressing(socket);
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);
        socket.on('rooms', function() {
            socket.emit('rooms', io.sockets.manager.rooms);
        });        
        handleClientDisconnection(socket, nickNames, namesUsed);
    });
};

function assignPlayerName(socket, playerNumber, nickNames, namesUsed) {
    var name = 'Player' + playerNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    socket.broadcast.emit('playerConnect', {
        name: nickNames[socket.id],
        x: 100,
        y: 400});
    namesUsed.push(name);
    console.log(name + ' connected');
    return playerNumber + 1;
}
function handleKeyPressing(socket) {
    socket.on('movingPressed', function(data) {
        players[data.name].x = data.x;
        players[data.name].y = data.y;
        io.sockets.emit('moving', {
            name: data.name,
            key: data.key
        });
    });
    socket.on('turningPressed', function(data) {
        players[data.name].angle = data.angle;
        io.sockets.emit('turning', {
            name: data.name,
            key: data.key
        });
    });
    socket.on('stop', function(data) {
        io.sockets.emit('stoping', {
            name: data.name,
            key: data.key
        });
    });
    socket.on('turningGunPressed', function(data) {
        players[data.name].angleGun = data.angleGun;
        io.sockets.emit('turningGun', {
            name: data.name,
            key: data.key,
        });
    });
}


function joinRoom(socket) {
    socket.emit('joining', 
        players
    );
    var name = nickNames[socket.id];

    players[name] = {
        name: name,
        x: 100,
        y: 400
    };;


//    var players = io.sockets.clients();
//    if (players.length > 1) {
//        var playersSummary = 'Users currently: ';
//        for (var index in players) {
//            var userSocketId = players[index].id;
//            if (userSocketId != socket.id) {
//                if (index > 0) {
//                    playersSummary += ', ';
//                }
//                playersSummary += nickNames[userSocketId];
//            }
//        }
//        playersSummary += '.';
//        socket.emit('joining', {players: players.length});
//    }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function(name) {
        if (name.indexOf('Player') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Player".'
            });
        } else {
            if (namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}

function handleMessageBroadcasting(socket) {
    socket.on('message', function(message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}

function handleRoomJoining(socket) {
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
        console.log(nickNames[socket.id] + ' disconected');
        io.sockets.emit('playerDisconect', nickNames[socket.id]);
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete players[nickNames[socket.id]];
        delete nickNames[socket.id]
    });
}


//#!/bin/env node
////  OpenShift sample Node application
//var express = require('express');
//var fs      = require('fs');
//
//
///**
// *  Define the sample application.
// */
//var SampleApp = function() {
//
//    //  Scope.
//    var self = this;
//
//
//    /*  ================================================================  */
//    /*  Helper functions.                                                 */
//    /*  ================================================================  */
//
//    /**
//     *  Set up server IP address and port # using env variables/defaults.
//     */
//    self.setupVariables = function() {
//        //  Set the environment variables we need.
//        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
//        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;
//
//        if (typeof self.ipaddress === "undefined") {
//            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
//            self.ipaddress = "127.0.0.1";
//        };
//    };
//
//
//    /**
//     *  Populate the cache.
//     */
//    self.populateCache = function() {
//        if (typeof self.zcache === "undefined") {
//            self.zcache = { 'index.html': '' };
//        }
//
//        //  Local cache for static content.
//        self.zcache['index.html'] = fs.readFileSync('./public/index.html');
//    };
//
//
//    /**
//     *  Retrieve entry (content) from cache.
//     *  @param {string} key  Key identifying content to retrieve from cache.
//     */
//    self.cache_get = function(key) { return self.zcache[key]; };
//
//
//    /**
//     *  terminator === the termination handler
//     *  Terminate server on receipt of the specified signal.
//     *  @param {string} sig  Signal to terminate on.
//     */
//    self.terminator = function(sig){
//        if (typeof sig === "string") {
//           console.log('%s: Received %s - terminating sample app ...',
//                       Date(Date.now()), sig);
//           process.exit(1);
//        }
//        console.log('%s: Node server stopped.', Date(Date.now()) );
//    };
//
//
//    /**
//     *  Setup termination handlers (for exit and a list of signals).
//     */
//    self.setupTerminationHandlers = function(){
//        //  Process on exit and signals.
//        process.on('exit', function() { self.terminator(); });
//
//        // Removed 'SIGPIPE' from the list - bugz 852598.
//        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
//         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
//        ].forEach(function(element, index, array) {
//            process.on(element, function() { self.terminator(element); });
//        });
//    };
//
//
//    /*  ================================================================  */
//    /*  App server functions (main app logic here).                       */
//    /*  ================================================================  */
//
//    /**
//     *  Create the routing table entries + handlers for the application.
//     */
//    self.createRoutes = function() {
//        self.routes = { };
//
//        self.routes['/asciimo'] = function(req, res) {
//            var link = "http://i.imgur.com/kmbjB.png";
//            res.send("<html><body><img src='" + link + "'></body></html>");
//        };
//
//        self.routes['/'] = function(req, res) {
//            res.setHeader('Content-Type', 'text/html');
//            res.send(self.cache_get('index.html') );
//        };
//    };
//
//
//    /**
//     *  Initialize the server (express) and create the routes and register
//     *  the handlers.
//     */
//    self.initializeServer = function() {
//        self.createRoutes();
//        self.app = express();
//
//        //  Add handlers for the app (from the routes).
//        for (var r in self.routes) {
//            self.app.get(r, self.routes[r]);
//        }
//    };
//
//
//    /**
//     *  Initializes the sample application.
//     */
//    self.initialize = function() {
//        self.setupVariables();
//        self.populateCache();
//        self.setupTerminationHandlers();
//
//        // Create the express server and routes.
//        self.initializeServer();
//    };
//
//
//    /**
//     *  Start the server (starts up the sample application).
//     */
//    self.start = function() {
//        //  Start the app on the specific interface (and port).
//        self.app.listen(self.port, self.ipaddress, function() {
//            console.log('%s: Node server started on %s:%d ...', Date(Date.now() ), self.ipaddress, self.port);
//        });
//    };
//
//};   /*  Sample Application.  */
//
//
//
///**
// *  main():  Main code.
// */
//var zapp = new SampleApp();
//zapp.initialize();
//zapp.start();
//
