const _createClass = (() => { function defineProperties(target, props) { for (const key in props) { const prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return (Constructor, protoProps, staticProps) => { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

const _classCallCheck = (instance, Constructor) => { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

const WORKER_ENABLED = !!(global === global.window && global.URL && global.Blob && global.Worker);

const InlineWorker = (() => {
  function InlineWorker(func, self) {
    const _this = this;

    _classCallCheck(this, InlineWorker);

    ////Removed this line to prevent breaking on production
    // if (WORKER_ENABLED) {
    //   var functionBody = func.toString().trim().match(/^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/)[1];
    //   var url = global.URL.createObjectURL(new global.Blob([functionBody], { type: "text/javascript" }));

    //   return new global.Worker(url);
    // }

    this.self = self;
    this.self.postMessage = data => {
      setTimeout(() => {
        _this.onmessage({ data });
      }, 0);
    };

    setTimeout(() => {
      func.call(self);
    }, 0);
  }

  _createClass(InlineWorker, {
    postMessage: {
      value: function postMessage(data) {
        const _this = this;

        setTimeout(() => {
          _this.self.onmessage({ data });
        }, 0);
      }
    }
  });

  return InlineWorker;
})();

export default InlineWorker;