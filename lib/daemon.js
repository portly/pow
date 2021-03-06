// Generated by CoffeeScript 1.6.3
(function() {
  var Daemon, DnsServer, EventEmitter, HttpServer, fs, path,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  EventEmitter = require("events").EventEmitter;

  HttpServer = require("./http_server");

  DnsServer = require("./dns_server");

  fs = require("fs");

  path = require("path");

  module.exports = Daemon = (function(_super) {
    __extends(Daemon, _super);

    function Daemon(configuration) {
      var hostRoot,
        _this = this;
      this.configuration = configuration;
      this.stop = __bind(this.stop, this);
      this.hostRootChanged = __bind(this.hostRootChanged, this);
      this.httpServer = new HttpServer(this.configuration);
      this.dnsServer = new DnsServer(this.configuration);
      process.on("SIGINT", this.stop);
      process.on("SIGTERM", this.stop);
      process.on("SIGQUIT", this.stop);
      hostRoot = this.configuration.hostRoot;
      this.restartFilename = path.join(hostRoot, "restart.txt");
      this.on("start", function() {
        return _this.watcher = fs.watch(hostRoot, {
          persistent: false
        }, _this.hostRootChanged);
      });
      this.on("stop", function() {
        var _ref;
        return (_ref = _this.watcher) != null ? _ref.close() : void 0;
      });
    }

    Daemon.prototype.hostRootChanged = function() {
      var _this = this;
      return fs.exists(this.restartFilename, function(exists) {
        if (exists) {
          return _this.restart();
        }
      });
    };

    Daemon.prototype.restart = function() {
      var _this = this;
      return fs.unlink(this.restartFilename, function(err) {
        if (!err) {
          return _this.emit("restart");
        }
      });
    };

    Daemon.prototype.start = function() {
      var dnsPort, flunk, httpPort, pass, startServer, _ref,
        _this = this;
      if (this.starting || this.started) {
        return;
      }
      this.starting = true;
      startServer = function(server, port, callback) {
        return process.nextTick(function() {
          var err;
          try {
            server.on('error', callback);
            server.once('listening', function() {
              server.removeListener('error', callback);
              return callback();
            });
            return server.listen(port);
          } catch (_error) {
            err = _error;
            return callback(err);
          }
        });
      };
      pass = function() {
        _this.starting = false;
        _this.started = true;
        return _this.emit("start");
      };
      flunk = function(err) {
        _this.starting = false;
        try {
          _this.httpServer.close();
        } catch (_error) {}
        try {
          _this.dnsServer.close();
        } catch (_error) {}
        return _this.emit("error", err);
      };
      _ref = this.configuration, httpPort = _ref.httpPort, dnsPort = _ref.dnsPort;
      return startServer(this.httpServer, httpPort, function(err) {
        if (err) {
          return flunk(err);
        } else {
          return startServer(_this.dnsServer, dnsPort, function(err) {
            if (err) {
              return flunk(err);
            } else {
              return pass();
            }
          });
        }
      });
    };

    Daemon.prototype.stop = function() {
      var stopServer,
        _this = this;
      if (this.stopping || !this.started) {
        return;
      }
      this.stopping = true;
      stopServer = function(server, callback) {
        return process.nextTick(function() {
          var close, err;
          try {
            close = function() {
              server.removeListener("close", close);
              return callback(null);
            };
            server.on("close", close);
            return server.close();
          } catch (_error) {
            err = _error;
            return callback(err);
          }
        });
      };
      return stopServer(this.httpServer, function() {
        return stopServer(_this.dnsServer, function() {
          _this.stopping = false;
          _this.started = false;
          return _this.emit("stop");
        });
      });
    };

    return Daemon;

  })(EventEmitter);

}).call(this);
