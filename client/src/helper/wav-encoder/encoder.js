

const _interopRequire = obj => obj && obj.__esModule ? obj["default"] : obj;

const _createClass = (() => { function defineProperties(target, props) { for (const key in props) { const prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return (Constructor, protoProps, staticProps) => { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

const _classCallCheck = (instance, Constructor) => { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };


// custom inline-worker function modified to prevent breaking on production
const InlineWorker = _interopRequire(require("../inline-worker"));

const encoder = _interopRequire(require("./encoder-worker.js"));

const Encoder = (() => {
  function Encoder(...args) {
    const _this = this;

    const format = args[0] === undefined ? {} : args[0];

    _classCallCheck(this, Encoder);

    this.format = {
      floatingPoint: !!format.floatingPoint,
      bitDepth: format.bitDepth | 0 || 16
    };
    this._worker = new InlineWorker(encoder, encoder.self);
    this._worker.onmessage = ({ data }) => {
      const callback = _this._callbacks[data.callbackId];

      if (callback) {
        if (data.type === "encoded") {
          callback.resolve(data.buffer);
        } else {
          callback.reject(new Error(data.message));
        }
      }

      _this._callbacks[data.callbackId] = null;
    };
    this._callbacks = [];
  }

  _createClass(Encoder, {
    canProcess: {
      value: function canProcess(format) {
        return Encoder.canProcess(format);
      }
    },
    encode: {
      value: function encode(audioData, format) {
        const _this = this;

        if (format == null || typeof format !== "object") {
          format = this.format;
        }
        return new Promise((resolve, reject) => {
          const callbackId = _this._callbacks.length;

          _this._callbacks.push({ resolve, reject });

          const numberOfChannels = audioData.channelData.length;
          const length = audioData.channelData[0].length;
          const sampleRate = audioData.sampleRate;
          const buffers = audioData.channelData.map(({ buffer }) => buffer);

          audioData = { numberOfChannels, length, sampleRate, buffers };

          _this._worker.postMessage({
            type: "encode", audioData, format, callbackId
          }, audioData.buffers);
        });
      }
    }
  }, {
    canProcess: {
      value: function canProcess(format) {
        if (format && (format === "wav" || format.type === "wav")) {
          return "maybe";
        }
        return "";
      }
    },
    encode: {
      value: function encode(audioData, format) {
        return new Encoder(format).encode(audioData);
      }
    }
  });

  return Encoder;
})();

export default Encoder;