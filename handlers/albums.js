var helpers = require('./helpers.js'),
  album_data = require('../data/album.js'),
  async = require('async'),
  fs = require('fs')

exports.version = '0.1.0'

/** Album Class **/
function Album(album_data) {
  this.name = album_data.name
  this.date = album_data.date
  this.title = album_data.title
  this.description = album_data.description
  this._id = album_data._id
}

Album.prototype._id = null
Album.prototype.name = null
Album.prototype.date = null
Album.prototype.title = null
Album.prototype.description = null

Album.prototype.response_obj = function() {
  return {
    name: this.name,
    date: this.date,
    title: this.title
    description: this.description
  }
}
Album.prototype.photos = function(pn,ps, callback) {
  if (this.album_photos != undefined) {
    callback(null, this.album_photos)
    return
  }

  album_data.photos_for_album(this.name, pn, ps, function(err, results) {
    if (err) {
      callback(err)
      return
    }
    var out = []
    for (var i = 0; i < results.length; i++) {
      out.push(new Photo(results[i]))
    }
    this.album_photos = out
    callback(null, this.album_photos)
  })
}
Album.prototype.add_photo = function (data, path, callback) {
  album_data.add_photo(data, path, function(err, photo_data) {
    if (err)
      callback(err)
    else {
      var p = new Photo(photo_data)
      if (this.all_photos)
        this.all_photos.push(p)
      else
        this.app_photos = [ p ]
      callback(null, p)
    }
  })
}


/** Photo Class **/
function Photo(photo_data) {
  this.filename = photo_data.filename
  this.date = photo_data.date
  this.albumid = photo_data.albumid
  this.description = photo_data.description
  this._id = photo_data._id
}
Photo.prototype._id = null
Photo.prototype.filename = null
Photo.prototype.date = null
Photo.prototype.albumid = null
Photo.prototype.description = null
Photo.prototype.response_obj = function() {
  return {
    filename: this.filename,
    date: this.date,
    albumid: this.albumid,
    description: this.description
  }
}


/** Album Module functions **/
exports.create_album = function(req, res) {
  async.waterfall([
    function(cb) {
      if (!req.body || !req.body.name || !helpers.valid_filename(req.body.name)) {
        cb(helpers.no_such_album())
        return
      }
      cb(null)
    },
    function(cb) {
      album_data.create_album(req.body, cb)
    }
    ],
    function(err, results) {
      if (err) {
        var a = new Album(results)
        helpers.send_success(res, {album: a.response_obj() })
      }
    })
}

exports.list_all = function(req, res) {
  album_data.all_albums('date', true, 0, 25, function(err, results) {
    if (err) {
      helpers.send_failure(res, err)
    } else {
      var out = []
      if (results) {
        for (var i = 0; i < results.length; i++) {
          out.push(new Album(results[i]).response_obj())
        }
      }
      helpers.send_success(res, { albums: out })
    }
  })
}

exports.album_by_name = function(req, res) {
  async.waterfall([
    function(cb) {
      if (!req.params || !req.params.album_name)
        cb(helpers.no_such_album())
      else
        album_data.album_by_name(req.params.album_name, cb)
    }
  ],
  function(err, results) {
    if (err) {
      helpers.send_failure(res, err)
    } else if (!results) {
      helpers.send_failure(res, helpers.no_such_album())
    } else {
      var a = new Album(album_data)
      helpers.send_success(res, { album: a.response_obj() })
    }
  })
}

exports.photos_for_album = function(req, res) {
  var page_num = req.query.page ? req.query.page : 0
  var page_size = req.query.page_size ? req.query.page_size : 1000

  page_num = parseInt(page_num)
  page_size = parseInt(page_size)
  if (isNaN(page_num)) page_num = 0
  if (isNaN(page_size)) page_size = 1000

  var album
  async.waterfall([
    function(cb) {
      if (!req.params || !req.params.album_name)
        cb(helpers.no_such_album())
      else
        album_data.album_by_name(req.params.album_name, cb)
    },
    function(album_data, cb) {
      if (!album_data) {
        cb(helpers.no_such_album())
        return
      }
      album = new Album(album_data)
      album.photos(page_num, page_size, cb)
    },
    function(photos, cb) {
      var out = []
      for (var i = 0; i < photos.length; i++) {
        out.push(photos[i].response_obj())
      }
      cb(null, out)
    }
  ],
  function(err, results) {
    if (err) {
      helpers.send_failure(res, err)
      return
    }
    if (!results) results = []
    var out = { photos: results, album_data: album.response_obj() }
    helpers.send_success(res, out)
  })
}

exports.add_photo_to_album = function(req, res) {
  var album
  async.waterfall([
    function(cb) {
      if (!req.body)
        cb(helpers.missing_data('POST data'))
      else if (!req.files || !req.files.photo_file)
        cb(helpers.missing_data('a file'))
      else if (!helpers.is_image(req.files.photo_file.name))
        cb(helpers.not_image())
      else
        album_data.album_by_name(req.params.album_name, cb)
    },
    function(album_data, cb) {
      if (!album_data) {
        cb(helpers.no_such_album())
        return
      }
      album = new Album(album_data)
      req.body.filename = req.files.photo_file.name
      album.add_photo(req.body, req.files.photo_file.path, cb)
    }
  ],
  function (err, p) {
    if (err) {
      helpers.send_failure(res, err)
      return
    }
    var out = { photo: p.response_obj(), album_data: album.response_obj() }
    helpers.send_success(res, out)
  })
}


function load_album_list(callback) {
  fs.readdir('albums', function (err, files) {
    if(err) {
      callback(helpers.make_error('file_error', JSON.stringify(err)))
      return
    }

    var only_dirs = [];

    async.forEach(files, function(element, cb) {
      fs.stat('albums/' + element, function(err, stats) {
        if (err) {
          cb(helpers.make_error('file_error', JSON.stringify(err)))
          return
        }
        if (stats.isDirectory()) {
          only_dirs.push({ name: element })
        }
        cb(null)
      })
    },
    function(err) {
      callback(err, err ? null : only_dirs)
    })
  })
}

function load_album(album_name, page, page_size, callback) {
  fs.readdir('albums/' + album_name, function(err, files) {
    if (err) {
      if (err.code == "ENOENT") {
        callback(helpers.no_such_album())
      } else {
        callback(helpers.make_error('file_error', JSON.stringify(err)))
      }
      return
    }

    var only_files = []
    var path = 'albums/' + album_name + '/';

    async.forEach(files, function(element, cb) {
      fs.stat(path + element, function(err, stats) {
        if (err) {
          cb(helpers.make_error('file_error', JSON.stringify(err)))
          return
        }
        if (stats.isFile()) {
          var obj = {filename: element, desc: element }
          only_files.push(obj)
        }
        cb(null)
      })
    },
    function(err) {
      if (err) {
        callback(err)
      } else {
        var ps = page_size
        var photos = only_files.splice(page * ps, ps)
        var obj = {short_name: album_name, photos: photos }
        callback(null, obj)
      }
    })
  })
}