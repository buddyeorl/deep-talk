const path = require('path');

//express
const express = require('express');

//middleware
const bodyParser = require('body-parser');

//initialize express app
const app = express();

// CORS
let cors = require('cors');


//initialize middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

//http to https redirect middleware
// app.use((req, res, next) => {
//     if ((req.get('X-Forwarded-Proto') !== 'https')) {
//         res.redirect('https://' + req.get('Host') + req.url);
//     } else {
//         next();
//     }
// });

//statics
app.use(express.static("../client/build"));

//set port
app.set('port', (process.env.PORT || 3001));


//API routes
const voice = require('./api/getVoice')
app.use('/api/v1/getVoice', voice);


//port
app.listen(app.get("port"), () => {
    console.log(`Server is running on port ${app.get('port')}`);
})