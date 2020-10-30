const express = require('express');
const router = express.Router();
const multer = require('multer');
let getFiles = multer();
let { deepSpeech } = require('../middlewares/deepspeech');

// //========================used for local storage
// var path = require('path')
// var storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, __dirname + '/')
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
//     }
// })
// var getFiles = multer({ storage: storage })
// //============================



//get voice data
router.post("/", getFiles.single('audio'), deepSpeech, (req, res) => {
    res.send({
        message: 'success',
        data: req.locals
    })
});


module.exports = router;