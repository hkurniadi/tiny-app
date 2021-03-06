//DEPENDANCIES
const express = require("express");
const cookieSession = require('cookie-session');
const bodyParser = require("body-parser");
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');
const uuidV4 = require('uuid/v4');

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
  let randomStr = uuidV4().slice(0,6);
  return randomStr;
}

//To create the next random user id in database
function nextUserId() {
  let userId = 'user';
  userId += generateRandomString();
  return userId;
};

//To check if user is currently logged in (i.e. 'user_id' cookies exists)
function getUserFromReq(request) {
  //If user is logged in, return the user_id
  //If user is not logged in, return empty/undefined user_id
  return request.session.user_id;
};

//To create and return an array that consists of shortURLs specific to a user id
function urlsForUser(userId) {
  let userUrlsCollection = [];
  for (let shortUrl in urlDatabase) {
    if (userId === urlDatabase[shortUrl].userId) {
      userUrlsCollection.push(urlDatabase[shortUrl]);
    }
  }
  return userUrlsCollection;
};

function correctUrl(url) {
  if (!url.startsWith('http://') || url.startsWith('https://')) {
    return `https://${url}`.trim();
  }
};

//ROUTES

////GET ROUTES

//Root route
app.get("/", (req, res) => {
  if (getUserFromReq(req)) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

//Index Page Route
app.get('/urls', (req, res) => {
  let user = getUserFromReq(req);
  if (getUserFromReq(req)) {
    let templateVars = {
      userId: user,
      userEmail: usersDatabase[user].email,
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
  let userId = getUserFromReq(req);

  if (urlDatabase.hasOwnProperty(shortUrl)) {
    let actualWebsite = urlDatabase[shortUrl].website;
    res.redirect(actualWebsite);
    //if the user id cookie who accesses the short url is different than the short url's user id
    //then that means the user is unique visitor id
    let visitors = urlDatabase[shortUrl].visitors;
    let generalVisitCounts = urlDatabase[shortUrl].visitCounts;
    if (userId !== urlDatabase[shortUrl].userId) {
      if (visitors.visitorIds.includes(userId)) {
        visitors.uniqueVisitorCounts += 1;
        visitors.lastVisit = new Date();
      } else {
        visitors.visitorIds.push(userId.toString());
        visitors.lastVisit = new Date();
        visitors.uniqueVisitorCounts += 1;
      }
    }
    generalVisitCounts += 1;
    return;
  }
  res.status(404).render('404_error');
});


//Register Route
app.get('/register', (req, res) => {
  if (getUserFromReq(req)) {
    res.redirect('/');
    return;
  }
  res.render('urls_registration');
});

//Login Route
app.get('/login', (req, res) => {
  if (getUserFromReq(req)){
    res.redirect('/');
    return;
  }
  res.render('urls_login');
});

//New short url Route
app.get("/urls/new", (req, res) => {
  let user = getUserFromReq(req);
  if (getUserFromReq(req)) {
    let templateVars = {
      userEmail: usersDatabase[user].email
    };
    res.render("urls_new", templateVars);
    return;
  }
  res.status(401).render('401_error');
});

//Retrieve particular short url (shortUrl) Route
app.get('/urls/:shortUrl', (req, res) => {
  let shortUrl = req.params.shortUrl;
  let user = getUserFromReq(req);
  if (!urlDatabase.hasOwnProperty(shortUrl)) {
    res.status(404).render('404_error');
    return;
  } else if (!getUserFromReq(req)) {
    res.status(401).render('401_error');
    return;
  } else if (getUserFromReq(req) !== urlDatabase[shortUrl].userId) {
    res.status(403).render('403_error');
    return;
  }
  let templateVars = {
    userId: user,
    userEmail: usersDatabase[user].email,
    shortUrl: shortUrl,
    longUrl: urlDatabase[shortUrl].website,
    urlDateCreated: urlDatabase[shortUrl].dateCreated,
    urlNumberOfVisits: urlDatabase[shortUrl].visitCounts,
    urlNumberOfUniqueVisits: urlDatabase[shortUrl].visitors.uniqueVisitorCounts
  };
  res.status(200).render('urls_show', templateVars);
});

////POST ROUTES

//Register Route
app.post('/register', (req, res) => {
  const password = req.body.password;
  //Check if email and password are empty
  if (!req.body.email || !password) {
    res.status(400).send('Please provide email and password');
    return;
  }
  //Check if email already exists in the database
  for (let userId in usersDatabase) {
    if (usersDatabase[userId].email === req.body.email) {
      res.status(400).send('Email is already used, please use other email');
      return;
    }
  }
  //Else, create new user
  let userId = nextUserId();
  const hashed_password = bcrypt.hashSync(password, 10);
  //Add the new user to the user database
  usersDatabase[userId] = {
    id: userId,
    email: req.body.email,
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
    if (usersDatabase[userId].email === req.body.email) {
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
  if (getUserFromReq(req)) {
    let shortUrl = generateRandomString();

    //Add the new short url to the database
    urlDatabase[shortUrl] = {
      shortUrl: shortUrl,
      website: correctUrl(req.body.longUrl),
      userId: getUserFromReq(req),
      dateCreated: new Date().toUTCString(),
      visitCounts: 0,
      visitors: {
        visitorIds: [],
        uniqueVisitorCounts: 0
      }
    };
    res.redirect(`/urls/${shortUrl}`);
    return;
  }
  res.status(401).render('401_error');
});

//Update short url
app.put('/urls/:shortUrl', (req, res) => {
  let shortUrl = req.params.shortUrl;
  let longUrl = req.body.longUrl;
  let existingEntry = urlDatabase[shortUrl];
  if (!urlDatabase.hasOwnProperty(shortUrl)) {
    res.status(404).render('404_error');
    return;
  } else if (!getUserFromReq(req)) {
    res.status(401).render('401_error');
    return;
  } else if (getUserFromReq(req) !== existingEntry['userId']) {
    res.status(403).render('403_error');
    return;
  }
  //Update the existing entry's properties
  existingEntry.website = correctUrl(longUrl);
  existingEntry.dateCreated = new Date().toUTCString();
  res.redirect(`/urls/${shortUrl}`);
});

//Delete short url
app.delete('/urls/:shortUrl', (req, res) => {
  delete urlDatabase[req.params.shortUrl];
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`TinyURL app listening on port ${PORT}!`);
});
