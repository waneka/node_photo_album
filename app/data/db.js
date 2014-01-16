var Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server,
    async = require('async'),
    local = require('../local.config.js')

var host = local.config.db_config.host
    ? local.config.db_config.host
    : 'localhost'
var port = local.config.db_config.port
    ? local.config.db_config.port
    : Connection.DEFAULT_PORT
var ps = local.config.db_config.poolSize
    ? local.config.db_config.poolSize : 5

var db = new Db('PhotoAlbums', new Server(host, port,
                                      {auto_reconnect: true, poolSize: ps }),
                { w: 1 })

exports.init = function(callback) {
  async.waterfall([
    function(cb) {
      db.open(cb)
    },
    function(opened_db, cb) {
      db.collection('albums', cb)
    },
    function(albums_coll, cb) {
      exports.albums = albums_coll
      db.collection('photos', cb)
    },
    function(photos_coll, cb) {
      exports.photos = photos_coll
      cb(null)
    }
    ], callback)
}

exports.albums = null
exports.photos = null
