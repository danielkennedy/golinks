var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var redis = require('redis');
var cuss = require('cuss');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function cleanRouter(req, res, next) {
	console.log("FUNCTION_CALL: cleanRouter()");
	if (res.locals.name && cuss[res.locals.name] === 2) {
		console.log('cleanRouter: CUSS WORD->', res.locals.name);
		res.status(500);
		res.render('error'); // FIXME: SHOULD BE INDEX WITH ERROR MESSAGE
	} else {
		next();
	}
}

function pathRouter(req, res, next) {
  console.log("FUNCTION_CALL: pathRouter()");
  var name = req.url.substring(1).toLowerCase();
  if (name.length > 0) {
		res.locals.name = name;
  }
	next();
}

function queryRouter(req, res, next) {
  console.log("FUNCTION_CALL: queryRouter(", req.query,  ")");
  console.log("FUNCTION_CALL: queryRouter(", req.body,   ")");
	if (req.query.name) {
		res.locals.name = req.query.name.toLowerCase();
	}
	if (req.query.link) {
		res.locals.link = req.query.link.toLowerCase();
	}
	if (req.body.name) {
		res.locals.name = req.body.name.toLowerCase();
	}
	if (req.body.link) {
		res.locals.link = req.body.link.toLowerCase();
	}
	next();
}

function lookupRouter(req, res, next) {
  console.log("FUNCTION_CALL: lookupRouter()");
  var client = redis.createClient();
  if (res.locals.name) {
		client.on("error", function (err) {
			console.log("lookupRouter: REDIS onError ", err);
		});
		client.get(res.locals.name, function(error, result) {
			if (error) {
				console.log("lookupRouter: REDIS GET ERROR");
				throw error;
				res.status(500);
				res.render('error');
			}
			console.log('lookupRouter: REDIS GET result ->', result)
			if (result !== null) {
				res.locals.hash = JSON.parse(result);
				res.locals.link = res.locals.hash.link;
				console.log('lookupRouter: RES.LOCALS ->', res.locals)
			} else {
				console.log('lookupRouter: NO SOUP FOR YOU!');
			}
			client.quit();
			console.log('lookupRouter: NEXT!');
			next();
		});
  } else {
		//FIXME: RENDER ERROR PAGE (KEY NOT FOUND)
		console.log('lookupRouter: NO KEY TO LOOKUP (', res.locals, ')');
		res.status(404);
		res.render('error'); // FIXME: SHOULD BE INDEX WITH ERROR MESSAGE
  }
}

function indexRouter(req, res, next) {
  console.log("FUNCTION_CALL: indexRouter()");
  // Make sure to indicate if there was a name not found
	console.log("indexRouter: 1RENDER");
	if (res.locals.name) {
		res.render('index', { title: res.locals.name });
	} else {
		res.render('index', { title: 'INDEX' });
	}
}

function redirectRouter(req, res, next) {
  console.log("FUNCTION_CALL: redirectRouter(", res.locals.name, ")");
  var client = redis.createClient();
  if (res.locals.name && res.locals.link) {
    console.log("redirectRouter: MATCH FOUND, REDIRECT TO", res.locals.link);
		// redis.incr is safer, but we're not trying for precision
		var count = res.locals.hash.count || 0;
		client.set(res.locals.name, JSON.stringify({'count':++count,'link':res.locals.link}), function(error, result) {
			if (error) {
				// FIXME: SEND AN ERROR
				console.log("redirectRouter: REDIS SET ERROR");
				res.status(500);
				throw error;
				res.render('error');
			}
			console.log('redirectRouter: REDIS SET result ->', result)
			client.quit();
			console.log('redirectRouter: NEXT!');
		});
    res.redirect(res.locals.link);
  } else {
		console.log('redirectRouter: NEXT!');
		next();
	}
}

function createRouter(req, res, next) {
  console.log("FUNCTION_CALL: createRouter()");
  var client = redis.createClient();
  if (res.locals.name && res.locals.link) {
		client.on("error", function (err) {
			console.log("createRouter: REDIS Error " + err);
		});
		console.log("createRouter: REDIS SET", res.locals.name, JSON.stringify({'count':0,'link':res.locals.link}));
		client.set(res.locals.name, JSON.stringify({'count':0,'link':res.locals.link}), function(error, result) {
			if (error) {
				// FIXME: SEND AN ERROR
				console.log("createRouter: REDIS SET ERROR");
				res.status(500);
				throw error;
				res.render('error');
			}
			console.log('createRouter: REDIS SET result ->', result)
			client.quit();
			console.log('createRouter: NEXT!');
			next();
		});
	} else {
		// FIXME: RENDER AN ERROR (NEED BOTH NAME AND LINK)
		console.log("createRouter: NEED BOTH NAME AND LINK (", res.locals, ")");
		res.status(500);
		res.render('error'); // FIXME: SHOULD BE INDEX WITH ERROR MESSAGE
	}
}

function deleteRouter(req, res, next) {
  console.log("FUNCTION_CALL: deleteRouter(", res.locals, ")");
  var client = redis.createClient();
  if (res.locals.name) {
		client.on("error", function (err) {
			console.log("deleteRouter: REDIS Error " + err);
		});
		console.log("deleteRouter: REDIS DEL", res.locals.name);
		client.del(res.locals.name, function(error, result) {
			if (error) {
				// FIXME: SEND AN ERROR
				console.log("deleteRouter: REDIS DEL ERROR");
				throw error;
				res.status(500);
				res.render('error');
			}
			console.log('deleteRouter: REDIS DEL result ->', result)
			client.quit();
			console.log('deleteRouter: NEXT!');
			next();
		});
	} else {
		// FIXME: RENDER AN ERROR (NEED NAME)
		console.log("deleteRouter: NO NAME (", res.locals, ")");
		res.status(404);
		res.render('error');
	}
}

// SUPPORTED ROUTES:
// GET    /     -> index/admin page
app.get('/', indexRouter);

// GET    /link -> index/admin page
app.get('/link', indexRouter);

// POST   /link -> create a link and redirect to index/admin
app.post('/link', queryRouter, cleanRouter, createRouter, indexRouter);

// DELETE /link -> delete a link and redirect to index/admin
app.delete('/link', queryRouter, lookupRouter, deleteRouter, indexRouter);

// GET    /*    -> redirect to new destination from redis
app.get('/*', pathRouter, lookupRouter, redirectRouter, indexRouter);

// error handler
app.use(function(err, req, res, next) {
  console.log("ERROR HANDLER");
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
	console.log("defaultRouter: 3RENDER");
  res.render('error');
});

module.exports = app;
