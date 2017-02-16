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

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

//Root route
app.get("/", (req, res) => {
  //console.log(req.cookies[]);
  res.end("Hello! " + req.cookies['username']);
});

// app.get("/urls.json", (req, res) => {
//   res.json(urlDatabase);
// });

// app.get("/hello", (req, res) => {
//   res.end("<html><body>Hello <b>World</b></body></html>\n");
// });

//Redirect short url to its website
app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

//Home route
app.get('/urls', (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    username: req.cookies['username']
  };
  res.render('urls_index', templateVars);
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
  urlDatabase[shortURL] = req.body.longURL.indexOf('http://') > 0 ? req.body.longURL : `http://${req.body.longURL}`;
  res.redirect(`/urls/${shortURL}`);
});

//Update short url
app.post('/urls/:shortURL', (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.newLongURL;
  res.redirect('/urls');
})

//Delete short url
app.post('/urls/:shortURL/delete', (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});