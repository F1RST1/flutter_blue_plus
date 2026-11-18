(function () {
  var storageKey = 'flutter_blue_plus_debug_logs_v1';
  var maxEntries = 300;
  var maxMessageLength = 6000;
  var logs = [];
  var storageError = null;

  if (typeof WebAssembly.compileStreaming !== 'function') {
    WebAssembly.compileStreaming = function (source, options) {
      return Promise.resolve(source)
        .then(function (response) {
          return response.arrayBuffer();
        })
        .then(function (bytes) {
          return options
            ? WebAssembly.compile(bytes, options)
            : WebAssembly.compile(bytes);
        });
    };
  }

  function readLogs() {
    try {
      var saved = window.localStorage.getItem(storageKey);
      var parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      storageError = String(error);
      return logs;
    }
  }

  function persistLogs() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(logs));
      storageError = null;
    } catch (error) {
      storageError = String(error);
      logs = logs.slice(-50);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(logs));
        storageError = null;
      } catch (retryError) {
        storageError = String(retryError);
      }
    }
  }

  function formatValue(value) {
    if (value instanceof Error) {
      return value.stack || value.name + ': ' + value.message;
    }
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function record(level, message) {
    logs.push({
      time: new Date().toISOString(),
      level: level,
      message: String(message).slice(0, maxMessageLength)
    });
    logs = logs.slice(-maxEntries);
    persistLogs();
  }

  logs = readLogs().slice(-maxEntries);
  window.fbpLog = record;

  ['log', 'info', 'debug', 'warn', 'error'].forEach(function (level) {
    var original = window.console[level];
    window.console[level] = function () {
      if (original) {
        original.apply(window.console, arguments);
      }
      record(level, Array.prototype.map.call(arguments, formatValue).join(' '));
    };
  });

  window.addEventListener('error', function (event) {
    var message = event.message || 'Unknown JavaScript error';
    if (event.error) {
      message += '\n' + formatValue(event.error);
    } else if (event.target && event.target !== window) {
      message += '\nResource: ' + (event.target.src || event.target.href || 'unknown');
    }
    if (event.filename) {
      message += '\n' + event.filename + ':' + event.lineno + ':' + event.colno;
    }
    record('uncaught error', message);
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    record('unhandled rejection', formatValue(event.reason));
  });

  function renderLogViewer() {
    document.title = 'Flutter Blue Plus logs';
    document.body.textContent = '';
    document.body.style.cssText =
      'margin:0;padding:16px;background:#f5f5f5;color:#222;' +
      'font:14px -apple-system,BlinkMacSystemFont,sans-serif;';

    var heading = document.createElement('h2');
    heading.textContent = 'Flutter Blue Plus debug logs';
    document.body.appendChild(heading);

    var info = document.createElement('p');
    info.textContent =
      'Logs are stored only in this browser on this device. The most recent ' +
      maxEntries + ' entries are kept.';
    document.body.appendChild(info);

    var status = document.createElement('p');
    status.id = 'log-status';
    document.body.appendChild(status);

    var actions = document.createElement('p');
    document.body.appendChild(actions);

    var refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh';
    refreshButton.onclick = renderEntries;
    actions.appendChild(refreshButton);

    var copyButton = document.createElement('button');
    copyButton.textContent = 'Copy logs';
    copyButton.style.marginLeft = '8px';
    copyButton.onclick = copyLogs;
    actions.appendChild(copyButton);

    var clearButton = document.createElement('button');
    clearButton.textContent = 'Clear logs';
    clearButton.style.marginLeft = '8px';
    clearButton.onclick = function () {
      logs = [];
      try {
        window.localStorage.removeItem(storageKey);
        storageError = null;
      } catch (error) {
        storageError = String(error);
      }
      renderEntries();
    };
    actions.appendChild(clearButton);

    var output = document.createElement('pre');
    output.id = 'log-output';
    output.style.cssText =
      'padding:12px;background:#fff;border:1px solid #ccc;' +
      'white-space:pre-wrap;overflow-wrap:anywhere;min-height:120px;';
    document.body.appendChild(output);

    function renderEntries() {
      logs = readLogs().slice(-maxEntries);
      output.textContent = logs.map(function (entry) {
        return '[' + entry.time + '] [' + entry.level + ']\n' + entry.message;
      }).join('\n\n');
      status.textContent = logs.length + ' log entries' +
        (storageError ? ' — storage error: ' + storageError : '');
    }

    function copyLogs() {
      var text = output.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          status.textContent = 'Logs copied.';
        }, function () {
          output.focus();
          window.getSelection().selectAllChildren(output);
          status.textContent = 'Select and copy the logs above.';
        });
      } else {
        output.focus();
        window.getSelection().selectAllChildren(output);
        status.textContent = 'Select and copy the logs above.';
      }
    }

    renderEntries();
  }

  if (new URLSearchParams(window.location.search).get('logs') === '1') {
    renderLogViewer();
    return;
  }

  record('info', 'Page started. URL: ' + window.location.href +
    '\nUser agent: ' + window.navigator.userAgent);

  var bootstrap = document.createElement('script');
  bootstrap.src = 'flutter_bootstrap.js';
  bootstrap.async = true;
  document.body.appendChild(bootstrap);
})();
