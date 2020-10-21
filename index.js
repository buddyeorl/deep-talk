const ds = require('deepspeech');
const fs = require('fs');
let filename = './index/audio/resampled.wav';


// This line opens the file as a readable stream
let readStream = fs.createReadStream(filename);


console.log(ds.Version());

let model = new ds.Model('./index/deepspeech-0.8.2-models.pbmm');
model.enableExternalScorer('./index/deepspeech-0.8.2-models.scorer');
//let model = new ds.Model('./index/deepspeech-0.8.2-models.tflite');

console.log(model);


let stream = model.createStream();
// This will wait until we know the readable stream is actually valid before piping
// readStream.on('open', (data) => {
//     let chunk = data.toString();
//     console.log(chunk);
//     // This just pipes the read stream to the response object (which goes to the client)
//     //readStream.pipe(stream);
//     //stream.feedAudioContent(chunk);
// });
//

let data;
readStream.on('data', function (chunk) {
    data += chunk;
    stream.feedAudioContent(chunk);
    stream.intermediateDecode();
});

readStream.on('end', function () {
    //console.log(data);
    // let metadata = stream.finishStreamWithMetadata();
    // console.log(candidateTranscriptToString(metadata.transcripts[0]));
    console.log(stream.finishStream());
});




// This catches any errors that happen while creating the readable stream (usually invalid names)
readStream.on('error', (err) => {
    console.log(err)
});