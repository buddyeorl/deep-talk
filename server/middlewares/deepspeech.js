const ds = require('deepspeech');
const fs = require('fs');
let model = new ds.Model('../index/deepspeech-0.8.2-models.pbmm');
model.enableExternalScorer('../index/deepspeech-0.8.2-models.scorer');



console.log(ds.Version());
console.log(model);

const deepSpeech = async (req, res, next) => {
    //if no file was received
    if (!req.file) {
        res.send({ message: 'No audio file has been received' });
        return
    }
    let speechToText = await model.stt(req.file.buffer);
    console.log('recognized speech = ', speechToText);

    if (speechToText.length > 0) {
        req.locals = speechToText;
        next();
    } else {
        //res.send({ message: 'couldn\'t recognize that' })
        //res.send({ message: 'success', data: 'couldn\'t recognize that' })
        res.send({
            error: 'No speech was recognized',
        })
    }
    return
}

module.exports = { deepSpeech };
