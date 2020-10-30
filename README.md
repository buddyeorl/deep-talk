## Deep-talk
Deep-speech react app to test trained models,to visualize the speech to text process, to record the audio from mic to wav using the webaudio API, or to create/use a custom open speech-to-text API.

[Live Demo](https://deep-talk.azurewebsites.net/).

![deep-talk](https://repository-images.githubusercontent.com/305024458/55411800-1a4f-11eb-9645-0e2fe529f5a7)


## Clone it

```
git clone https://github.com/buddyeorl/deep-talk.git
```

### Download the Model and Scorer

This app needs two files to work, the acoustic model:
[deepspeech-0.8.2-models.pbmm](https://github.com/mozilla/DeepSpeech/releases/download/v0.8.2/deepspeech-0.8.2-models.pbmm)

and the following scorer:
[deepspeech-0.8.2-models.scorer](https://github.com/mozilla/DeepSpeech/releases/download/v0.8.2/deepspeech-0.8.2-models.scorer)

download both files to `/server/index/`

### Build

In the terminal in the repo root directory `npm run build` .

### Server

Now in the terminal `cd server && node server.js`

*** defaults to http://localhost:3001 ***

### API calls

API calls to 

`https://deep-talk.azurewebsites.net/api/v1/getVoice`

POST requests accepts 16kHZ mono 16bits WAV audio files in multipart form data,the field name should be 'audio'

sample responses:

No audio file:
```json
{
    "message": "No audio file has been received"
}
```

No recognition:
```json
{
    "error": "No speech was recognized"
}
```

Success:
```json
{
    "message": "success",
    "data": "two three"
}
```

### Important audio info

Please note that the app resamples the audio recorded to 16kHZ mono 16bits(as used when training the model), ***I might add different samplerates recording options if requested***.

Also note that this app will recognize pauses in speech and trimm the audio files and speech recognition responses accordingly.

### `Author`
Github
[Alex Lizarraga](https://github.com/buddyeorl)

Portfolio
[www.alexcode.io](https://www.alexcode.io)

Email
[hello@alexcode.io](hello@alexcode.io)




