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

exports.album_by_name = function(name, callback) {
  db.albums.find({ _id: name }).toArray(function(err, results) {
    if (err) {
      callback(err)
      return
    }
    if (results.length == 0) {
      callback(null, null)
    } else if (results.length == 1) {
      callback(null, results[0])
    } else {
      console.error('More than one album named: ' + name)
      console.error(results)
      callback(backutils.db_error())
    }
  })
}

exports.all_albums = function (sort_field, sort_desc, skip, count, callback) {
  var sort = {}
  sort[sort_field] = sort_desc ? -1 : 1
  db.albums.find()
    .sort(sort)
    .limit(count)
    .skip(skip)
    .toArray(callback)
}

exports.photos_for_albums = function(album_name, pn, ps, callback) {
  var sort = { date: -1 }
  db.photos.find({ albumid: album_name })
    .skip(pn)
    .limit(ps)
    .sort('date')
    .toArray(callback)
}

exports.add_photo = function(photo_data, path_to_photo, callback) {
  var final_photo
  var  base_fn = path.basename(path_to_photo).toLowerCase()
  async.waterfall([
    function(cb) {
      try {
        backhelp.verify(photo_data, ['albumid', 'description', 'date' ])
        photo_data.filename = base_fn
        if (!backhelp.valid_filename(photo_data.albumid))
          throw invalid_album_name()
      } catch (e) {
        cb(e)
      }
      cb(null, photo_data)
    },
    function(pd, cb) {
      pd._id = pd.albumid + "_" + pd.filename
      db.photos.insert(pd, { w: 1, safe: true }, cb)
    },
    function(new_photo, cb) {
      final_photo = new_photo[0]
      var save_path = local.config.static_content + 'albums/' + photo_data.albumid + '/' + base_fn
      backhelp.file_copy(path_to_photo, save_path, true, cb)
    }
  ],
  function(err, results) {
      if (err && err instanceof Error && err.errno != undefined)
        callback(backhelp.file_error(err))
      else
        callback(err, err ? null : final_photo)
  })
}

















