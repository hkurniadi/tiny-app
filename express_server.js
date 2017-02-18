//Dependancies
const express = require("express");
const cookieSession = require('cookie-session');
const bodyParser = require("body-parser");
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');

const app = express();

//Configuration
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 8080; // default port 8080

//Middlewares
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'development'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(methodOverride('_method'));

//DATABASES

//URLs Database
//should be emptied before submission
var urlDatabase = {
  "b2xVn2": {
    shortUrl: "b2xVn2",
    website: "http://www.lighthouselabs.ca",
    userId: "userRandomID",
    dateCreated: new Date().toUTCString()
  },
  "9sm5xK": {
    shortUrl: "9sm5xK",
    website: "http://www.google.com",
    userId: "user2RandomID",
    dateCreated: new Date().toUTCString()
  }
};

//Users Database
const usersDatabase = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("12345", 10)
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("qwerty", 10)
  }
};

//FUNCTION DEFINITIONS

function generateRandomString() {
  let alphaNum = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomStr = '';
  //Make a random string of length 6
  for (let i = 0; i < 6; i++) {
    let index = Math.floor(Math.random() * alphaNum.length);
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
  //If user is logged in, return the user_id
  //If user is not logged in, return empty/undefined user_id
  return request.session['user_id'];
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

function correctUrl(request) {
  if (!request.body.longURL.startsWith('http://') || request.body.longURL.startsWith('https://')) {
    return `https://${request.body.longURL}`.trim();
  }
};

//ROUTES

////GET ROUTES

//Root route
app.get("/", (req, res) => {
  if (loggedInAs(req)) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

//Index Page Route
app.get('/urls', (req, res) => {
  if (loggedInAs(req)) {
    let templateVars = {
      urlsDB: urlDatabase,
      usersDB: usersDatabase,
      user: loggedInAs(req),
      userUrls: urlsForUser(loggedInAs(req)),
    };
    res.render('urls_index', templateVars);
    return;
  }
  res.status(401).render('401_error');
});

//Actual site redirection Route
app.get("/u/:id", (req, res) => {
  let readId = req.params.id;
  if (urlDatabase.hasOwnProperty(readId)) {
    let actualWebsite = urlDatabase[req.params.id]['website'];
    res.redirect(actualWebsite);
    return;
  }
  res.status(404).render('404_error');
});


//Register Route
app.get('/register', (req, res) => {
  if (loggedInAs(req)) {
    res.redirect('/');
    return;
  }
  res.render('urls_registration');
});

//Login Route
app.get('/login', (req, res) => {
  if (loggedInAs(req)){
    res.redirect('/');
    return;
  }
  res.render('urls_login');
});

//New short url Route
app.get("/urls/new", (req, res) => {
  if (loggedInAs(req)) {
    res.render("urls_new", { usersDB: usersDatabase, user: loggedInAs(req) });
    return;
  }
  res.status(401).render('401_error');
});

//Retrieve particular short url (:id) Route
app.get('/urls/:id', (req, res) => {
  let readId = req.params.id;
  if (!urlDatabase.hasOwnProperty(readId)) {
    res.status(404).render('404_error');
    return;
  } else if (!loggedInAs(req)) {
    res.status(401).render('401_error');
    return;
  } else if (loggedInAs(req) !== urlDatabase[readId]['userId']) {
    res.status(403).render('403_error');
    return;
  }
  let templateVars = {
    urlsDB: urlDatabase,
    usersDB: usersDatabase,
    shortURL: req.params.id,
    user: loggedInAs(req),
  };
  res.status(200).render('urls_show', templateVars);
});

////POST ROUTES

//Register Route
app.post('/register', (req, res) => {
  const password = req.body['password'];
  //Check if email and password are empty
  if (!req.body['email'] || !password) {
    res.status(400).send('Please provide email and password');
    return;
  }
  //Check if email already exists in the database
  for (let id in usersDatabase) {
    if (usersDatabase[id]['email'] === req.body['email']) {
      res.status(400).send('Email is already used, please use other email');
      return;
    }
  }
  //Else, create new user
  let userId = nextUserId();
  const hashed_password = bcrypt.hashSync(password, 10);
  usersDatabase[userId] = {
    id: userId,
    email: req.body['email'],
    password: hashed_password
  };
  req.session.user_id = userId;
  res.redirect('/');
});

//Login Route
app.post('/login', (req, res) => {
  const password = req.body['password'];
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
    if (bcrypt.compareSync(password, user['password'])) {
      req.session.user_id = user['id'];
      res.redirect('/');
      return;
    }
  }
  //Else, if email is not in database or password does not match given the email
  res.status(401).render('401_error');
});

//Logout endpoint
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

//Create a new short url endpoint
app.post("/urls", (req, res) => {
  if (loggedInAs(req)) {
    let shortURL = generateRandomString();

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
    urlDatabase[shortURL]['website'] = correctUrl(req);
    urlDatabase[shortURL]['userId'] = req.session['user_id'];
    urlDatabase[shortURL]['dateCreated'] = new Date().toUTCString();
    res.redirect(`/urls/${shortURL}`);
    return;
  }
  res.status(401).render('401_error');
});

//Update short url
app.put('/urls/:id', (req, res) => {
  let readId = req.params.id;
  if (!urlDatabase.hasOwnProperty(readId)) {
    res.status(404).render('404_error');
    return;
  } else if (!loggedInAs(req)) {
    res.status(401).render('401_error');
    return;
  } else if (loggedInAs(req) !== urlDatabase[readId]['userId']) {
    res.status(403).render('403_error');
    return;
  }
  urlDatabase[readId]['website'] = correctUrl(req);
  urlDatabase[readId]['dateCreated'] = new Date().toUTCString();
  res.redirect(`/urls/${readId}`);
});

//Delete short url
app.delete('/urls/:id', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`TinyURL app listening on port ${PORT}!`);
});