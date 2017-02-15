const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const morgan = require('morgan');
const PORT = process.env.PORT || 8080; // default port 8080

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
  res.end("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});

//Redirect short url to its website
app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

//Home route
app.get('/urls', (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render('urls_index', templateVars);
});

//Page route to create new shortURL
app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

//Retrieve short url
app.get('/urls/:id', (req, res) => {
  let templateVars = {
    shortURL: req.params.id,
    urls: urlDatabase
  };
  res.render('urls_show', templateVars);
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