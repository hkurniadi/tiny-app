loggedIn//DEPENDANCIES
const express = require("express");
const cookieSession = require('cookie-session');
const bodyParser = require("body-parser");
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');

const app = express();

//CONFIGURATION
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 8080; // default port 8080

//MIDDLEWARES
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'development'],
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(methodOverride('_method'));

//DATABASES

//URLs Database
//should be emptied before submission
const urlDatabase = {};

//Users Database
const usersDatabase = {};

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
function loggedIn(request) {
  //If user is logged in, return the user_id
  //If user is not logged in, return empty/undefined user_id
  return request.session.user_id;
};

// function getShortUrl(userId) {
//   let shortendUrl = [];
//   for (let shortUrl in urlDatabase) {
//     if (urlDatabase[shortUrl][userId] === userId ) {
//       shortendUrl = urlDatabase[shortUrl]['shortUrl'];
//       return shortendUrl;
//     }
//   }
// }

//To create and return an array that consists of shortURLs specific to a user id
function urlsForUser(userId) {
  let userUrlsCollection = [];
  for (let shortUrl in urlDatabase) {
    if (userId === urlDatabase[shortUrl]['userId']) {
      userUrlsCollection.push(urlDatabase[shortUrl]);
    }
  }
  return userUrlsCollection;
};

function correctUrl(request) {
  if (!request.body.longUrl.startsWith('http://') || request.body.longUrl.startsWith('https://')) {
    return `https://${request.body.longUrl}`.trim();
  }
};

//ROUTES

////GET ROUTES

//Root route
app.get("/", (req, res) => {
  if (loggedIn(req)) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

//Index Page Route
app.get('/urls', (req, res) => {
  let user = loggedIn(req);
  if (loggedIn(req)) {
    let templateVars = {
      userId: user,
      userEmail: usersDatabase[user]['email'],
      userUrls: urlsForUser(user)
    };
    res.render('urls_index', templateVars);
    return;
  }
  res.status(401).render('401_error');
});

//Actual site redirection Route
app.get("/u/:shortUrl", (req, res) => {
  let shortUrl = req.params.shortUrl;
  if (urlDatabase.hasOwnProperty(shortUrl)) {
    let actualWebsite = urlDatabase[shortUrl]['website'];
    res.redirect(actualWebsite);
    //console.log(urlDatabase[shortUrl]['visitCount']);

    //if the user id cookie who accesses the short url is different than the short url's user id
    //then that means the user is unique visitor id
    if (req.session['user_id'] !== urlDatabase[shortUrl]['userId']) {
      if (urlDatabase[shortUrl]['visitors']['visitor_id'].includes(req.session['user_id'])) {
        urlDatabase[shortUrl]['visitors']['visitorsCount'] += 1;
        urlDatabase[shortUrl]['visitors']['timestamp'] = new Date();
        urlDatabase[shortUrl]['visitCount'] += 1;
        console.log("Unique visitor to this short url site", urlDatabase[shortUrl]['visitors']);
      } else {
        urlDatabase[shortUrl]['visitors']['visitor_id'].push(req.session['user_id']);
        urlDatabase[shortUrl]['visitors']['timestamp'] = new Date();
        urlDatabase[shortUrl]['visitors']['visitorsCount'] += 1;
        urlDatabase[shortUrl]['visitCount'] += 1;
        console.log("Unique visitor to this short url site", urlDatabase[shortUrl]['visitors']);
      }
    } else {
      urlDatabase[shortUrl]['visitCount'] += 1;
    }
    return;
  }
  res.status(404).render('404_error');
});


//Register Route
app.get('/register', (req, res) => {
  if (loggedIn(req)) {
    res.redirect('/');
    return;
  }
  res.render('urls_registration');
});

//Login Route
app.get('/login', (req, res) => {
  if (loggedIn(req)){
    res.redirect('/');
    return;
  }
  res.render('urls_login');
});

//New short url Route
app.get("/urls/new", (req, res) => {
  let user = loggedIn(req);
  if (loggedIn(req)) {
    let templateVars = {
      userEmail: usersDatabase[user]['email']
    };
    res.render("urls_new", templateVars);
    return;
  }
  res.status(401).render('401_error');
});

//Retrieve particular short url (shortUrl) Route
app.get('/urls/:shortUrl', (req, res) => {
  let shortUrl = req.params.shortUrl;
  let user = loggedIn(req);
  if (!urlDatabase.hasOwnProperty(shortUrl)) {
    res.status(404).render('404_error');
    return;
  } else if (!loggedIn(req)) {
    res.status(401).render('401_error');
    return;
  } else if (loggedIn(req) !== urlDatabase[shortUrl]['userId']) {
    res.status(403).render('403_error');
    return;
  }
  let templateVars = {
    userId: user,
    userEmail: usersDatabase[user]['email'],
    shortUrl: shortUrl,
    longUrl: urlDatabase[shortUrl]['website'],
    urlDateCreated: urlDatabase[shortUrl]['dateCreated'],
    urlNumberOfVisits: urlDatabase[shortUrl]['visitCount']
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
  for (let userId in usersDatabase) {
    if (usersDatabase[userId]['email'] === req.body['email']) {
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
  const password = req.body.password;
  let user;
  //Check if credentials are in the database
  for (let userId in usersDatabase) {
    if (usersDatabase[userId]['email'] === req.body.email) {
      user = usersDatabase[userId];
      break;
    }
  }
  //Check if password is correct given the email
  if (user) {
    if (bcrypt.compareSync(password, user.password)) {
      req.session.user_id = user.id;
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
  if (loggedIn(req)) {
    let shortUrl = generateRandomString();

    //add the basic properties
    urlDatabase[shortUrl] = {};
    urlDatabase[shortUrl]['shortUrl'] = shortUrl;
    urlDatabase[shortUrl]['website'] = correctUrl(req);
    urlDatabase[shortUrl]['userId'] = req.session['user_id'];
    urlDatabase[shortUrl]['dateCreated'] = new Date().toUTCString();

    //add the number of visit property to count non-unique visits
    urlDatabase[shortUrl]['visitCount'] = 0;

    //initialize some of the unique visitor's properties
    urlDatabase[shortUrl]['visitors'] = {};
    urlDatabase[shortUrl]['visitors']['visitor_id'] = [];
    urlDatabase[shortUrl]['visitors']['visitorsCount'] = 0;
    //console.log("Unique visit", urlDatabase[shortUrl]['visitors']);
    console.log("Url Database: ", urlDatabase);
    console.log("User Database: ", usersDatabase);
    res.redirect(`/urls/${shortUrl}`);
    return;
  }
  res.status(401).render('401_error');
});

//Update short url
app.post('/urls/shortUrl', (req, res) => {
  let shortUrl = req.params.id;
  if (!urlDatabase.hasOwnProperty(shortUrl)) {
    res.status(404).render('404_error');
    return;
  } else if (!loggedIn(req)) {
    res.status(401).render('401_error');
    return;
  } else if (loggedIn(req) !== urlDatabase[shortUrl]['userId']) {
    res.status(403).render('403_error');
    return;
  }
  urlDatabase[shortUrl]['website'] = correctUrl(req);
  urlDatabase[shortUrl]['dateCreated'] = new Date().toUTCString();
  res.redirect(`/urls/${shortUrl}`);
});

//Delete short url
app.delete('/urls/shortUrl', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`TinyURL app listening on port ${PORT}!`);
});
