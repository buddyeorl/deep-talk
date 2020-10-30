//custom wavencoder
import WavEncoder from "../wav-encoder";
import WebAudioLoader from 'webaudioloader';


// WebAudio Shim.
window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

const audioContext = new AudioContext();

const wal = new WebAudioLoader({
    context: audioContext,
    cache: false
});

function resampler(input, targetSampleRate, oncomplete) {

    if (!input && !targetSampleRate) {
        return returnError('Error: First argument should be either a File, URL or AudioBuffer');
    }

    const inputType = Object.prototype.toString.call(input);
    if (inputType !== '[object String]' &&
        inputType !== '[object File]' &&
        inputType !== '[object AudioBuffer]' &&
        inputType !== '[object Object]') {
        return returnError('Error: First argument should be either a File, URL or AudioBuffer');
    }

    if (typeof targetSampleRate !== 'number' ||
        targetSampleRate > 192000 || targetSampleRate < 3000) {
        return returnError('Error: Second argument should be a numeric sample rate between 3000 and 192000');
    }

    if (inputType === '[object String]' || inputType === '[object File]') {
        // console.log('Loading/decoding input', input);
        wal.load(input, {
            onload(err, audioBuffer) {
                if (err) {
                    return returnError(err);
                }
                resampleAudioBuffer(audioBuffer);
            }
        });
    } else if (inputType === '[object AudioBuffer]') {
        resampleAudioBuffer(input);
    } else if (inputType === '[object Object]' && input.leftBuffer && input.sampleRate) {
        const numCh_ = input.rightBuffer ? 2 : 1;
        const audioBuffer_ = audioContext.createBuffer(numCh_, input.leftBuffer.length, input.sampleRate);
        resampleAudioBuffer(audioBuffer_);
    } else {
        return returnError('Error: Unknown input type');
    }

    function returnError(errMsg) {
        console.error(errMsg);
        if (typeof oncomplete === 'function') {
            oncomplete(new Error(errMsg));
        }
        return;
    }

    function resampleAudioBuffer(audioBuffer) {


        const numCh_ = audioBuffer.numberOfChannels;
        const numFrames_ = audioBuffer.length * targetSampleRate / audioBuffer.sampleRate;

        const offlineContext_ = new OfflineAudioContext(numCh_, numFrames_, targetSampleRate);
        const bufferSource_ = offlineContext_.createBufferSource();
        bufferSource_.buffer = audioBuffer;

        offlineContext_.oncomplete = ({ renderedBuffer }) => {
            const resampeledBuffer = renderedBuffer;
            // console.log('Done Rendering');
            if (typeof oncomplete === 'function') {
                oncomplete({
                    getAudioBuffer() {
                        return resampeledBuffer;
                    },
                    getFile(fileCallback) {
                        const audioData = {
                            sampleRate: resampeledBuffer.sampleRate,
                            channelData: []
                        };
                        for (let i = 0; i < resampeledBuffer.numberOfChannels; i++) {
                            audioData.channelData[i] = resampeledBuffer.getChannelData(i);
                        }
                        WavEncoder.encode(audioData).then(buffer => {
                            const blob = new Blob([buffer], {
                                type: "audio/wav"
                            });
                            fileCallback(URL.createObjectURL(blob));
                        });
                    }
                });
            }
        };

        // console.log('Starting Offline Rendering');
        bufferSource_.connect(offlineContext_.destination);
        bufferSource_.start(0);
        offlineContext_.startRendering();
    }
}

export default resampler;
