var fs = require('fs'),
    crypto = require('crypto'),
    local = require('../local.config.js'),
    db = require('./db.js'),
    path = require('path'),
    async = require('async'),
    backhelp = require('./backend_helpers.js')

exports.create_album = function(data, callback) {
  var final_album
  var write_succeeded = false
  async.waterfall([
    function(cb) {
      try {
        backhelp.verify(data,['name', 'title', 'date', 'description'])
        if (!backhelp.valid_filename(data.name))
          throw invalid_album_name()
      } catch (e) {
        cb(e)
      }
      cb(null, data)
    },
    function(album_data, cb) {
      var write = JSON.parse(JSON.stringify(album_data))
      write._id = album_data.name
      db.albums.insert(write, { w: 1, safe: true }, cb)
    },
    function(new_album, cb) {
      write_succeeded = true
      final_album = new_album[0]
      fs.mkdir(local.config.static_content + 'albums/' + data.name, cb)
    }
    ],
    function(err, results) {
      if (err) {
        if (write_succeeded)
          db.albums.remove({ _id: data.name }, function() {})
        if (err instanceof Error && err.code == 11000)
          callback(backhelp.album_already_exists())
        else if (err instanceof Error && err.errno != undefined)
          callback(backhelp.file_error(err))
        else
          callback(err)
      } else {
        callback(err, err ? null : final_album)
      }
    })
}

