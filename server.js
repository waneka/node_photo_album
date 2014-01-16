var express = require('express')
var app = express()

var album_hdlr = require('./handlers/albums.js'),
    page_hdlr = require('./handlers/pages.js'),
    helpers = require('./handlers/helpers.js'),
    db = require('./data/db.js')

var fs = require('fs'),
    url = require('url'),
    async = require('async'),
    path = require('path')

app.use(express.logger('dev'))
app.use(express.bodyParser({ keepExtensions: true }))


// routes!! //
app.get('/v1/albums.json', album_hdlr.list_all)
app.get('/v1/albums/:album_name.json', album_hdlr.album_by_name)
app.get('/pages/:page_name', page_hdlr.generate)
app.get('/pages/:page_name/:sub_page', page_hdlr.generate)
app.get('/', function(req, res) {
  res.redirect('pages/home')
  res.end()
})
app.get('/content/:filename', function(req, res) {
  serve_static_file('content/' + req.params.filename, res)
})
app.get('/templates/:template_name', function(req, res) {
  serve_static_file('templates/' +req.params.template_name, res)
})

app.get('*', four_oh_four)

app.put('/v1/albums.json', album_hdlr.create_album)
app.put('/v1/albums/:album_name/photos.json', album_hdlr.add_photo_to_album)


function four_oh_four(req, res) {
  res.writeHead(404, { 'Content-Type' : 'application/json' })
  res.end(JSON.stringify(helpers.invalid_resource()) + '\n')
}

function serve_static_file(file, res) {
  fs.exists(file, function(exists) {
    if (!exists) {
      res.writeHead(404, { 'Content-Type' : 'application/json' })
      var out = { error: 'not_found', message: "'" + file + "' not found" }
      res.end(JSON.stringify(out) + '\n')
      return
    }

    var rs = fs.createReadStream(file)
    rs.on('error', function(e) {
      res.end()
    })

    var ct = content_type_for_path(file)
    res.writeHead(200, { 'Content-Type' : ct })
    rs.pipe(res)
  })
}

function content_type_for_path(file) {
  var ext = path.extname(file)
  switch(ext.toLowerCase()) {
    case '.html': return 'text/html'
    case '.js': return 'text/javascript'
    case '.css': return 'text/css'
    case '.jpg': case '.jpeg': return 'image/jpeg'
    default: return 'text/plain'
  }
}

db.init(function(err, results) {
  if (err) {
    console.log('** FATAL ERROR ON STARTUP: ')
    console.error(err)
    process.exit(-1)
  }
  app.listen(8080)
})












