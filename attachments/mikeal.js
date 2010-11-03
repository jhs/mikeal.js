var request = function (options, callback) {
  options.success = function (obj) {
    callback(null, obj);
  }
  options.error = function (err) {
    if (err) callback(err);
    else callback(true);
  }
  if (options.data && typeof options.data == 'object') {
    options.data = JSON.stringify(options.data)
  }
  options.processData = false;
  options.dataType = 'json';
  options.contentType = 'application/json'
  $.ajax(options)
}
/*
 * JavaScript Pretty Date
 * Copyright (c) 2008 John Resig (jquery.com)
 * Licensed under the MIT license.
 */
function prettyDate(time) {
	var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," "))
		, diff = (((new Date()).getTime() - date.getTime()) / 1000)
		, day_diff = Math.floor(diff / 86400)
		;
	
	if ( day_diff >= 31) return day_diff + ' days ago';
		
	if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 ) return;
	
	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 minute ago" ||
			diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
		day_diff == 1 && "Yesterday" ||
		day_diff < 7 && day_diff + " days ago" ||
		day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

$.expr[":"].exactly = function(obj, index, meta, stack){ 
  return ($(obj).text() == meta[3])
}

var getPostHtml = function (doc) {
  return $(
    '<div class="post-entry">' +
      '<div class="post-title">' + 
        '<a href="/post/' + doc._id + '">' + doc.title + '</a>' +
      '</div>' +
      '<div class="post-created-date">' + prettyDate(doc.created) + '</div>' +
      '<div class="spacer"></div>' +
      '<div class="post-body-container">' +
        '<div class="post-body">' + doc.body_html + '</div>' +
      '</div>' +
    '</div>'
  )
  ;
}

var setupSections = function (name) {
  $('span.sec').removeClass('selected-sec').addClass('linkified');
  $("div.info-cell span:exactly('"+name+"')").addClass('selected-sec').removeClass('linkified');
  $('div.info-cell span.linkified').click(function (n) {
    window.location = '/#/'+$(this).text();
  })
}
var couchUser

var checkAdmin = function () {
  var addLinks = function () {
    if (couchUser.userCtx.roles.indexOf('_admin') !== -1) {
      if ($('a.admin-link').length === 0) {
        $('body').append('<a class="admin-link" href="/#/new">admin</div>')
      }      
     $('div.post-title').each(function (i, n) {
        if ($(n).find('span.edit-link').length === 0) {
          $(n).append('<span class="edit-link">edit</span>').click(function () {
            window.location = $(this).find('a').attr('href').replace('/post/', '/edit/')
          })
        }
      })
    }
  }
  if (!couchUser) {
    request({url:'/_session'}, function (err, resp) {
      couchUser = resp;
      addLinks();
    })
  } else {addLinks()}
}

var app = {};
app.index = function () {
  var skip = 0;
  
  setupSections('blog');
  $('#content').html('');
  var container = $('<div class="blog-container"></div>').appendTo('#content');  
  
  var getPosts = function () {
    var url = '_view/postsByCreated?'+$.param({include_docs:true, descending:true, limit:10, skip:skip});
    request({url:url}, function (err, resp) {
      if (err) throw err
      for (var i=0;i<resp.rows.length;i++) {
        var x = getPostHtml(resp.rows[i].doc, container).appendTo(container);
        container.append('<hr class="blogsep"></hr>')
      }
      $('<div><span class="load-more">Load 10 more posts</span></div>').appendTo(container).click(function () {
        $('span.load-more').remove();
        skip += 10
        getPosts();
      })
      checkAdmin();
    })
  }
  getPosts();
}

app.showPost = function (x, y) {  
  $('span.sec').removeClass('selected-sec').addClass('linkified');
  $("div.info-cell span:exactly('blog')").addClass('selected-sec')
  $('div.info-cell span.linkified').click(function (n) {
    window.location = '/#/'+$(this).text();
  })
  $("div.info-cell span:exactly('blog')").addClass('linkified');
  $('#content').html('');
  request({url:'/api/'+this.params.shortname}, function (err, doc) {
    if (err) {
      $('#content').append('<div class="error">404 Not Found</div>')
    } else {
      var container = $('<div class="blog-container"></div>').appendTo('#content')
      getPostHtml(doc).appendTo(container);
    }
  })
  checkAdmin();
}
app.twitter = function () {
  
}
app.newPost = function () {
  console.log('newpost')
}

var editorElement = $(
  '<div id="post-editor">' +
    '<div id="post-editor-editor">' +
      '<input type="text" id="post-editor-title" class="editor-input"></input>' +
      '<textarea id="post-editor-input" class="editor-input"></textarea>' + 
      '<input type="text" id="post-editor-tags"></input>' +
    '</div>' +
    '<div id="post-editor-preview">' +
      '<div class="post-title"></div>' +
      '<div class="post-created-date">now</div>' +
      '<div class="spacer"></div>' +
      '<div class="post-body-container">' +
        '<div class="post-body"></div>' +
      '</div>' +
      '<span class="save-button">save</span>' +
    '</div>' +
  '</div>'
)

function trim (s) {
  while (s.indexOf(' ') !== -1) s = s.replace(' ','')
  return s
}

app.editPost = function () {
  request({url:window.location.pathname.replace('/edit/', '/api/')}, function (err, doc) {
    var e = editorElement;
    $('div#full-content').append(e);
    e.find('textarea#post-editor-input').val(doc.body_html);
    e.find('input#post-editor-title').val(doc.title)
    var updatePreview = function () {
      var title = e.find('input#post-editor-title').val()
        , body = e.find('textarea#post-editor-input').val()
        ;
      e.find('div.post-title').text(title);
      e.find('div.post-body').html(body);
    }
    updatePreview();
    e.find('div.post-created-date').text(prettyDate(doc.created))
    e.find('input#post-editor-tags').val(doc.tags.join(', '))
    var h = e.find('div#post-editor-preview').height();
    e.find('textarea').height(h + (h / 4))
    // Setup change listener
    e.keyup(function () {
      updatePreview()
    });
    $('span.save-button').click(function () {
      doc.tags = trim(e.find('input#post-editor-tags').val()).split(',');
      doc.title = e.find('input#post-editor-title').val();
      doc.body_html = e.find('textarea#post-editor-input').val();
      request({url:'/api/'+doc._id, data:doc, type:'PUT'}, function (err, resp) {
        if (err) throw err;
        window.location = '/post/'+resp.id;
      })
    })
  })
}

var staticPage = function (name) {
  var r = function () {
    var self = this
      , args = arguments
      ;
    setupSections(name)
    this.render('/partials/'+name+'.html').replace('#content').then(function () {
      app[name].apply(self, args)
    })
  }
  return r
}
var couchdbUser;

var a = $.sammy(function () {
  // Static pages
  this.get('#/about', staticPage('about'))
  this.get('#/blog', app.index)
  // this.get('#/twitter', staticPage('twitter'))
  // this.get('#/code', staticPage('code'))
  this.get('#/twitter', function () {window.location = 'http://twitter.com/mikeal'})
  this.get('#/code', function () {window.location = 'http://github.com/mikeal'})
  
  // Create new post
  this.get('/new', app.newPost);

  // Show individual posts
  this.get('/post/:shortname', app.showPost);  
  this.get('/post/:shortname/', app.showPost);  
  // Edit posts
  this.get('/edit/:shortname', app.editPost);  
  this.get('/edit/:shortname/', app.editPost);
  // Legacy paths
  this.get('/:year/:month/:shortname', app.showPost);
  this.get('/:year/:month/:shortname/', app.showPost);
  
  // Index of all databases
  this.get('', app.index);
  this.get("#/", app.index);
})

$(function () { a.run(); });