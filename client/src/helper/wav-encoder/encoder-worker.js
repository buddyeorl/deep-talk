const self = {};
function encoder() {

  self.onmessage = e => {
    switch (e.data.type) {
      case "encode":
        self.encode(e.data.audioData, e.data.format).then(buffer => {
          const data = {
            type: "encoded",
            callbackId: e.data.callbackId,
            buffer
          };
          self.postMessage(data, [buffer]);
        }, ({ message }) => {
          const data = {
            type: "error",
            callbackId: e.data.callbackId,
            message: message
          };
          self.postMessage(data);
        });
        break;
    }
  };

  self.encode = (audioData, format) => {
    format.floatingPoint = !!format.floatingPoint;
    format.bitDepth = format.bitDepth | 0 || 16;

    return new Promise(resolve => {
      const numberOfChannels = audioData.numberOfChannels;
      const sampleRate = audioData.sampleRate;
      const bytes = format.bitDepth >> 3;
      const length = audioData.length * numberOfChannels * bytes;
      const writer = new BufferWriter(44 + length);

      writer.writeString("RIFF"); // RIFF header
      writer.writeUint32(writer.length - 8); // file length
      writer.writeString("WAVE"); // RIFF Type

      writer.writeString("fmt "); // format chunk identifier
      writer.writeUint32(16); // format chunk length
      writer.writeUint16(format.floatingPoint ? 3 : 1); // format (PCM)
      writer.writeUint16(numberOfChannels); // number of channels
      writer.writeUint32(sampleRate); // sample rate
      writer.writeUint32(sampleRate * numberOfChannels * bytes); // byte rate
      writer.writeUint16(numberOfChannels * bytes); // block size
      writer.writeUint16(format.bitDepth); // bits per sample

      writer.writeString("data"); // data chunk identifier
      writer.writeUint32(length); // data chunk length

      const channelData = audioData.buffers.map(buffer => new Float32Array(buffer));

      writer.writePCM(channelData, format);

      resolve(writer.toArrayBuffer());
    });
  };

  class BufferWriter {
    constructor(length) {
      this.buffer = new ArrayBuffer(length);
      this.view = new DataView(this.buffer);
      this.length = length;
      this.pos = 0;
    }

    writeUint8(data) {
      this.view.setUint8(this.pos, data);
      this.pos += 1;
    }

    writeUint16(data) {
      this.view.setUint16(this.pos, data, true);
      this.pos += 2;
    }

    writeUint32(data) {
      this.view.setUint32(this.pos, data, true);
      this.pos += 4;
    }

    writeString(data) {
      for (let i = 0; i < data.length; i++) {
        this.writeUint8(data.charCodeAt(i));
      }
    }

    writePCM8(x) {
      x = Math.max(-128, Math.min(x * 128, 127)) | 0;
      this.view.setInt8(this.pos, x);
      this.pos += 1;
    }

    writePCM16(x) {
      x = Math.max(-32768, Math.min(x * 32768, 32767)) | 0;
      this.view.setInt16(this.pos, x, true);
      this.pos += 2;
    }

    writePCM24(x) {
      x = Math.max(-8388608, Math.min(x * 8388608, 8388607)) | 0;
      this.view.setUint8(this.pos + 0, x >> 0 & 255);
      this.view.setUint8(this.pos + 1, x >> 8 & 255);
      this.view.setUint8(this.pos + 2, x >> 16 & 255);
      this.pos += 3;
    }

    writePCM32(x) {
      x = Math.max(-2147483648, Math.min(x * 2147483648, 2147483647)) | 0;
      this.view.setInt32(this.pos, x, true);
      this.pos += 4;
    }

    writePCM32F(x) {
      this.view.setFloat32(this.pos, x, true);
      this.pos += 4;
    }

    writePCM64F(x) {
      this.view.setFloat64(this.pos, x, true);
      this.pos += 8;
    }

    writePCM(channelData, { bitDepth, floatingPoint }) {
      const length = channelData[0].length;
      const numberOfChannels = channelData.length;
      let method = `writePCM${bitDepth}`;

      if (floatingPoint) {
        method += "F";
      }

      if (!this[method]) {
        throw new Error(`not suppoerted bit depth ${bitDepth}`);
      }

      for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numberOfChannels; ch++) {
          this[method](channelData[ch][i]);
        }
      }
    }

    toArrayBuffer() {
      return this.buffer;
    }
  }

  self.BufferWriter = BufferWriter;
}

encoder.self = encoder.util = self;

export default encoder;