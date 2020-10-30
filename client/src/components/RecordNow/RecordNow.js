import React, { useState, useEffect, useRef } from 'react';
import './RecordNow.css';

//Audio File Resampler
//modified audio-resampler package for this project including it's dependencies
import resampler from '../../helper/audio-resampler';

//icons
import MicIcon from '@material-ui/icons/Mic';
import RecordingIcon from '@material-ui/icons/RadioButtonChecked';
import GetAppIcon from '@material-ui/icons/GetApp';
import QueueIcon from '@material-ui/icons/Timer';
import ProcessingIcon from '@material-ui/icons/Equalizer';
// import CompleteIcon from '@material-ui/icons/DoneOutline';
import CompleteIcon from '@material-ui/icons/Done';
import HearingIcon from '@material-ui/icons/Hearing';
import SpeakingIcon from '@material-ui/icons/RecordVoiceOver';
import MicOffIcon from '@material-ui/icons/MicOff';
//setting default MediaRecorder to OpusMediaRecorder
window.MediaRecorder = window.OpusMediaRecorder;

// Non-standard options for opus media recorder
const workerOptions = {
    OggOpusEncoderWasmPath: 'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/OggOpusEncoder.wasm',
    WebMOpusEncoderWasmPath: 'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/WebMOpusEncoder.wasm'
};

let audioData = []

const RecordNow = () => {
    const canvasRef = useRef();
    const listRef = useRef();
    //analyzer context
    //for testing "record until silence"
    const [audioCtx, setAudioCtx] = useState();
    const [analyser, setAnalyser] = useState();
    const [dataArray, setDataArray] = useState();
    const [activeAnalyzer, setActiveAnalyzer] = useState(null);
    //array of responses
    const [text, setText] = useState(null)
    const [speech, setSpeech] = useState([]);
    const [currentAudio, setCurrentAudio] = useState(null)

    const [recording, setRecording] = useState(false);
    const [recorder, setRecorder] = useState(false);
    const [mainStream, setMainStream] = useState(false);
    const [downloadLink, setDownloadLink] = useState();
    const [linkArray, setLinkArray] = useState([])
    const [silence, setSilence] = useState(0)

    const draw = () => {
        canvasRef.current.getContext('2d').fillStyle = 'rgb(255, 255, 255,0.5)';
        //canvasRef.current.getContext('2d').fillStyle = "rgba(0, 0, 0, 0.5)"
        //canvasRef.current.getContext('2d').fillRect(0, 0, window.innerWidth, 150);
        canvasRef.current.getContext('2d').clearRect(0, 0, window.innerWidth, 100);
        canvasRef.current.getContext('2d').lineWidth = 2;
        var gradient = canvasRef.current.getContext('2d').createLinearGradient(0, 0, window.innerWidth, 0);
        gradient.addColorStop("0", "magenta");
        gradient.addColorStop("0.2", "blue");
        gradient.addColorStop("0.5", "green");
        gradient.addColorStop("0.8", "blue");
        gradient.addColorStop("1.0", "green");
        canvasRef.current.getContext('2d').strokeStyle = gradient;
        canvasRef.current.getContext('2d').beginPath();

        if (dataArray) {
            //console.log('getting array');
            //console.log(dataArray)
            let sliceWidth = window.innerWidth / dataArray.length;
            let x = 0;
            // let maxPoint = (Math.max(...dataArray));
            // console.log('maxPoint', maxPoint)
            // let buff = maxPoint < 200 ? 50 : 0
            for (var i = 0; i < dataArray.length; i++) {

                var y = (-(dataArray[i]) * (75 / 255));
                //var y = v * 100 / 2;

                if (i === 0) {
                    canvasRef.current.getContext('2d').moveTo(x, y + 75);
                } else {
                    canvasRef.current.getContext('2d').lineTo(x, y + 75);
                    //canvasRef.current.getContext('2d').lineTo(x, 100);
                }
                x += sliceWidth;
            }

        }
        canvasRef.current.getContext('2d').lineTo(window.innerWidth, 75);
        canvasRef.current.getContext('2d').stroke();

    }


    //start audio context
    useEffect(() => {
        setAudioCtx(new (window.AudioContext || window.webkitAudioContext)());
        //cleanup, close audioCtx
        return () => { audioCtx.close() }
    }, []);

    //initialize analyzer from audio context
    useEffect(() => {
        if (audioCtx) {
            setAnalyser(audioCtx.createAnalyser());
        }
    }, [audioCtx]);

    // handling threashold silences while recording
    useEffect(() => {
        //console.log('current silence length in ms ', silence)
        //1.5 seconds pause will split the files
        if (silence > 100) {
            //console.log('requesting data')
            setSilence(0);
            // Requests a Blob containing the saved data received thus far (After calling method requestData() recording continues, but in a new Blob)
            recorder.requestData();
            recorder.pause();
        }
    }, [silence])


    // Looking for silence in the dataArray
    useEffect(() => {
        let myInterval;
        // console.log('here')
        if (dataArray && recording) {
            myInterval = setInterval(() => {
                setActiveAnalyzer(analyser.getByteFrequencyData(dataArray));
                // for the voice graph
                draw();
                //console.log(dataArray);
                let silenceCounter = 0;
                let noiseCounter = 0;
                for (let i in dataArray) {
                    // values between 0-255, 0 means not amplitude (silence)
                    if (dataArray[i] <= 40) {
                        silenceCounter++;
                    } else {
                        //sound found in this array
                        //console.log('found on index:', i);
                        noiseCounter++;
                    }
                    //in this dataArray how many 0s were found
                    if (noiseCounter > 100) {
                        recorder.resume();
                        break;
                    }
                    //in this dataArray how many 0s were found
                    if (silenceCounter > 1000 && recorder.state === 'recording') {
                        setSilence(silence + 1);
                        break;
                    }
                }


                // console.log('silenceCounter', silenceCounter);
                // console.log('noiseCounter', noiseCounter);
            }, 5)
        } else if (!recording) {
            clearInterval(myInterval)
        }
        //cleanup
        return () => { clearInterval(myInterval) }
    }, [dataArray, recording, silence]);

    //handle stop and dataavailable listeners along with sound resampling
    useEffect(() => {
        if (recorder) {
            //setRecorder(new MediaRecorder(stream, options));
            recorder.addEventListener('dataavailable', async (e) => {
                // console.log('stream stopped, now data is available');
                if (e.data.size > 0) {
                    // console.log('blobsize', e.data.size)
                    // console.log(e.data);
                    // console.log(URL.createObjectURL(e.data));
                    //Opus Media Recorder defaults recording wav files to 44.1KHZ so need to resample to 16khz for deepspeech to analyze it. resampler package resample wav audio file and returns a URL
                    await resampler(new File([e.data], "audio.wav"), 16000, async (event) => {
                        // console.log('=============================', event);
                        // console.log(event instanceof Error);

                        // let audio = await event.getAudioBuffer()
                        // var audioData = {
                        //     sampleRate: audio.sampleRate,
                        //     channelData: []
                        // };
                        // for (var i = 0; i < audio.numberOfChannels; i++) {
                        //     audioData.channelData[i] = audio.getChannelData(i);
                        // }
                        // console.log('encoding')
                        // await WavEncoder.encode(audioData).then(function (buffer) {
                        //     console.log('error here?')
                        //     var blob = new Blob([buffer], {
                        //         type: "audio/wav"
                        //     });
                        //     console.log(URL.createObjectURL(blob));
                        // });
                        // console.log('encoding finished')

                        if (!(event instanceof Error)) {
                            // console.log(event.getAudioBuffer());

                            event.getFile((fileEvent) => {
                                //sendAudio(fileEvent);
                                //sendAudio(event.getAudioBuffer());
                                // console.log('downloadlink', downloadLink);
                                setDownloadLink(fileEvent);
                                // setSpeech([
                                //     ...speech,
                                //     {
                                //         file: fileEvent,
                                //         text: '',
                                //         sent: false,
                                //         status: 'queue'
                                //     }
                                // ])
                                setCurrentAudio(fileEvent);
                                // console.log('new file', new file)
                            });
                        }

                    });


                    // setDownloadLink(URL.createObjectURL(e.data));
                }
            });

            recorder.addEventListener('stop', () => {
                console.log('ended');
                // console.log('stopped');
            });
        }
    }, [recorder]);


    //add download link created from the resampler package to the link array 
    useEffect(() => {
        if (downloadLink) {
            setLinkArray([...linkArray, downloadLink]);
        }
    }, [downloadLink])

    // add new object to the speech array
    // useEffect(() => {
    //     if (currentAudio) {
    //         setSpeech([
    //             ...speech,
    //             {
    //                 file: currentAudio,
    //                 text: '',
    //                 sent: false,
    //                 status: 'queue'
    //             }
    //         ])
    //     }

    // }, [currentAudio]);

    useEffect(() => {
        const sendAudio = async (file, index) => {

            // setSpeech([
            //     ...speech,
            //     {
            //         file: file,
            //         text: '',
            //         sent: true,
            //         status: 'Processing'
            //     }
            // ])

            // console.log('sending audio')
            // console.log(file)
            //URL to file using fetch
            let blob = await fetch(file).then(r => r.blob());
            let myFileBlob = new File([blob], "audio.wav");
            // let myFileBlob = new Blob([blob], {
            //     type: "audio/wav"
            // });
            const data = new FormData;
            data.append('audio', myFileBlob);
            //data.append('audio', file, { filename: 'audio.wav' });

            let request = {
                method: 'POST',
                body: data
            }
            // console.log('trying to send')
            return await fetch('/api/v1/getVoice', request)
                .then((res) => res.json())
                .then(res => {
                    // console.log('nothing here')
                    // console.log(res);
                    if (res.message === 'success') {
                        //setText([...text, res.data])


                        // setSpeech([
                        //     ...speech,
                        //     {
                        //         file: file,
                        //         text: res.data,
                        //         sent: true,
                        //         status: 'Complete'
                        //     }
                        // ])
                        audioData[index] = {
                            file: file,
                            text: res.data,
                            sent: true,
                            status: 'complete'
                        }

                        return
                    } else if (res.error) {
                        // setSpeech([
                        //     ...speech
                        //     {
                        //         file: file,
                        //         text: res.error,
                        //         sent: true,
                        //         status: 'Complete',
                        //         error: res.error
                        //     }
                        // ])
                        audioData[index] = {
                            file: file,
                            text: res.error,
                            sent: true,
                            status: 'complete',
                            error: res.error
                        }

                        return
                    }
                })
                .catch(err => console.log(err));

        }


        let fetchInterval = setInterval(() => {
            setSpeech([...audioData]);
            if (!audioData.some(item => item.status === 'processing')) {
                if (audioData.some(item => item.status === 'queue')) {
                    for (let i = 0; i < audioData.length; i++) {
                        if (audioData[i].status === 'queue') {
                            audioData[i].status = 'processing';
                            sendAudio(audioData[i].file, i)
                            break;
                        }
                    }
                }
            }
        }, 100);
        // fetchInterval();
        return () => { clearInterval(fetchInterval) }
    }, [])


    //handle speech object array
    useEffect(() => {
        // console.log('speech effect', speech)
        const sendAudio = async (file) => {
            // tempSpeech[tempSpeech.length - 1] = {
            //     file: speech[speech.length - 1].file,
            //     text: '',
            //     sent: true,
            //     status: 'processing'
            // }
            // setSpeech(tempSpeech);
            setSpeech([
                ...speech,
                {
                    file: file,
                    text: '',
                    sent: true,
                    status: 'Processing'
                }
            ])

            // console.log('sending audio')
            // console.log(file)
            //URL to file using fetch
            let blob = await fetch(file).then(r => r.blob());
            let myFileBlob = new File([blob], "audio.wav");
            // let myFileBlob = new Blob([blob], {
            //     type: "audio/wav"
            // });
            const data = new FormData;
            data.append('audio', myFileBlob);
            //data.append('audio', file, { filename: 'audio.wav' });

            let request = {
                method: 'POST',
                body: data
            }
            // console.log('trying to send')
            return await fetch('/api/v1/getVoice', request)
                .then((res) => res.json())
                .then(res => {
                    // console.log('nothing here')
                    // console.log(res);
                    if (res.message === 'success') {
                        //setText([...text, res.data])

                        // tempSpeech[tempSpeech.length - 1] = {
                        //     file: tempSpeech[tempSpeech.length - 1].file,
                        //     text: res.data,
                        //     sent: true,
                        //     status: 'complete'
                        // }
                        // console.log(tempSpeech);
                        // setSpeech(tempSpeech)
                        setSpeech([
                            ...speech,
                            {
                                file: file,
                                text: res.data,
                                sent: true,
                                status: 'Complete'
                            }
                        ])
                        return {
                            file: file,
                            text: res.data,
                            sent: true,
                            status: 'Complete'
                        }
                    } else if (res.error) {
                        setSpeech([
                            ...speech,
                            {
                                file: file,
                                text: res.error,
                                sent: true,
                                status: 'Complete',
                                error: res.error
                            }
                        ])
                        return {
                            file: file,
                            text: res.error,
                            sent: true,
                            status: 'Complete',
                            error: res.error
                        }
                    }
                })
                .catch(err => console.log(err));

        }
        // console.log(speech)
        // if (speech.length > 0 && !speech[speech.length - 1].sent) {
        //     console.log('status =', speech.length, '=====', speech[speech.length - 1].sent)
        //     console.log(speech)
        //     sendAudio(speech[speech.length - 1].file)
        // }
        const asyncCheck = async () => {
            audioData = await audioData.map(async (audio, index) => {
                if (audio.status === 'queue') {
                    return await sendAudio(audio.file)
                } else {
                    return audio
                }

            });
            // setSpeech(await audioData);
            //console.log(audioData)
        }

        if (currentAudio) {
            // setSpeech([
            //     ...speech,
            //     {
            //         file: currentAudio,
            //         text: '',
            //         sent: false,
            //         status: 'queue'
            //     }
            // ])
            audioData.push({
                file: currentAudio,
                text: '',
                sent: false,
                status: 'queue'
            })
            //console.log(audioData);
            //asyncCheck();
            //sendAudio(currentAudio)
        }

    }, [currentAudio]);

    // useEffect(()=>{

    // },[speech])



    //recorder object has been set and now we need to start recording
    useEffect(() => {
        if (recording) {
            //starting to record
            audioCtx.resume();
            recorder.start();
        } else if (!recording && recorder) {
            if (recorder.state === 'paused') {
                recorder.resume();
            }
            //stop recording
            audioCtx.suspend();
            //Check state here

            recorder.stop();

            //stopping the mainstream tracks (closing mic streaming)
            mainStream.getTracks().forEach(function (track) {
                //console.log('track', track.getConstraints())
                //track.applyConstraints({ sampleSize: 16, channelCount: 2, echoCancellation: false, sampleRate: 16000 })
                //console.log('track', track.getConstraints())
                track.stop();
            });

        }
    }, [recording]);

    const sendAudio = async (file) => {
        // console.log('sending audio')
        //console.log(file)
        //URL to file using fetch
        let blob = await fetch(file).then(r => r.blob());
        let myFileBlob = new File([blob], "audio.wav");
        // let myFileBlob = new Blob([blob], {
        //     type: "audio/wav"
        // });
        const data = new FormData;
        data.append('audio', myFileBlob);
        //data.append('audio', file, { filename: 'audio.wav' });

        let request = {
            method: 'POST',
            body: data
        }

        await fetch('http://localhost:3001/api/v1/getVoice', request)
            .then((res) => res.json())
            .then(res => {
                //console.log(res);
                if (res.message === 'success') {
                    setText([...text, res.data])
                }

            })
            .catch(err => console.log(err));

    }

    //handles recording on off
    const handleClick = (e) => {
        e.preventDefault();
        // console.log('running = ', !recording);

        if (recording) {
            // change recording status
            setRecording(false);
        } else {
            const options = {
                sampleSize: 16,
                sampleRate: 56000,
                channelCount: 1,
                mimeType: 'audio/wav'
            };

            //requestion microphone access
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(async (stream) => {
                    //temp track is needed for original MediaRecorder Object to set optional constraints
                    let tempTrack = stream.getTracks()[0];
                    await tempTrack.applyConstraints(options);
                    //tempTrack is a reference for stream, so tempTrack=== stream
                    setMainStream(stream);
                    setRecorder(new MediaRecorder(stream, options, workerOptions));
                    // change recording status
                    setRecording(true);


                    //analize sound waves
                    let source = audioCtx.createMediaStreamSource(stream);
                    source.connect(analyser);

                    analyser.fftSize = 2048;
                    // let bufferLength = analyser.frequencyBinCount;
                    // let dataArray = new Uint8Array(bufferLength);
                    // console.log(dataArray);
                    let bufferLength = analyser.frequencyBinCount;
                    // let dataArray = new Uint8Array(bufferLength);
                    setDataArray(new Uint8Array(bufferLength))


                    // setInterval(() => {
                    //     analyser.getByteFrequencyData(dataArray);
                    //     //analyser.getByteFrequencyData(dataArray);

                    //     console.log(dataArray);
                    // }, 100)


                    // analyser.connect(distortion);
                    // distortion.connect(audioCtx.destination);

                });

        }
    }


    return (
        <React.Fragment>
            <section style={styles.header}>
                <div style={styles.buttonContainer}>
                    <button className='button' style={styles.button} onClick={handleClick}>{recording ? <RecordingIcon className={'animate-flicker'} style={{ marginLeft: '20px', marginRight: '10px', color: 'red', fontSize: '35px' }} /> : <MicIcon style={{ marginLeft: '20px', marginRight: '10px', color: '#42ec42', fontSize: '35px' }} />}
                        {recording ? 'Stop' : 'Start'}
                    </button>
                    {/* <span>{recorder.state}</span> */}
                    <div style={styles.headerDesc}>
                        <p>Press start to activate text to speech recognition using deepspeech . This tool will recognize pauses in speech and trimm audio accordingly, give it a try!</p>
                    </div>
                </div>
                <canvas ref={canvasRef} width={window.innerWidth} height="100" />
                <div style={styles.audioItem} style={{ height: '35px', marginLeft: '30px' }}>
                    {recorder.state === 'inactive' && <span style={{ display: 'flex' }}><MicOffIcon style={{ marginRight: '5px' }} /> Stopped</span>}
                    {recorder.state === 'recording' && <span style={{ display: 'flex' }}><HearingIcon style={{ marginRight: '5px' }} /> Okay I'm Listening</span>}
                    {recorder.state === 'paused' && <span style={{ display: 'flex' }}><SpeakingIcon style={{ marginRight: '5px' }} /> Hmmm please speak up!</span>}
                </div>
            </section>
            <div style={styles.audioContainer}>
                <ul ref={listRef} style={styles.audioList}>
                    {speech && speech.map((item, index) =>

                        <li key={index} style={styles.audioItem}>
                            <a className='downloadButton' href={item.file} download={`audio${index + 1}.wav`} style={styles.downloadButton}> <GetAppIcon style={{ width: '50px' }} /></a>
                            <div style={{ display: 'flex', width: '20px' }}><span style={{ width: '50px' }}>{index + 1}</span></div>
                            <div style={{ display: 'flex', width: '50px' }}>
                                {item.status === 'queue' && <QueueIcon className={'animate-flicker'} style={{ color: 'blueviolet', marginLeft: '5px' }} />}
                                {item.status === 'processing' && <ProcessingIcon className={'animate-flicker'} style={{ color: '#00feff', marginLeft: '5px' }} />}
                                {item.status === 'complete' && <CompleteIcon style={{ color: 'limegreen', marginLeft: '5px' }} />}
                            </div>
                            <span style={{ color: item.error ? '#ff6d15' : 'unset', fontWeight: item.error ? 500 : 600, textAlign: 'left', maxWidth: '70vw' }} >{item.text}</span>
                        </li>
                    ).reverse()}

                </ul>
            </div>


        </React.Fragment>
    )
}

const styles = {
    audioContainer: {
        display: 'flex',
        justifyContent: 'center',
        justifySelf: 'center',
        width: '100%',
        minHeight: '100px',
        height: '100%',
        overflow: 'scroll',
        //borderRadius: '5px',
        boxShadow: '1px 1px 4px -2px',
        background: '#1d1d1d',
        color: 'white',
    },
    audioList: {
        display: 'inline-flex',
        listStyle: 'none',
        width: '100%',
        paddingLeft: 0,
        flexDirection: 'column',
        // justifyContent: 'flex-end', //bug using this with overflow hidden
        // marginTop: 'auto',
        overflow: 'scroll',
        marginLeft: '15px',
        marginRight: '15px',
        paddingTop: '30px'
    },
    audioItem: {
        fontWeight: 100,
        fontSize: '15px',
        padding: '5px 15px',
        display: 'flex',
        alignItems: 'center'

        // top: (index === speech.length - 1) ? '0px' : `${(speech.length - index - 1) * 15}px`, zIndex: index, 
        // margin: '2px',
        // boxShadow: '0px 0px 8px -2px',
        // position: 'relative',
        // /* z-index: 100, */
        // backgroundColor: 'white',
    },
    header: {
        //position: 'absolute',
        background: 'linear-gradient(-30deg, #d754ad 0%, #d754ad 10%, #f96785 62%, #fe7333 100%)',
        width: '100%',
        height: '285px',
        // display: 'flex',
        display: 'flow-root',
        alignItems: 'center',
    },
    headerDesc: {
        color: 'white',
        fontSize: '25px',
        fontWeight: 300,
        padding: '0px 30px',
    },
    buttonContainer: {
        height: '150px',
        // display: 'flex',
        justifySelf: 'center',
        alignItems: 'center',
        width: '100%',
        display: 'inline-grid',
        gridTemplateColumns: '200px calc(100% - 200px)'
        //paddingLeft: '30px'
    },
    button: {
        height: '80px',
        width: '140px',
        backgroundColor: 'black',
        color: 'white',
        fontSize: '17px',
        fontWeight: 600,
        borderStyle: 'none',
        borderRadius: '48px',
        // boxShadow: '0px 0px 2px -1px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginLeft: '30px'
    },
    downloadButton: {
        width: '50px',
        color: 'rgb(48 106 241 / 70%)',
        boxShadow: 'none',
        borderRadius: '18px',
        background: 'white',
        marginRight: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }
}

export default RecordNow;