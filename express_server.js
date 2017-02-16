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

function generateRandomString() {
  var alphaNum = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var randomStr = '';
  for (var i = 0; i < 6; i++) {
    var index = Math.floor(Math.random() * alphaNum.length);
    randomStr += alphaNum[index];
  }
  return randomStr;
}

//DATABASES
//=========

//URLs Database
var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

//Users Database
const usersDatabase = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

function nextUserId() {
  let userId = 'user';
  userId += generateRandomString();
  return userId;
}

//ROUTES
//======

//Root route
app.get("/", (req, res) => {
  res.end("Hello!");
});

//Redirect short url to its website
app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

//Home Route
app.get('/urls', (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    username: req.cookies['username']
  };
  res.render('urls_index', templateVars);
});

//Registration Route
app.get('/register', (req, res) => {
  res.render('urls_registration');
});

//Page route to create new shortURL
app.get("/urls/new", (req, res) => {
  res.render("urls_new", { username: req.cookies['username'] });
});

//Retrieve short url database
app.get('/urls/:id', (req, res) => {
  let templateVars = {
    shortURL: req.params.id,
    urls: urlDatabase,
    username: req.cookies['username']
  };
  res.render('urls_show', templateVars);
});

//Create new user
app.post('/register', (req, res) => {
  console.log(req.body.email);
  if (!req.body['email'] || !req.body['password']) {
    res.status(400);
    res.send('Please provide email and password');
  }
  for (let id in usersDatabase) {
    if (usersDatabase[id]['email'] === req.body['email']) {
      res.status(400);
      res.send('Please use other email');
    }
  }

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
  res.cookie('username', req.body.username);
  res.redirect('/');
});

//Logout endpoint
app.post('/logout', (req, res) => {
  res.clearCookie('username', req.cookies['username']);
  res.redirect('/');
});

//Create a new short url
app.post("/urls", (req, res) => {
  var shortURL = generateRandomString();

  //Conditions to check if the input is lacking http:// or https:// or wwww.
  // if ((req.body.longURL.indexOf('http://') >= 0 || req.body.longURL.indexOf('https://') >= 0) && req.body.longURL.indexOf('www.') > 0 ) {
  //  urlDatabase[shortURL] = req.body.longURL;
  // } else if ((req.body.longURL.indexOf('http://') < 0 || req.body.longURL.indexOf('https://') < 0) && req.body.longURL.indexOf('www.') >= 0) {
  //   urlDatabase[shortURL] = `http://${req.body.longURL}`;
  // } else if ((req.body.longURL.indexOf('http://') >= 0 || req.body.longURL.indexOf('https://') >= 0) && req.body.longURL.indexOf('www.') < 0) {
  //   urlDatabase[shortURL] = `www.${req.body.longURL}`;   //<== condition still not correct, may need String.substring()
  // } else {
  //   urlDatabase[shortURL] = `http://www.${req.body.longURL}`;
  // }

  urlDatabase[shortURL] = req.body.longURL.indexOf('http://') > 0 ? req.body.longURL : `http://${req.body.longURL}`;
  res.redirect(`/urls/${shortURL}`);
});

//Update short url
app.post('/urls/:shortURL', (req, res) => {
  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {
    urlDatabase[req.params.shortURL] = req.body.newLongURL;
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