$(function() {
  var tmpl, tdata = {}

  var initPage = function() {
    $.get('/templates/admin_add_album.html', function(d) {
      tmpl = d
    })
    $(document).ajaxStop(function() {
      var renderedPage = Mustache.to_html(tmpl, tdata)
      $('body').html(renderedPage)
    })
  }()
})