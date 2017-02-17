//Dependancies
const express = require("express");
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const morgan = require('morgan');
const PORT = process.env.PORT || 8080; // default port 8080

//Middlewares
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.set('view engine', 'ejs');

//DATABASES
//=========

//URLs Database
var urlDatabase = {
  "b2xVn2": {
    shortUrl: "b2xVn2",
    website: "http://www.lighthouselabs.ca",
    userId: "userRandomID"
  },
  "9sm5xK": {
    shortUrl: "9sm5xK",
    website: "http://www.google.com",
    userId: "user2RandomID"
  }
};

//Users Database
const usersDatabase = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "12345"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "qwerty"
  }
};

//FUNCTION DEFINITIONS
//=====================

function generateRandomString() {
  var alphaNum = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var randomStr = '';
  for (var i = 0; i < 6; i++) {
    var index = Math.floor(Math.random() * alphaNum.length);
    randomStr += alphaNum[index];
  }
  return randomStr;
}

//To create the next random user id in database
function nextUserId() {
  let userId = 'user';
  userId += generateRandomString();
  return userId;
};

//To check if user is currently logged in (i.e. 'user_id' cookies exists)
function loggedInAs(request) {
  let user;
  //If user is logged in, return the user_id
  if (request.cookies['user_id']) {
    user = request.cookies['user_id'];
    return user;
  //If user is not logged in, return empty user_id
  } else {
    return user;
  }
};

//To create and return an array that consists of shortURLs specific to a user id
function urlsForUser(id) {
  let userUrlsCollection = [];
  for (let shortUrl in urlDatabase) {
    if (id === urlDatabase[shortUrl]['userId']) {
      userUrlsCollection.push(urlDatabase[shortUrl]);
    }
  }
  return userUrlsCollection;
};

//ROUTES
//======

//GET ROUTES
//----------

//Root route
app.get("/", (req, res) => {
  res.end("Hello!");
});

//Redirect short url to its website
app.get("/u/:shortURL", (req, res) => {
  let actualWebsite = urlDatabase[req.params.shortURL]['website'];
  res.redirect(actualWebsite);
});

//Index Page Route
app.get('/urls', (req, res) => {
  let userLoginId = loggedInAs(req);
  let templateVars = {
    urlsDB: urlDatabase,
    user: userLoginId,
    userUrls: urlsForUser(userLoginId)
  };
  res.render('urls_index', templateVars);
});

//Registration Page Route
app.get('/register', (req, res) => {
  res.render('urls_registration');
});

//Login Page Route
app.get('/login', (req, res) => {
  res.render('urls_login')
});

//Creating new url Route
app.get("/urls/new", (req, res) => {
  let userLoginId = loggedInAs(req);
  if (!userLoginId) {
    res.redirect('/login');
  } else {
    res.render("urls_new", { users: usersDatabase, user: userLoginId });
  }
});

//Retrieve particular short url Route
app.get('/urls/:id', (req, res) => {
  let userLoginId = loggedInAs(req);
  if (!userLoginId) {
    res.redirect('/login');
  } else {
    let templateVars = {
      urlsDB: urlDatabase,
      usersDB: usersDatabase,
      shortURL: req.params.id,
      user: userLoginId
    };
    //console.log(shortURL);
    res.render('urls_show', templateVars);
  }
});

//POST ROUTES
//-----------

//Create new user endpoint
app.post('/register', (req, res) => {
  //console.log(req.body.email);

  //Check if email and password are empty
  if (!req.body['email'] || !req.body['password']) {
    res.status(400);
    res.send('Please provide email and password');
  }

  //Check if email already exists in the database
  for (let id in usersDatabase) {
    if (usersDatabase[id]['email'] === req.body['email']) {
      res.status(400);
      res.send('Please use other email');
    }
  }
  //Else, create new user
  let userId = nextUserId();
  usersDatabase[userId] = {
    id: userId,
    email: req.body['email'],
    password: req.body['password']
  };
  res.cookie('user_id', userId);
  res.redirect('/');
});

//Login endpoint
app.post('/login', (req, res) => {
  let user;
  //Check if credentials are in the database
  for (let userId in usersDatabase) {
    if (usersDatabase[userId]['email'] === req.body['email']) {
      user = usersDatabase[userId];
      break;
    }
  }
  //Check if password is correct given the email
  if (user) {
    if (user['password'] === req.body['password']) {
      res.cookie('user_id', user['id']);
      res.redirect('/');
      return;
    }
  }
  //Else, if email is not in database or password does not match given the email
  res.status(403).send('Bad credentials');
});

//Logout endpoint
app.post('/logout', (req, res) => {
  res.clearCookie('user_id', req.cookies['user_id']);
  res.redirect('/');
});

//Create a new short url endpoint
app.post("/urls", (req, res) => {
  var shortURL = generateRandomString();

  //TODO make conditions to check if the input is lacking http:// or https:// or wwww.
  // if ((req.body.longURL.indexOf('http://') >= 0 || req.body.longURL.indexOf('https://') >= 0) && req.body.longURL.indexOf('www.') > 0 ) {
  //  urlDatabase[shortURL] = req.body.longURL;
  // } else if ((req.body.longURL.indexOf('http://') < 0 || req.body.longURL.indexOf('https://') < 0) && req.body.longURL.indexOf('www.') >= 0) {
  //   urlDatabase[shortURL] = `http://${req.body.longURL}`;
  // } else if ((req.body.longURL.indexOf('http://') >= 0 || req.body.longURL.indexOf('https://') >= 0) && req.body.longURL.indexOf('www.') < 0) {
  //   urlDatabase[shortURL] = `www.${req.body.longURL}`;   //<== condition still not correct, may need String.substring()
  // } else {
  //   urlDatabase[shortURL] = `http://www.${req.body.longURL}`;
  // }

  urlDatabase[shortURL] = {};
  urlDatabase[shortURL]['shortUrl'] = shortURL;
  urlDatabase[shortURL]['website'] = req.body.longURL.indexOf('http://') > 0 ? req.body.longURL : `http://${req.body.longURL}`;
  urlDatabase[shortURL]['userId'] = req.cookies['user_id'];
  res.redirect(`/urls/${shortURL}`);
});

//Update short url
app.post('/urls/:shortURL', (req, res) => {
  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {
    urlDatabase[req.params.shortURL]['website'] = req.body.newLongURL;
  }
  res.redirect('/urls');
})

//Delete short url
app.post('/urls/:shortURL/delete', (req, res) => {
  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {
    delete urlDatabase[req.params.shortURL];
  }
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`TinyURL app listening on port ${PORT}!`);
});