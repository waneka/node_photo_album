$(function() {
  var tmpl, tdata = {}

  var initPage = function() {
    $.get('/templates/admin_add_photos.html', function(d) {
      tmpl = d
    })

    $.getJSON('/v1/albums.json', function(d) {
      $.extend(tdata, d.data)
    })

    $(document).ajaxStop(function() {
      var renderedPage = Mustache.to_html(tmpl, tdata)
      $('body').html(renderedPage)
    })
  }()
})