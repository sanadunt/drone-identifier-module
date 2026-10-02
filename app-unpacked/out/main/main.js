"use strict";
const require$$0$3 = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const require$$1$1 = require("https");
const crypto = require("crypto");
const require$$0 = require("child_process");
const require$$1 = require("os");
const require$$0$1 = require("util");
const require$$0$2 = require("events");
const serialport = require("serialport");
const net = require("net");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const http__namespace = /* @__PURE__ */ _interopNamespaceDefault(http);
const require$$1__namespace = /* @__PURE__ */ _interopNamespaceDefault(require$$1$1);
const net__namespace = /* @__PURE__ */ _interopNamespaceDefault(net);
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var src = { exports: {} };
var electronLogPreload = { exports: {} };
var hasRequiredElectronLogPreload;
function requireElectronLogPreload() {
  if (hasRequiredElectronLogPreload) return electronLogPreload.exports;
  hasRequiredElectronLogPreload = 1;
  (function(module) {
    let electron = {};
    try {
      electron = require("electron");
    } catch (e) {
    }
    if (electron.ipcRenderer) {
      initialize2(electron);
    }
    {
      module.exports = initialize2;
    }
    function initialize2({ contextBridge, ipcRenderer }) {
      if (!ipcRenderer) {
        return;
      }
      ipcRenderer.on("__ELECTRON_LOG_IPC__", (_, message) => {
        window.postMessage({ cmd: "message", ...message });
      });
      ipcRenderer.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(new Error(
        `electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`
      )));
      const electronLog = {
        sendToMain(message) {
          try {
            ipcRenderer.send("__ELECTRON_LOG__", message);
          } catch (e) {
            console.error("electronLog.sendToMain ", e, "data:", message);
            ipcRenderer.send("__ELECTRON_LOG__", {
              cmd: "errorHandler",
              error: { message: e?.message, stack: e?.stack },
              errorName: "sendToMain"
            });
          }
        },
        log(...data) {
          electronLog.sendToMain({ data, level: "info" });
        }
      };
      for (const level of ["error", "warn", "info", "verbose", "debug", "silly"]) {
        electronLog[level] = (...data) => electronLog.sendToMain({
          data,
          level
        });
      }
      if (contextBridge && process.contextIsolated) {
        try {
          contextBridge.exposeInMainWorld("__electronLog", electronLog);
        } catch {
        }
      }
      if (typeof window === "object") {
        window.__electronLog = electronLog;
      } else {
        __electronLog = electronLog;
      }
    }
  })(electronLogPreload);
  return electronLogPreload.exports;
}
var renderer = { exports: {} };
var scope;
var hasRequiredScope;
function requireScope() {
  if (hasRequiredScope) return scope;
  hasRequiredScope = 1;
  scope = scopeFactory;
  function scopeFactory(logger) {
    return Object.defineProperties(scope2, {
      defaultLabel: { value: "", writable: true },
      labelPadding: { value: true, writable: true },
      maxLabelLength: { value: 0, writable: true },
      labelLength: {
        get() {
          switch (typeof scope2.labelPadding) {
            case "boolean":
              return scope2.labelPadding ? scope2.maxLabelLength : 0;
            case "number":
              return scope2.labelPadding;
            default:
              return 0;
          }
        }
      }
    });
    function scope2(label) {
      scope2.maxLabelLength = Math.max(scope2.maxLabelLength, label.length);
      const newScope = {};
      for (const level of logger.levels) {
        newScope[level] = (...d) => logger.logData(d, { level, scope: label });
      }
      newScope.log = newScope.info;
      return newScope;
    }
  }
  return scope;
}
var Buffering_1;
var hasRequiredBuffering;
function requireBuffering() {
  if (hasRequiredBuffering) return Buffering_1;
  hasRequiredBuffering = 1;
  class Buffering {
    constructor({ processMessage }) {
      this.processMessage = processMessage;
      this.buffer = [];
      this.enabled = false;
      this.begin = this.begin.bind(this);
      this.commit = this.commit.bind(this);
      this.reject = this.reject.bind(this);
    }
    addMessage(message) {
      this.buffer.push(message);
    }
    begin() {
      this.enabled = [];
    }
    commit() {
      this.enabled = false;
      this.buffer.forEach((item) => this.processMessage(item));
      this.buffer = [];
    }
    reject() {
      this.enabled = false;
      this.buffer = [];
    }
  }
  Buffering_1 = Buffering;
  return Buffering_1;
}
var Logger_1;
var hasRequiredLogger;
function requireLogger() {
  if (hasRequiredLogger) return Logger_1;
  hasRequiredLogger = 1;
  const scopeFactory = requireScope();
  const Buffering = requireBuffering();
  class Logger {
    static instances = {};
    dependencies = {};
    errorHandler = null;
    eventLogger = null;
    functions = {};
    hooks = [];
    isDev = false;
    levels = null;
    logId = null;
    scope = null;
    transports = {};
    variables = {};
    constructor({
      allowUnknownLevel = false,
      dependencies = {},
      errorHandler,
      eventLogger,
      initializeFn,
      isDev = false,
      levels = ["error", "warn", "info", "verbose", "debug", "silly"],
      logId,
      transportFactories = {},
      variables
    } = {}) {
      this.addLevel = this.addLevel.bind(this);
      this.create = this.create.bind(this);
      this.initialize = this.initialize.bind(this);
      this.logData = this.logData.bind(this);
      this.processMessage = this.processMessage.bind(this);
      this.allowUnknownLevel = allowUnknownLevel;
      this.buffering = new Buffering(this);
      this.dependencies = dependencies;
      this.initializeFn = initializeFn;
      this.isDev = isDev;
      this.levels = levels;
      this.logId = logId;
      this.scope = scopeFactory(this);
      this.transportFactories = transportFactories;
      this.variables = variables || {};
      for (const name of this.levels) {
        this.addLevel(name, false);
      }
      this.log = this.info;
      this.functions.log = this.log;
      this.errorHandler = errorHandler;
      errorHandler?.setOptions({ ...dependencies, logFn: this.error });
      this.eventLogger = eventLogger;
      eventLogger?.setOptions({ ...dependencies, logger: this });
      for (const [name, factory] of Object.entries(transportFactories)) {
        this.transports[name] = factory(this, dependencies);
      }
      Logger.instances[logId] = this;
    }
    static getInstance({ logId }) {
      return this.instances[logId] || this.instances.default;
    }
    addLevel(level, index = this.levels.length) {
      if (index !== false) {
        this.levels.splice(index, 0, level);
      }
      this[level] = (...args) => this.logData(args, { level });
      this.functions[level] = this[level];
    }
    catchErrors(options) {
      this.processMessage(
        {
          data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
          level: "warn"
        },
        { transports: ["console"] }
      );
      return this.errorHandler.startCatching(options);
    }
    create(options) {
      if (typeof options === "string") {
        options = { logId: options };
      }
      return new Logger({
        dependencies: this.dependencies,
        errorHandler: this.errorHandler,
        initializeFn: this.initializeFn,
        isDev: this.isDev,
        transportFactories: this.transportFactories,
        variables: { ...this.variables },
        ...options
      });
    }
    compareLevels(passLevel, checkLevel, levels = this.levels) {
      const pass = levels.indexOf(passLevel);
      const check = levels.indexOf(checkLevel);
      if (check === -1 || pass === -1) {
        return true;
      }
      return check <= pass;
    }
    initialize(options = {}) {
      this.initializeFn({ logger: this, ...this.dependencies, ...options });
    }
    logData(data, options = {}) {
      if (this.buffering.enabled) {
        this.buffering.addMessage({ data, date: /* @__PURE__ */ new Date(), ...options });
      } else {
        this.processMessage({ data, ...options });
      }
    }
    processMessage(message, { transports = this.transports } = {}) {
      if (message.cmd === "errorHandler") {
        this.errorHandler.handle(message.error, {
          errorName: message.errorName,
          processType: "renderer",
          showDialog: Boolean(message.showDialog)
        });
        return;
      }
      let level = message.level;
      if (!this.allowUnknownLevel) {
        level = this.levels.includes(message.level) ? message.level : "info";
      }
      const normalizedMessage = {
        date: /* @__PURE__ */ new Date(),
        logId: this.logId,
        ...message,
        level,
        variables: {
          ...this.variables,
          ...message.variables
        }
      };
      for (const [transName, transFn] of this.transportEntries(transports)) {
        if (typeof transFn !== "function" || transFn.level === false) {
          continue;
        }
        if (!this.compareLevels(transFn.level, message.level)) {
          continue;
        }
        try {
          const transformedMsg = this.hooks.reduce((msg, hook) => {
            return msg ? hook(msg, transFn, transName) : msg;
          }, normalizedMessage);
          if (transformedMsg) {
            transFn({ ...transformedMsg, data: [...transformedMsg.data] });
          }
        } catch (e) {
          this.processInternalErrorFn(e);
        }
      }
    }
    processInternalErrorFn(_e) {
    }
    transportEntries(transports = this.transports) {
      const transportArray = Array.isArray(transports) ? transports : Object.entries(transports);
      return transportArray.map((item) => {
        switch (typeof item) {
          case "string":
            return this.transports[item] ? [item, this.transports[item]] : null;
          case "function":
            return [item.name, item];
          default:
            return Array.isArray(item) ? item : null;
        }
      }).filter(Boolean);
    }
  }
  Logger_1 = Logger;
  return Logger_1;
}
var RendererErrorHandler_1;
var hasRequiredRendererErrorHandler;
function requireRendererErrorHandler() {
  if (hasRequiredRendererErrorHandler) return RendererErrorHandler_1;
  hasRequiredRendererErrorHandler = 1;
  const consoleError = console.error;
  class RendererErrorHandler {
    logFn = null;
    onError = null;
    showDialog = false;
    preventDefault = true;
    constructor({ logFn = null } = {}) {
      this.handleError = this.handleError.bind(this);
      this.handleRejection = this.handleRejection.bind(this);
      this.startCatching = this.startCatching.bind(this);
      this.logFn = logFn;
    }
    handle(error, {
      logFn = this.logFn,
      errorName = "",
      onError = this.onError,
      showDialog = this.showDialog
    } = {}) {
      try {
        if (onError?.({ error, errorName, processType: "renderer" }) !== false) {
          logFn({ error, errorName, showDialog });
        }
      } catch {
        consoleError(error);
      }
    }
    setOptions({ logFn, onError, preventDefault, showDialog }) {
      if (typeof logFn === "function") {
        this.logFn = logFn;
      }
      if (typeof onError === "function") {
        this.onError = onError;
      }
      if (typeof preventDefault === "boolean") {
        this.preventDefault = preventDefault;
      }
      if (typeof showDialog === "boolean") {
        this.showDialog = showDialog;
      }
    }
    startCatching({ onError, showDialog } = {}) {
      if (this.isActive) {
        return;
      }
      this.isActive = true;
      this.setOptions({ onError, showDialog });
      window.addEventListener("error", (event) => {
        this.preventDefault && event.preventDefault?.();
        this.handleError(event.error || event);
      });
      window.addEventListener("unhandledrejection", (event) => {
        this.preventDefault && event.preventDefault?.();
        this.handleRejection(event.reason || event);
      });
    }
    handleError(error) {
      this.handle(error, { errorName: "Unhandled" });
    }
    handleRejection(reason) {
      const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
      this.handle(error, { errorName: "Unhandled rejection" });
    }
  }
  RendererErrorHandler_1 = RendererErrorHandler;
  return RendererErrorHandler_1;
}
var transform_1;
var hasRequiredTransform;
function requireTransform() {
  if (hasRequiredTransform) return transform_1;
  hasRequiredTransform = 1;
  transform_1 = { transform };
  function transform({
    logger,
    message,
    transport,
    initialData = message?.data || [],
    transforms = transport?.transforms
  }) {
    return transforms.reduce((data, trans) => {
      if (typeof trans === "function") {
        return trans({ data, logger, message, transport });
      }
      return data;
    }, initialData);
  }
  return transform_1;
}
var console_1$1;
var hasRequiredConsole$1;
function requireConsole$1() {
  if (hasRequiredConsole$1) return console_1$1;
  hasRequiredConsole$1 = 1;
  const { transform } = requireTransform();
  console_1$1 = consoleTransportRendererFactory;
  const consoleMethods = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  function consoleTransportRendererFactory(logger) {
    return Object.assign(transport, {
      format: "{h}:{i}:{s}.{ms}{scope} › {text}",
      transforms: [formatDataFn],
      writeFn({ message: { level, data } }) {
        const consoleLogFn = consoleMethods[level] || consoleMethods.info;
        setTimeout(() => consoleLogFn(...data));
      }
    });
    function transport(message) {
      transport.writeFn({
        message: { ...message, data: transform({ logger, message, transport }) }
      });
    }
  }
  function formatDataFn({
    data = [],
    logger = {},
    message = {},
    transport = {}
  }) {
    if (typeof transport.format === "function") {
      return transport.format({
        data,
        level: message?.level || "info",
        logger,
        message,
        transport
      });
    }
    if (typeof transport.format !== "string") {
      return data;
    }
    data.unshift(transport.format);
    if (typeof data[1] === "string" && data[1].match(/%[1cdfiOos]/)) {
      data = [`${data[0]}${data[1]}`, ...data.slice(2)];
    }
    const date = message.date || /* @__PURE__ */ new Date();
    data[0] = data[0].replace(/\{(\w+)}/g, (substring, name) => {
      switch (name) {
        case "level":
          return message.level;
        case "logId":
          return message.logId;
        case "scope": {
          const scope2 = message.scope || logger.scope?.defaultLabel;
          return scope2 ? ` (${scope2})` : "";
        }
        case "text":
          return "";
        case "y":
          return date.getFullYear().toString(10);
        case "m":
          return (date.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return date.getDate().toString(10).padStart(2, "0");
        case "h":
          return date.getHours().toString(10).padStart(2, "0");
        case "i":
          return date.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return date.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return date.getMilliseconds().toString(10).padStart(3, "0");
        case "iso":
          return date.toISOString();
        default:
          return message.variables?.[name] || substring;
      }
    }).trim();
    return data;
  }
  return console_1$1;
}
var ipc$1;
var hasRequiredIpc$1;
function requireIpc$1() {
  if (hasRequiredIpc$1) return ipc$1;
  hasRequiredIpc$1 = 1;
  const { transform } = requireTransform();
  ipc$1 = ipcTransportRendererFactory;
  const RESTRICTED_TYPES = /* @__PURE__ */ new Set([Promise, WeakMap, WeakSet]);
  function ipcTransportRendererFactory(logger) {
    return Object.assign(transport, {
      depth: 5,
      transforms: [serializeFn]
    });
    function transport(message) {
      if (!window.__electronLog) {
        logger.processMessage(
          {
            data: ["electron-log: logger isn't initialized in the main process"],
            level: "error"
          },
          { transports: ["console"] }
        );
        return;
      }
      try {
        const serialized = transform({
          initialData: message,
          logger,
          message,
          transport
        });
        __electronLog.sendToMain(serialized);
      } catch (e) {
        logger.transports.console({
          data: ["electronLog.transports.ipc", e, "data:", message.data],
          level: "error"
        });
      }
    }
  }
  function isPrimitive(value) {
    return Object(value) !== value;
  }
  function serializeFn({
    data,
    depth,
    seen = /* @__PURE__ */ new WeakSet(),
    transport = {}
  } = {}) {
    const actualDepth = depth || transport.depth || 5;
    if (seen.has(data)) {
      return "[Circular]";
    }
    if (actualDepth < 1) {
      if (isPrimitive(data)) {
        return data;
      }
      if (Array.isArray(data)) {
        return "[Array]";
      }
      return `[${typeof data}]`;
    }
    if (["function", "symbol"].includes(typeof data)) {
      return data.toString();
    }
    if (isPrimitive(data)) {
      return data;
    }
    if (RESTRICTED_TYPES.has(data.constructor)) {
      return `[${data.constructor.name}]`;
    }
    if (Array.isArray(data)) {
      return data.map((item) => serializeFn({
        data: item,
        depth: actualDepth - 1,
        seen
      }));
    }
    if (data instanceof Date) {
      return data.toISOString();
    }
    if (data instanceof Error) {
      return data.stack;
    }
    if (data instanceof Map) {
      return new Map(
        Array.from(data).map(([key, value]) => [
          serializeFn({ data: key, depth: actualDepth - 1, seen }),
          serializeFn({ data: value, depth: actualDepth - 1, seen })
        ])
      );
    }
    if (data instanceof Set) {
      return new Set(
        Array.from(data).map(
          (val) => serializeFn({ data: val, depth: actualDepth - 1, seen })
        )
      );
    }
    seen.add(data);
    return Object.fromEntries(
      Object.entries(data).map(
        ([key, value]) => [
          key,
          serializeFn({ data: value, depth: actualDepth - 1, seen })
        ]
      )
    );
  }
  return ipc$1;
}
var hasRequiredRenderer;
function requireRenderer() {
  if (hasRequiredRenderer) return renderer.exports;
  hasRequiredRenderer = 1;
  (function(module) {
    const Logger = requireLogger();
    const RendererErrorHandler = requireRendererErrorHandler();
    const transportConsole = requireConsole$1();
    const transportIpc = requireIpc$1();
    if (typeof process === "object" && process.type === "browser") {
      console.warn(
        "electron-log/renderer is loaded in the main process. It could cause unexpected behaviour."
      );
    }
    module.exports = createLogger();
    module.exports.Logger = Logger;
    module.exports.default = module.exports;
    function createLogger() {
      const logger = new Logger({
        allowUnknownLevel: true,
        errorHandler: new RendererErrorHandler(),
        initializeFn: () => {
        },
        logId: "default",
        transportFactories: {
          console: transportConsole,
          ipc: transportIpc
        },
        variables: {
          processType: "renderer"
        }
      });
      logger.errorHandler.setOptions({
        logFn({ error, errorName, showDialog }) {
          logger.transports.console({
            data: [errorName, error].filter(Boolean),
            level: "error"
          });
          logger.transports.ipc({
            cmd: "errorHandler",
            error: {
              cause: error?.cause,
              code: error?.code,
              name: error?.name,
              message: error?.message,
              stack: error?.stack
            },
            errorName,
            logId: logger.logId,
            showDialog
          });
        }
      });
      if (typeof window === "object") {
        window.addEventListener("message", (event) => {
          const { cmd, logId, ...message } = event.data || {};
          const instance = Logger.getInstance({ logId });
          if (cmd === "message") {
            instance.processMessage(message, { transports: ["console"] });
          }
        });
      }
      return new Proxy(logger, {
        get(target, prop) {
          if (typeof target[prop] !== "undefined") {
            return target[prop];
          }
          return (...data) => logger.logData(data, { level: prop });
        }
      });
    }
  })(renderer);
  return renderer.exports;
}
var packageJson;
var hasRequiredPackageJson;
function requirePackageJson() {
  if (hasRequiredPackageJson) return packageJson;
  hasRequiredPackageJson = 1;
  const fs$1 = fs;
  const path$1 = path;
  packageJson = {
    findAndReadPackageJson,
    tryReadJsonAt
  };
  function findAndReadPackageJson() {
    return tryReadJsonAt(getMainModulePath()) || tryReadJsonAt(extractPathFromArgs()) || tryReadJsonAt(process.resourcesPath, "app.asar") || tryReadJsonAt(process.resourcesPath, "app") || tryReadJsonAt(process.cwd()) || { name: void 0, version: void 0 };
  }
  function tryReadJsonAt(...searchPaths) {
    if (!searchPaths[0]) {
      return void 0;
    }
    try {
      const searchPath = path$1.join(...searchPaths);
      const fileName = findUp("package.json", searchPath);
      if (!fileName) {
        return void 0;
      }
      const json = JSON.parse(fs$1.readFileSync(fileName, "utf8"));
      const name = json?.productName || json?.name;
      if (!name || name.toLowerCase() === "electron") {
        return void 0;
      }
      if (name) {
        return { name, version: json?.version };
      }
      return void 0;
    } catch (e) {
      return void 0;
    }
  }
  function findUp(fileName, cwd) {
    let currentPath = cwd;
    while (true) {
      const parsedPath = path$1.parse(currentPath);
      const root = parsedPath.root;
      const dir = parsedPath.dir;
      if (fs$1.existsSync(path$1.join(currentPath, fileName))) {
        return path$1.resolve(path$1.join(currentPath, fileName));
      }
      if (currentPath === root) {
        return null;
      }
      currentPath = dir;
    }
  }
  function extractPathFromArgs() {
    const matchedArgs = process.argv.filter((arg) => {
      return arg.indexOf("--user-data-dir=") === 0;
    });
    if (matchedArgs.length === 0 || typeof matchedArgs[0] !== "string") {
      return null;
    }
    const userDataDir = matchedArgs[0];
    return userDataDir.replace("--user-data-dir=", "");
  }
  function getMainModulePath() {
    try {
      return require.main?.filename;
    } catch {
      return void 0;
    }
  }
  return packageJson;
}
var NodeExternalApi_1;
var hasRequiredNodeExternalApi;
function requireNodeExternalApi() {
  if (hasRequiredNodeExternalApi) return NodeExternalApi_1;
  hasRequiredNodeExternalApi = 1;
  const childProcess = require$$0;
  const os = require$$1;
  const path$1 = path;
  const packageJson2 = requirePackageJson();
  class NodeExternalApi {
    appName = void 0;
    appPackageJson = void 0;
    platform = process.platform;
    getAppLogPath(appName = this.getAppName()) {
      if (this.platform === "darwin") {
        return path$1.join(this.getSystemPathHome(), "Library/Logs", appName);
      }
      return path$1.join(this.getAppUserDataPath(appName), "logs");
    }
    getAppName() {
      const appName = this.appName || this.getAppPackageJson()?.name;
      if (!appName) {
        throw new Error(
          "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
        );
      }
      return appName;
    }
    /**
     * @private
     * @returns {undefined}
     */
    getAppPackageJson() {
      if (typeof this.appPackageJson !== "object") {
        this.appPackageJson = packageJson2.findAndReadPackageJson();
      }
      return this.appPackageJson;
    }
    getAppUserDataPath(appName = this.getAppName()) {
      return appName ? path$1.join(this.getSystemPathAppData(), appName) : void 0;
    }
    getAppVersion() {
      return this.getAppPackageJson()?.version;
    }
    getElectronLogPath() {
      return this.getAppLogPath();
    }
    getMacOsVersion() {
      const release = Number(os.release().split(".")[0]);
      if (release <= 19) {
        return `10.${release - 4}`;
      }
      return release - 9;
    }
    /**
     * @protected
     * @returns {string}
     */
    getOsVersion() {
      let osName = os.type().replace("_", " ");
      let osVersion = os.release();
      if (osName === "Darwin") {
        osName = "macOS";
        osVersion = this.getMacOsVersion();
      }
      return `${osName} ${osVersion}`;
    }
    /**
     * @return {PathVariables}
     */
    getPathVariables() {
      const appName = this.getAppName();
      const appVersion = this.getAppVersion();
      const self2 = this;
      return {
        appData: this.getSystemPathAppData(),
        appName,
        appVersion,
        get electronDefaultDir() {
          return self2.getElectronLogPath();
        },
        home: this.getSystemPathHome(),
        libraryDefaultDir: this.getAppLogPath(appName),
        libraryTemplate: this.getAppLogPath("{appName}"),
        temp: this.getSystemPathTemp(),
        userData: this.getAppUserDataPath(appName)
      };
    }
    getSystemPathAppData() {
      const home = this.getSystemPathHome();
      switch (this.platform) {
        case "darwin": {
          return path$1.join(home, "Library/Application Support");
        }
        case "win32": {
          return process.env.APPDATA || path$1.join(home, "AppData/Roaming");
        }
        default: {
          return process.env.XDG_CONFIG_HOME || path$1.join(home, ".config");
        }
      }
    }
    getSystemPathHome() {
      return os.homedir?.() || process.env.HOME;
    }
    getSystemPathTemp() {
      return os.tmpdir();
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: void 0,
        os: this.getOsVersion()
      };
    }
    isDev() {
      return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
    }
    isElectron() {
      return Boolean(process.versions.electron);
    }
    onAppEvent(_eventName, _handler) {
    }
    onAppReady(handler) {
      handler();
    }
    onEveryWebContentsEvent(eventName, handler) {
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(channel, listener) {
    }
    onIpcInvoke(channel, listener) {
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(url, logFunction = console.error) {
      const startMap = { darwin: "open", win32: "start", linux: "xdg-open" };
      const start = startMap[process.platform] || "xdg-open";
      childProcess.exec(`${start} ${url}`, {}, (err) => {
        if (err) {
          logFunction(err);
        }
      });
    }
    setAppName(appName) {
      this.appName = appName;
    }
    setPlatform(platform) {
      this.platform = platform;
    }
    setPreloadFileForSessions({
      filePath,
      // eslint-disable-line no-unused-vars
      includeFutureSession = true,
      // eslint-disable-line no-unused-vars
      getSessions = () => []
      // eslint-disable-line no-unused-vars
    }) {
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(channel, message) {
    }
    showErrorBox(title, message) {
    }
  }
  NodeExternalApi_1 = NodeExternalApi;
  return NodeExternalApi_1;
}
var ElectronExternalApi_1;
var hasRequiredElectronExternalApi;
function requireElectronExternalApi() {
  if (hasRequiredElectronExternalApi) return ElectronExternalApi_1;
  hasRequiredElectronExternalApi = 1;
  const path$1 = path;
  const NodeExternalApi = requireNodeExternalApi();
  class ElectronExternalApi extends NodeExternalApi {
    /**
     * @type {typeof Electron}
     */
    electron = void 0;
    /**
     * @param {object} options
     * @param {typeof Electron} [options.electron]
     */
    constructor({ electron } = {}) {
      super();
      this.electron = electron;
    }
    getAppName() {
      let appName;
      try {
        appName = this.appName || this.electron.app?.name || this.electron.app?.getName();
      } catch {
      }
      return appName || super.getAppName();
    }
    getAppUserDataPath(appName) {
      return this.getPath("userData") || super.getAppUserDataPath(appName);
    }
    getAppVersion() {
      let appVersion;
      try {
        appVersion = this.electron.app?.getVersion();
      } catch {
      }
      return appVersion || super.getAppVersion();
    }
    getElectronLogPath() {
      return this.getPath("logs") || super.getElectronLogPath();
    }
    /**
     * @private
     * @param {any} name
     * @returns {string|undefined}
     */
    getPath(name) {
      try {
        return this.electron.app?.getPath(name);
      } catch {
        return void 0;
      }
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: `Electron ${process.versions.electron}`,
        os: this.getOsVersion()
      };
    }
    getSystemPathAppData() {
      return this.getPath("appData") || super.getSystemPathAppData();
    }
    isDev() {
      if (this.electron.app?.isPackaged !== void 0) {
        return !this.electron.app.isPackaged;
      }
      if (typeof process.execPath === "string") {
        const execFileName = path$1.basename(process.execPath).toLowerCase();
        return execFileName.startsWith("electron");
      }
      return super.isDev();
    }
    onAppEvent(eventName, handler) {
      this.electron.app?.on(eventName, handler);
      return () => {
        this.electron.app?.off(eventName, handler);
      };
    }
    onAppReady(handler) {
      if (this.electron.app?.isReady()) {
        handler();
      } else if (this.electron.app?.once) {
        this.electron.app?.once("ready", handler);
      } else {
        handler();
      }
    }
    onEveryWebContentsEvent(eventName, handler) {
      this.electron.webContents?.getAllWebContents()?.forEach((webContents) => {
        webContents.on(eventName, handler);
      });
      this.electron.app?.on("web-contents-created", onWebContentsCreated);
      return () => {
        this.electron.webContents?.getAllWebContents().forEach((webContents) => {
          webContents.off(eventName, handler);
        });
        this.electron.app?.off("web-contents-created", onWebContentsCreated);
      };
      function onWebContentsCreated(_, webContents) {
        webContents.on(eventName, handler);
      }
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(channel, listener) {
      this.electron.ipcMain?.on(channel, listener);
    }
    onIpcInvoke(channel, listener) {
      this.electron.ipcMain?.handle?.(channel, listener);
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(url, logFunction = console.error) {
      this.electron.shell?.openExternal(url).catch(logFunction);
    }
    setPreloadFileForSessions({
      filePath,
      includeFutureSession = true,
      getSessions = () => [this.electron.session?.defaultSession]
    }) {
      for (const session of getSessions().filter(Boolean)) {
        setPreload(session);
      }
      if (includeFutureSession) {
        this.onAppEvent("session-created", (session) => {
          setPreload(session);
        });
      }
      function setPreload(session) {
        if (typeof session.registerPreloadScript === "function") {
          session.registerPreloadScript({
            filePath,
            id: "electron-log-preload",
            type: "frame"
          });
        } else {
          session.setPreloads([...session.getPreloads(), filePath]);
        }
      }
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(channel, message) {
      this.electron.BrowserWindow?.getAllWindows()?.forEach((wnd) => {
        if (wnd.webContents?.isDestroyed() === false && wnd.webContents?.isCrashed() === false) {
          wnd.webContents.send(channel, message);
        }
      });
    }
    showErrorBox(title, message) {
      this.electron.dialog?.showErrorBox(title, message);
    }
  }
  ElectronExternalApi_1 = ElectronExternalApi;
  return ElectronExternalApi_1;
}
var initialize;
var hasRequiredInitialize;
function requireInitialize() {
  if (hasRequiredInitialize) return initialize;
  hasRequiredInitialize = 1;
  const fs$1 = fs;
  const os = require$$1;
  const path$1 = path;
  const preloadInitializeFn = requireElectronLogPreload();
  let preloadInitialized = false;
  let spyConsoleInitialized = false;
  initialize = {
    initialize({
      externalApi,
      getSessions,
      includeFutureSession,
      logger,
      preload = true,
      spyRendererConsole = false
    }) {
      externalApi.onAppReady(() => {
        try {
          if (preload) {
            initializePreload({
              externalApi,
              getSessions,
              includeFutureSession,
              logger,
              preloadOption: preload
            });
          }
          if (spyRendererConsole) {
            initializeSpyRendererConsole({ externalApi, logger });
          }
        } catch (err) {
          logger.warn(err);
        }
      });
    }
  };
  function initializePreload({
    externalApi,
    getSessions,
    includeFutureSession,
    logger,
    preloadOption
  }) {
    let preloadPath = typeof preloadOption === "string" ? preloadOption : void 0;
    if (preloadInitialized) {
      logger.warn(new Error("log.initialize({ preload }) already called").stack);
      return;
    }
    preloadInitialized = true;
    try {
      preloadPath = path$1.resolve(
        __dirname,
        "../renderer/electron-log-preload.js"
      );
    } catch {
    }
    if (!preloadPath || !fs$1.existsSync(preloadPath)) {
      preloadPath = path$1.join(
        externalApi.getAppUserDataPath() || os.tmpdir(),
        "electron-log-preload.js"
      );
      const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
      fs$1.writeFileSync(preloadPath, preloadCode, "utf8");
    }
    externalApi.setPreloadFileForSessions({
      filePath: preloadPath,
      includeFutureSession,
      getSessions
    });
  }
  function initializeSpyRendererConsole({ externalApi, logger }) {
    if (spyConsoleInitialized) {
      logger.warn(
        new Error("log.initialize({ spyRendererConsole }) already called").stack
      );
      return;
    }
    spyConsoleInitialized = true;
    const levels = ["debug", "info", "warn", "error"];
    externalApi.onEveryWebContentsEvent(
      "console-message",
      (event, level, message) => {
        logger.processMessage({
          data: [message],
          level: levels[level],
          variables: { processType: "renderer" }
        });
      }
    );
  }
  return initialize;
}
var ErrorHandler_1;
var hasRequiredErrorHandler;
function requireErrorHandler() {
  if (hasRequiredErrorHandler) return ErrorHandler_1;
  hasRequiredErrorHandler = 1;
  class ErrorHandler {
    externalApi = void 0;
    isActive = false;
    logFn = void 0;
    onError = void 0;
    showDialog = true;
    constructor({
      externalApi,
      logFn = void 0,
      onError = void 0,
      showDialog = void 0
    } = {}) {
      this.createIssue = this.createIssue.bind(this);
      this.handleError = this.handleError.bind(this);
      this.handleRejection = this.handleRejection.bind(this);
      this.setOptions({ externalApi, logFn, onError, showDialog });
      this.startCatching = this.startCatching.bind(this);
      this.stopCatching = this.stopCatching.bind(this);
    }
    handle(error, {
      logFn = this.logFn,
      onError = this.onError,
      processType = "browser",
      showDialog = this.showDialog,
      errorName = ""
    } = {}) {
      error = normalizeError(error);
      try {
        if (typeof onError === "function") {
          const versions = this.externalApi?.getVersions() || {};
          const createIssue = this.createIssue;
          const result = onError({
            createIssue,
            error,
            errorName,
            processType,
            versions
          });
          if (result === false) {
            return;
          }
        }
        errorName ? logFn(errorName, error) : logFn(error);
        if (showDialog && !errorName.includes("rejection") && this.externalApi) {
          this.externalApi.showErrorBox(
            `A JavaScript error occurred in the ${processType} process`,
            error.stack
          );
        }
      } catch {
        console.error(error);
      }
    }
    setOptions({ externalApi, logFn, onError, showDialog }) {
      if (typeof externalApi === "object") {
        this.externalApi = externalApi;
      }
      if (typeof logFn === "function") {
        this.logFn = logFn;
      }
      if (typeof onError === "function") {
        this.onError = onError;
      }
      if (typeof showDialog === "boolean") {
        this.showDialog = showDialog;
      }
    }
    startCatching({ onError, showDialog } = {}) {
      if (this.isActive) {
        return;
      }
      this.isActive = true;
      this.setOptions({ onError, showDialog });
      process.on("uncaughtException", this.handleError);
      process.on("unhandledRejection", this.handleRejection);
    }
    stopCatching() {
      this.isActive = false;
      process.removeListener("uncaughtException", this.handleError);
      process.removeListener("unhandledRejection", this.handleRejection);
    }
    createIssue(pageUrl, queryParams) {
      this.externalApi?.openUrl(
        `${pageUrl}?${new URLSearchParams(queryParams).toString()}`
      );
    }
    handleError(error) {
      this.handle(error, { errorName: "Unhandled" });
    }
    handleRejection(reason) {
      const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
      this.handle(error, { errorName: "Unhandled rejection" });
    }
  }
  function normalizeError(e) {
    if (e instanceof Error) {
      return e;
    }
    if (e && typeof e === "object") {
      if (e.message) {
        return Object.assign(new Error(e.message), e);
      }
      try {
        return new Error(JSON.stringify(e));
      } catch (serErr) {
        return new Error(`Couldn't normalize error ${String(e)}: ${serErr}`);
      }
    }
    return new Error(`Can't normalize error ${String(e)}`);
  }
  ErrorHandler_1 = ErrorHandler;
  return ErrorHandler_1;
}
var EventLogger_1;
var hasRequiredEventLogger;
function requireEventLogger() {
  if (hasRequiredEventLogger) return EventLogger_1;
  hasRequiredEventLogger = 1;
  class EventLogger {
    disposers = [];
    format = "{eventSource}#{eventName}:";
    formatters = {
      app: {
        "certificate-error": ({ args }) => {
          return this.arrayToObject(args.slice(1, 4), [
            "url",
            "error",
            "certificate"
          ]);
        },
        "child-process-gone": ({ args }) => {
          return args.length === 1 ? args[0] : args;
        },
        "render-process-gone": ({ args: [webContents, details] }) => {
          return details && typeof details === "object" ? { ...details, ...this.getWebContentsDetails(webContents) } : [];
        }
      },
      webContents: {
        "console-message": ({ args: [level, message, line, sourceId] }) => {
          if (level < 3) {
            return void 0;
          }
          return { message, source: `${sourceId}:${line}` };
        },
        "did-fail-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "did-fail-provisional-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "plugin-crashed": ({ args }) => {
          return this.arrayToObject(args, ["name", "version"]);
        },
        "preload-error": ({ args }) => {
          return this.arrayToObject(args, ["preloadPath", "error"]);
        }
      }
    };
    events = {
      app: {
        "certificate-error": true,
        "child-process-gone": true,
        "render-process-gone": true
      },
      webContents: {
        // 'console-message': true,
        "did-fail-load": true,
        "did-fail-provisional-load": true,
        "plugin-crashed": true,
        "preload-error": true,
        "unresponsive": true
      }
    };
    externalApi = void 0;
    level = "error";
    scope = "";
    constructor(options = {}) {
      this.setOptions(options);
    }
    setOptions({
      events,
      externalApi,
      level,
      logger,
      format: format2,
      formatters,
      scope: scope2
    }) {
      if (typeof events === "object") {
        this.events = events;
      }
      if (typeof externalApi === "object") {
        this.externalApi = externalApi;
      }
      if (typeof level === "string") {
        this.level = level;
      }
      if (typeof logger === "object") {
        this.logger = logger;
      }
      if (typeof format2 === "string" || typeof format2 === "function") {
        this.format = format2;
      }
      if (typeof formatters === "object") {
        this.formatters = formatters;
      }
      if (typeof scope2 === "string") {
        this.scope = scope2;
      }
    }
    startLogging(options = {}) {
      this.setOptions(options);
      this.disposeListeners();
      for (const eventName of this.getEventNames(this.events.app)) {
        this.disposers.push(
          this.externalApi.onAppEvent(eventName, (...handlerArgs) => {
            this.handleEvent({ eventSource: "app", eventName, handlerArgs });
          })
        );
      }
      for (const eventName of this.getEventNames(this.events.webContents)) {
        this.disposers.push(
          this.externalApi.onEveryWebContentsEvent(
            eventName,
            (...handlerArgs) => {
              this.handleEvent(
                { eventSource: "webContents", eventName, handlerArgs }
              );
            }
          )
        );
      }
    }
    stopLogging() {
      this.disposeListeners();
    }
    arrayToObject(array, fieldNames) {
      const obj = {};
      fieldNames.forEach((fieldName, index) => {
        obj[fieldName] = array[index];
      });
      if (array.length > fieldNames.length) {
        obj.unknownArgs = array.slice(fieldNames.length);
      }
      return obj;
    }
    disposeListeners() {
      this.disposers.forEach((disposer) => disposer());
      this.disposers = [];
    }
    formatEventLog({ eventName, eventSource, handlerArgs }) {
      const [event, ...args] = handlerArgs;
      if (typeof this.format === "function") {
        return this.format({ args, event, eventName, eventSource });
      }
      const formatter = this.formatters[eventSource]?.[eventName];
      let formattedArgs = args;
      if (typeof formatter === "function") {
        formattedArgs = formatter({ args, event, eventName, eventSource });
      }
      if (!formattedArgs) {
        return void 0;
      }
      const eventData = {};
      if (Array.isArray(formattedArgs)) {
        eventData.args = formattedArgs;
      } else if (typeof formattedArgs === "object") {
        Object.assign(eventData, formattedArgs);
      }
      if (eventSource === "webContents") {
        Object.assign(eventData, this.getWebContentsDetails(event?.sender));
      }
      const title = this.format.replace("{eventSource}", eventSource === "app" ? "App" : "WebContents").replace("{eventName}", eventName);
      return [title, eventData];
    }
    getEventNames(eventMap) {
      if (!eventMap || typeof eventMap !== "object") {
        return [];
      }
      return Object.entries(eventMap).filter(([_, listen]) => listen).map(([eventName]) => eventName);
    }
    getWebContentsDetails(webContents) {
      if (!webContents?.loadURL) {
        return {};
      }
      try {
        return {
          webContents: {
            id: webContents.id,
            url: webContents.getURL()
          }
        };
      } catch {
        return {};
      }
    }
    handleEvent({ eventName, eventSource, handlerArgs }) {
      const log2 = this.formatEventLog({ eventName, eventSource, handlerArgs });
      if (log2) {
        const logFns = this.scope ? this.logger.scope(this.scope) : this.logger;
        logFns?.[this.level]?.(...log2);
      }
    }
  }
  EventLogger_1 = EventLogger;
  return EventLogger_1;
}
var format;
var hasRequiredFormat;
function requireFormat() {
  if (hasRequiredFormat) return format;
  hasRequiredFormat = 1;
  const { transform } = requireTransform();
  format = {
    concatFirstStringElements,
    formatScope,
    formatText,
    formatVariables,
    timeZoneFromOffset,
    format({ message, logger, transport, data = message?.data }) {
      switch (typeof transport.format) {
        case "string": {
          return transform({
            message,
            logger,
            transforms: [formatVariables, formatScope, formatText],
            transport,
            initialData: [transport.format, ...data]
          });
        }
        case "function": {
          return transport.format({
            data,
            level: message?.level || "info",
            logger,
            message,
            transport
          });
        }
        default: {
          return data;
        }
      }
    }
  };
  function concatFirstStringElements({ data }) {
    if (typeof data[0] !== "string" || typeof data[1] !== "string") {
      return data;
    }
    if (data[0].match(/%[1cdfiOos]/)) {
      return data;
    }
    return [`${data[0]} ${data[1]}`, ...data.slice(2)];
  }
  function timeZoneFromOffset(minutesOffset) {
    const minutesPositive = Math.abs(minutesOffset);
    const sign = minutesOffset > 0 ? "-" : "+";
    const hours = Math.floor(minutesPositive / 60).toString().padStart(2, "0");
    const minutes = (minutesPositive % 60).toString().padStart(2, "0");
    return `${sign}${hours}:${minutes}`;
  }
  function formatScope({ data, logger, message }) {
    const { defaultLabel, labelLength } = logger?.scope || {};
    const template = data[0];
    let label = message.scope;
    if (!label) {
      label = defaultLabel;
    }
    let scopeText;
    if (label === "") {
      scopeText = labelLength > 0 ? "".padEnd(labelLength + 3) : "";
    } else if (typeof label === "string") {
      scopeText = ` (${label})`.padEnd(labelLength + 3);
    } else {
      scopeText = "";
    }
    data[0] = template.replace("{scope}", scopeText);
    return data;
  }
  function formatVariables({ data, message }) {
    let template = data[0];
    if (typeof template !== "string") {
      return data;
    }
    template = template.replace("{level}]", `${message.level}]`.padEnd(6, " "));
    const date = message.date || /* @__PURE__ */ new Date();
    data[0] = template.replace(/\{(\w+)}/g, (substring, name) => {
      switch (name) {
        case "level":
          return message.level || "info";
        case "logId":
          return message.logId;
        case "y":
          return date.getFullYear().toString(10);
        case "m":
          return (date.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return date.getDate().toString(10).padStart(2, "0");
        case "h":
          return date.getHours().toString(10).padStart(2, "0");
        case "i":
          return date.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return date.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return date.getMilliseconds().toString(10).padStart(3, "0");
        case "z":
          return timeZoneFromOffset(date.getTimezoneOffset());
        case "iso":
          return date.toISOString();
        default: {
          return message.variables?.[name] || substring;
        }
      }
    }).trim();
    return data;
  }
  function formatText({ data }) {
    const template = data[0];
    if (typeof template !== "string") {
      return data;
    }
    const textTplPosition = template.lastIndexOf("{text}");
    if (textTplPosition === template.length - 6) {
      data[0] = template.replace(/\s?{text}/, "");
      if (data[0] === "") {
        data.shift();
      }
      return data;
    }
    const templatePieces = template.split("{text}");
    let result = [];
    if (templatePieces[0] !== "") {
      result.push(templatePieces[0]);
    }
    result = result.concat(data.slice(1));
    if (templatePieces[1] !== "") {
      result.push(templatePieces[1]);
    }
    return result;
  }
  return format;
}
var object = { exports: {} };
var hasRequiredObject;
function requireObject() {
  if (hasRequiredObject) return object.exports;
  hasRequiredObject = 1;
  (function(module) {
    const util = require$$0$1;
    module.exports = {
      serialize,
      maxDepth({ data, transport, depth = transport?.depth ?? 6 }) {
        if (!data) {
          return data;
        }
        if (depth < 1) {
          if (Array.isArray(data)) return "[array]";
          if (typeof data === "object" && data) return "[object]";
          return data;
        }
        if (Array.isArray(data)) {
          return data.map((child) => module.exports.maxDepth({
            data: child,
            depth: depth - 1
          }));
        }
        if (typeof data !== "object") {
          return data;
        }
        if (data && typeof data.toISOString === "function") {
          return data;
        }
        if (data === null) {
          return null;
        }
        if (data instanceof Error) {
          return data;
        }
        const newJson = {};
        for (const i in data) {
          if (!Object.prototype.hasOwnProperty.call(data, i)) continue;
          newJson[i] = module.exports.maxDepth({
            data: data[i],
            depth: depth - 1
          });
        }
        return newJson;
      },
      toJSON({ data }) {
        return JSON.parse(JSON.stringify(data, createSerializer()));
      },
      toString({ data, transport }) {
        const inspectOptions = transport?.inspectOptions || {};
        const simplifiedData = data.map((item) => {
          if (item === void 0) {
            return void 0;
          }
          try {
            const str = JSON.stringify(item, createSerializer(), "  ");
            return str === void 0 ? void 0 : JSON.parse(str);
          } catch (e) {
            return item;
          }
        });
        return util.formatWithOptions(inspectOptions, ...simplifiedData);
      }
    };
    function createSerializer(options = {}) {
      const seen = /* @__PURE__ */ new WeakSet();
      return function(key, value) {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return void 0;
          }
          seen.add(value);
        }
        return serialize(key, value, options);
      };
    }
    function serialize(key, value, options = {}) {
      const serializeMapAndSet = options?.serializeMapAndSet !== false;
      if (value instanceof Error) {
        return value.stack;
      }
      if (!value) {
        return value;
      }
      if (typeof value === "function") {
        return `[function] ${value.toString()}`;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (serializeMapAndSet && value instanceof Map && Object.fromEntries) {
        return Object.fromEntries(value);
      }
      if (serializeMapAndSet && value instanceof Set && Array.from) {
        return Array.from(value);
      }
      return value;
    }
  })(object);
  return object.exports;
}
var style;
var hasRequiredStyle;
function requireStyle() {
  if (hasRequiredStyle) return style;
  hasRequiredStyle = 1;
  style = {
    transformStyles,
    applyAnsiStyles({ data }) {
      return transformStyles(data, styleToAnsi, resetAnsiStyle);
    },
    removeStyles({ data }) {
      return transformStyles(data, () => "");
    }
  };
  const ANSI_COLORS = {
    unset: "\x1B[0m",
    black: "\x1B[30m",
    red: "\x1B[31m",
    green: "\x1B[32m",
    yellow: "\x1B[33m",
    blue: "\x1B[34m",
    magenta: "\x1B[35m",
    cyan: "\x1B[36m",
    white: "\x1B[37m",
    gray: "\x1B[90m"
  };
  function styleToAnsi(style2) {
    const color = style2.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
    return ANSI_COLORS[color] || "";
  }
  function resetAnsiStyle(string) {
    return string + ANSI_COLORS.unset;
  }
  function transformStyles(data, onStyleFound, onStyleApplied) {
    const foundStyles = {};
    return data.reduce((result, item, index, array) => {
      if (foundStyles[index]) {
        return result;
      }
      if (typeof item === "string") {
        let valueIndex = index;
        let styleApplied = false;
        item = item.replace(/%[1cdfiOos]/g, (match) => {
          valueIndex += 1;
          if (match !== "%c") {
            return match;
          }
          const style2 = array[valueIndex];
          if (typeof style2 === "string") {
            foundStyles[valueIndex] = true;
            styleApplied = true;
            return onStyleFound(style2, item);
          }
          return match;
        });
        if (styleApplied && onStyleApplied) {
          item = onStyleApplied(item);
        }
      }
      result.push(item);
      return result;
    }, []);
  }
  return style;
}
var console_1;
var hasRequiredConsole;
function requireConsole() {
  if (hasRequiredConsole) return console_1;
  hasRequiredConsole = 1;
  const {
    concatFirstStringElements,
    format: format2
  } = requireFormat();
  const { maxDepth, toJSON } = requireObject();
  const {
    applyAnsiStyles,
    removeStyles
  } = requireStyle();
  const { transform } = requireTransform();
  const consoleMethods = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  console_1 = consoleTransportFactory;
  const separator = process.platform === "win32" ? ">" : "›";
  const DEFAULT_FORMAT = `%c{h}:{i}:{s}.{ms}{scope}%c ${separator} {text}`;
  Object.assign(consoleTransportFactory, {
    DEFAULT_FORMAT
  });
  function consoleTransportFactory(logger) {
    return Object.assign(transport, {
      colorMap: {
        error: "red",
        warn: "yellow",
        info: "cyan",
        verbose: "unset",
        debug: "gray",
        silly: "gray",
        default: "unset"
      },
      format: DEFAULT_FORMAT,
      level: "silly",
      transforms: [
        addTemplateColors,
        format2,
        formatStyles,
        concatFirstStringElements,
        maxDepth,
        toJSON
      ],
      useStyles: process.env.FORCE_STYLES,
      writeFn({ message }) {
        const consoleLogFn = consoleMethods[message.level] || consoleMethods.info;
        consoleLogFn(...message.data);
      }
    });
    function transport(message) {
      const data = transform({ logger, message, transport });
      transport.writeFn({
        message: { ...message, data }
      });
    }
  }
  function addTemplateColors({ data, message, transport }) {
    if (typeof transport.format !== "string" || !transport.format.includes("%c")) {
      return data;
    }
    return [
      `color:${levelToStyle(message.level, transport)}`,
      "color:unset",
      ...data
    ];
  }
  function canUseStyles(useStyleValue, level) {
    if (typeof useStyleValue === "boolean") {
      return useStyleValue;
    }
    const useStderr = level === "error" || level === "warn";
    const stream = useStderr ? process.stderr : process.stdout;
    return stream && stream.isTTY;
  }
  function formatStyles(args) {
    const { message, transport } = args;
    const useStyles = canUseStyles(transport.useStyles, message.level);
    const nextTransform = useStyles ? applyAnsiStyles : removeStyles;
    return nextTransform(args);
  }
  function levelToStyle(level, transport) {
    return transport.colorMap[level] || transport.colorMap.default;
  }
  return console_1;
}
var File_1;
var hasRequiredFile$1;
function requireFile$1() {
  if (hasRequiredFile$1) return File_1;
  hasRequiredFile$1 = 1;
  const EventEmitter = require$$0$2;
  const fs$1 = fs;
  const os = require$$1;
  class File extends EventEmitter {
    asyncWriteQueue = [];
    bytesWritten = 0;
    hasActiveAsyncWriting = false;
    path = null;
    initialSize = void 0;
    writeOptions = null;
    writeAsync = false;
    constructor({
      path: path2,
      writeOptions = { encoding: "utf8", flag: "a", mode: 438 },
      writeAsync = false
    }) {
      super();
      this.path = path2;
      this.writeOptions = writeOptions;
      this.writeAsync = writeAsync;
    }
    get size() {
      return this.getSize();
    }
    clear() {
      try {
        fs$1.writeFileSync(this.path, "", {
          mode: this.writeOptions.mode,
          flag: "w"
        });
        this.reset();
        return true;
      } catch (e) {
        if (e.code === "ENOENT") {
          return true;
        }
        this.emit("error", e, this);
        return false;
      }
    }
    crop(bytesAfter) {
      try {
        const content = readFileSyncFromEnd(this.path, bytesAfter || 4096);
        this.clear();
        this.writeLine(`[log cropped]${os.EOL}${content}`);
      } catch (e) {
        this.emit(
          "error",
          new Error(`Couldn't crop file ${this.path}. ${e.message}`),
          this
        );
      }
    }
    getSize() {
      if (this.initialSize === void 0) {
        try {
          const stats = fs$1.statSync(this.path);
          this.initialSize = stats.size;
        } catch (e) {
          this.initialSize = 0;
        }
      }
      return this.initialSize + this.bytesWritten;
    }
    increaseBytesWrittenCounter(text) {
      this.bytesWritten += Buffer.byteLength(text, this.writeOptions.encoding);
    }
    isNull() {
      return false;
    }
    nextAsyncWrite() {
      const file2 = this;
      if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0) {
        return;
      }
      const text = this.asyncWriteQueue.join("");
      this.asyncWriteQueue = [];
      this.hasActiveAsyncWriting = true;
      fs$1.writeFile(this.path, text, this.writeOptions, (e) => {
        file2.hasActiveAsyncWriting = false;
        if (e) {
          file2.emit(
            "error",
            new Error(`Couldn't write to ${file2.path}. ${e.message}`),
            this
          );
        } else {
          file2.increaseBytesWrittenCounter(text);
        }
        file2.nextAsyncWrite();
      });
    }
    reset() {
      this.initialSize = void 0;
      this.bytesWritten = 0;
    }
    toString() {
      return this.path;
    }
    writeLine(text) {
      text += os.EOL;
      if (this.writeAsync) {
        this.asyncWriteQueue.push(text);
        this.nextAsyncWrite();
        return;
      }
      try {
        fs$1.writeFileSync(this.path, text, this.writeOptions);
        this.increaseBytesWrittenCounter(text);
      } catch (e) {
        this.emit(
          "error",
          new Error(`Couldn't write to ${this.path}. ${e.message}`),
          this
        );
      }
    }
  }
  File_1 = File;
  function readFileSyncFromEnd(filePath, bytesCount) {
    const buffer = Buffer.alloc(bytesCount);
    const stats = fs$1.statSync(filePath);
    const readLength = Math.min(stats.size, bytesCount);
    const offset = Math.max(0, stats.size - bytesCount);
    const fd = fs$1.openSync(filePath, "r");
    const totalBytes = fs$1.readSync(fd, buffer, 0, readLength, offset);
    fs$1.closeSync(fd);
    return buffer.toString("utf8", 0, totalBytes);
  }
  return File_1;
}
var NullFile_1;
var hasRequiredNullFile;
function requireNullFile() {
  if (hasRequiredNullFile) return NullFile_1;
  hasRequiredNullFile = 1;
  const File = requireFile$1();
  class NullFile extends File {
    clear() {
    }
    crop() {
    }
    getSize() {
      return 0;
    }
    isNull() {
      return true;
    }
    writeLine() {
    }
  }
  NullFile_1 = NullFile;
  return NullFile_1;
}
var FileRegistry_1;
var hasRequiredFileRegistry;
function requireFileRegistry() {
  if (hasRequiredFileRegistry) return FileRegistry_1;
  hasRequiredFileRegistry = 1;
  const EventEmitter = require$$0$2;
  const fs$1 = fs;
  const path$1 = path;
  const File = requireFile$1();
  const NullFile = requireNullFile();
  class FileRegistry extends EventEmitter {
    store = {};
    constructor() {
      super();
      this.emitError = this.emitError.bind(this);
    }
    /**
     * Provide a File object corresponding to the filePath
     * @param {string} filePath
     * @param {WriteOptions} [writeOptions]
     * @param {boolean} [writeAsync]
     * @return {File}
     */
    provide({ filePath, writeOptions = {}, writeAsync = false }) {
      let file2;
      try {
        filePath = path$1.resolve(filePath);
        if (this.store[filePath]) {
          return this.store[filePath];
        }
        file2 = this.createFile({ filePath, writeOptions, writeAsync });
      } catch (e) {
        file2 = new NullFile({ path: filePath });
        this.emitError(e, file2);
      }
      file2.on("error", this.emitError);
      this.store[filePath] = file2;
      return file2;
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @param {boolean} async
     * @return {File}
     * @private
     */
    createFile({ filePath, writeOptions, writeAsync }) {
      this.testFileWriting({ filePath, writeOptions });
      return new File({ path: filePath, writeOptions, writeAsync });
    }
    /**
     * @param {Error} error
     * @param {File} file
     * @private
     */
    emitError(error, file2) {
      this.emit("error", error, file2);
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @private
     */
    testFileWriting({ filePath, writeOptions }) {
      fs$1.mkdirSync(path$1.dirname(filePath), { recursive: true });
      fs$1.writeFileSync(filePath, "", { flag: "a", mode: writeOptions.mode });
    }
  }
  FileRegistry_1 = FileRegistry;
  return FileRegistry_1;
}
var file;
var hasRequiredFile;
function requireFile() {
  if (hasRequiredFile) return file;
  hasRequiredFile = 1;
  const fs$1 = fs;
  const os = require$$1;
  const path$1 = path;
  const FileRegistry = requireFileRegistry();
  const { transform } = requireTransform();
  const { removeStyles } = requireStyle();
  const {
    format: format2,
    concatFirstStringElements
  } = requireFormat();
  const { toString } = requireObject();
  file = fileTransportFactory;
  const globalRegistry = new FileRegistry();
  function fileTransportFactory(logger, { registry = globalRegistry, externalApi } = {}) {
    let pathVariables;
    if (registry.listenerCount("error") < 1) {
      registry.on("error", (e, file2) => {
        logConsole(`Can't write to ${file2}`, e);
      });
    }
    return Object.assign(transport, {
      fileName: getDefaultFileName(logger.variables.processType),
      format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
      getFile,
      inspectOptions: { depth: 5 },
      level: "silly",
      maxSize: 1024 ** 2,
      readAllLogs,
      sync: true,
      transforms: [removeStyles, format2, concatFirstStringElements, toString],
      writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
      archiveLogFn(file2) {
        const oldPath = file2.toString();
        const inf = path$1.parse(oldPath);
        try {
          fs$1.renameSync(oldPath, path$1.join(inf.dir, `${inf.name}.old${inf.ext}`));
        } catch (e) {
          logConsole("Could not rotate log", e);
          const quarterOfMaxSize = Math.round(transport.maxSize / 4);
          file2.crop(Math.min(quarterOfMaxSize, 256 * 1024));
        }
      },
      resolvePathFn(vars) {
        return path$1.join(vars.libraryDefaultDir, vars.fileName);
      },
      setAppName(name) {
        logger.dependencies.externalApi.setAppName(name);
      }
    });
    function transport(message) {
      const file2 = getFile(message);
      const needLogRotation = transport.maxSize > 0 && file2.size > transport.maxSize;
      if (needLogRotation) {
        transport.archiveLogFn(file2);
        file2.reset();
      }
      const content = transform({ logger, message, transport });
      file2.writeLine(content);
    }
    function initializeOnFirstAccess() {
      if (pathVariables) {
        return;
      }
      pathVariables = Object.create(
        Object.prototype,
        {
          ...Object.getOwnPropertyDescriptors(
            externalApi.getPathVariables()
          ),
          fileName: {
            get() {
              return transport.fileName;
            },
            enumerable: true
          }
        }
      );
      if (typeof transport.archiveLog === "function") {
        transport.archiveLogFn = transport.archiveLog;
        logConsole("archiveLog is deprecated. Use archiveLogFn instead");
      }
      if (typeof transport.resolvePath === "function") {
        transport.resolvePathFn = transport.resolvePath;
        logConsole("resolvePath is deprecated. Use resolvePathFn instead");
      }
    }
    function logConsole(message, error = null, level = "error") {
      const data = [`electron-log.transports.file: ${message}`];
      if (error) {
        data.push(error);
      }
      logger.transports.console({ data, date: /* @__PURE__ */ new Date(), level });
    }
    function getFile(msg) {
      initializeOnFirstAccess();
      const filePath = transport.resolvePathFn(pathVariables, msg);
      return registry.provide({
        filePath,
        writeAsync: !transport.sync,
        writeOptions: transport.writeOptions
      });
    }
    function readAllLogs({ fileFilter = (f) => f.endsWith(".log") } = {}) {
      initializeOnFirstAccess();
      const logsPath = path$1.dirname(transport.resolvePathFn(pathVariables));
      if (!fs$1.existsSync(logsPath)) {
        return [];
      }
      return fs$1.readdirSync(logsPath).map((fileName) => path$1.join(logsPath, fileName)).filter(fileFilter).map((logPath) => {
        try {
          return {
            path: logPath,
            lines: fs$1.readFileSync(logPath, "utf8").split(os.EOL)
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
    }
  }
  function getDefaultFileName(processType = process.type) {
    switch (processType) {
      case "renderer":
        return "renderer.log";
      case "worker":
        return "worker.log";
      default:
        return "main.log";
    }
  }
  return file;
}
var ipc;
var hasRequiredIpc;
function requireIpc() {
  if (hasRequiredIpc) return ipc;
  hasRequiredIpc = 1;
  const { maxDepth, toJSON } = requireObject();
  const { transform } = requireTransform();
  ipc = ipcTransportFactory;
  function ipcTransportFactory(logger, { externalApi }) {
    Object.assign(transport, {
      depth: 3,
      eventId: "__ELECTRON_LOG_IPC__",
      level: logger.isDev ? "silly" : false,
      transforms: [toJSON, maxDepth]
    });
    return externalApi?.isElectron() ? transport : void 0;
    function transport(message) {
      if (message?.variables?.processType === "renderer") {
        return;
      }
      externalApi?.sendIpc(transport.eventId, {
        ...message,
        data: transform({ logger, message, transport })
      });
    }
  }
  return ipc;
}
var remote;
var hasRequiredRemote;
function requireRemote() {
  if (hasRequiredRemote) return remote;
  hasRequiredRemote = 1;
  const http$1 = http;
  const https = require$$1$1;
  const { transform } = requireTransform();
  const { removeStyles } = requireStyle();
  const { toJSON, maxDepth } = requireObject();
  remote = remoteTransportFactory;
  function remoteTransportFactory(logger) {
    return Object.assign(transport, {
      client: { name: "electron-application" },
      depth: 6,
      level: false,
      requestOptions: {},
      transforms: [removeStyles, toJSON, maxDepth],
      makeBodyFn({ message }) {
        return JSON.stringify({
          client: transport.client,
          data: message.data,
          date: message.date.getTime(),
          level: message.level,
          scope: message.scope,
          variables: message.variables
        });
      },
      processErrorFn({ error }) {
        logger.processMessage(
          {
            data: [`electron-log: can't POST ${transport.url}`, error],
            level: "warn"
          },
          { transports: ["console", "file"] }
        );
      },
      sendRequestFn({ serverUrl, requestOptions, body }) {
        const httpTransport = serverUrl.startsWith("https:") ? https : http$1;
        const request = httpTransport.request(serverUrl, {
          method: "POST",
          ...requestOptions,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": body.length,
            ...requestOptions.headers
          }
        });
        request.write(body);
        request.end();
        return request;
      }
    });
    function transport(message) {
      if (!transport.url) {
        return;
      }
      const body = transport.makeBodyFn({
        logger,
        message: { ...message, data: transform({ logger, message, transport }) },
        transport
      });
      const request = transport.sendRequestFn({
        serverUrl: transport.url,
        requestOptions: transport.requestOptions,
        body: Buffer.from(body, "utf8")
      });
      request.on("error", (error) => transport.processErrorFn({
        error,
        logger,
        message,
        request,
        transport
      }));
    }
  }
  return remote;
}
var createDefaultLogger_1;
var hasRequiredCreateDefaultLogger;
function requireCreateDefaultLogger() {
  if (hasRequiredCreateDefaultLogger) return createDefaultLogger_1;
  hasRequiredCreateDefaultLogger = 1;
  const Logger = requireLogger();
  const ErrorHandler = requireErrorHandler();
  const EventLogger = requireEventLogger();
  const transportConsole = requireConsole();
  const transportFile = requireFile();
  const transportIpc = requireIpc();
  const transportRemote = requireRemote();
  createDefaultLogger_1 = createDefaultLogger;
  function createDefaultLogger({ dependencies, initializeFn }) {
    const defaultLogger = new Logger({
      dependencies,
      errorHandler: new ErrorHandler(),
      eventLogger: new EventLogger(),
      initializeFn,
      isDev: dependencies.externalApi?.isDev(),
      logId: "default",
      transportFactories: {
        console: transportConsole,
        file: transportFile,
        ipc: transportIpc,
        remote: transportRemote
      },
      variables: {
        processType: "main"
      }
    });
    defaultLogger.default = defaultLogger;
    defaultLogger.Logger = Logger;
    defaultLogger.processInternalErrorFn = (e) => {
      defaultLogger.transports.console.writeFn({
        message: {
          data: ["Unhandled electron-log error", e],
          level: "error"
        }
      });
    };
    return defaultLogger;
  }
  return createDefaultLogger_1;
}
var main;
var hasRequiredMain;
function requireMain() {
  if (hasRequiredMain) return main;
  hasRequiredMain = 1;
  const electron = require$$0$3;
  const ElectronExternalApi = requireElectronExternalApi();
  const { initialize: initialize2 } = requireInitialize();
  const createDefaultLogger = requireCreateDefaultLogger();
  const externalApi = new ElectronExternalApi({ electron });
  const defaultLogger = createDefaultLogger({
    dependencies: { externalApi },
    initializeFn: initialize2
  });
  main = defaultLogger;
  externalApi.onIpc("__ELECTRON_LOG__", (_, message) => {
    if (message.scope) {
      defaultLogger.Logger.getInstance(message).scope(message.scope);
    }
    const date = new Date(message.date);
    processMessage({
      ...message,
      date: date.getTime() ? date : /* @__PURE__ */ new Date()
    });
  });
  externalApi.onIpcInvoke("__ELECTRON_LOG__", (_, { cmd = "", logId }) => {
    switch (cmd) {
      case "getOptions": {
        const logger = defaultLogger.Logger.getInstance({ logId });
        return {
          levels: logger.levels,
          logId
        };
      }
      default: {
        processMessage({ data: [`Unknown cmd '${cmd}'`], level: "error" });
        return {};
      }
    }
  });
  function processMessage(message) {
    defaultLogger.Logger.getInstance(message)?.processMessage(message);
  }
  return main;
}
var node;
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node;
  hasRequiredNode = 1;
  const NodeExternalApi = requireNodeExternalApi();
  const createDefaultLogger = requireCreateDefaultLogger();
  const externalApi = new NodeExternalApi();
  const defaultLogger = createDefaultLogger({
    dependencies: { externalApi }
  });
  node = defaultLogger;
  return node;
}
const isRenderer = typeof process === "undefined" || (process.type === "renderer" || process.type === "worker");
const isMain = typeof process === "object" && process.type === "browser";
if (isRenderer) {
  requireElectronLogPreload();
  src.exports = requireRenderer();
} else if (isMain) {
  src.exports = requireMain();
} else {
  src.exports = requireNode();
}
var srcExports = src.exports;
const log = /* @__PURE__ */ getDefaultExportFromCjs(srcExports);
const DEFAULT_LINE_PARSING_CONFIG = {
  delimiter: "\n",
  encoding: "utf-8",
  includeDelimiter: false,
  maxBufferSize: 1024 * 1024
  // 1MB
};
class BaseConnectionManager {
  // 共同属性
  connections = /* @__PURE__ */ new Map();
  dataCallbacks = [];
  rawDataCallbacks = [];
  statusCallbacks = [];
  // 行解析相关属性
  lineParsingConfig = DEFAULT_LINE_PARSING_CONFIG;
  lineBuffers = /* @__PURE__ */ new Map();
  lineParsingPaused = /* @__PURE__ */ new Set();
  // 公共API方法
  /**
   * 建立连接
   * @param config 连接配置
   * @returns 连接ID
   */
  async connect(config) {
    const connectionId = this.generateConnectionId(config);
    if (this.connections.has(connectionId)) {
      throw new Error(`Connection ${connectionId} already exists`);
    }
    try {
      const connection = await this.createConnection(config);
      this.connections.set(connectionId, connection);
      if (this.setupConnectionListeners) {
        this.setupConnectionListeners(connectionId, connection);
      }
      if (this.onConnectionCreated) {
        this.onConnectionCreated(connectionId, connection);
      }
      this.notifyStatus(connectionId, "connected", `Connected to ${connectionId}`);
      return connectionId;
    } catch (error) {
      this.notifyStatus(connectionId, "error", error.message);
      throw error;
    }
  }
  /**
   * 断开连接
   * @param id 连接ID
   */
  async disconnect(id) {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection ${id} not found`);
    }
    try {
      if (this.cleanupConnectionListeners) {
        this.cleanupConnectionListeners(id, connection);
      }
      await this.destroyConnection(connection);
      this.connections.delete(id);
      if (this.onConnectionDestroyed) {
        this.onConnectionDestroyed(id);
      }
      this.notifyStatus(id, "disconnected", `Disconnected from ${id}`);
    } catch (error) {
      this.notifyStatus(id, "error", error.message);
      throw error;
    }
  }
  /**
   * 发送数据
   * @param id 连接ID
   * @param data 要发送的数据
   */
  async send(id, data) {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection ${id} not found`);
    }
    try {
      await this.sendToConnection(connection, data);
    } catch (error) {
      this.notifyStatus(id, "error", error.message);
      throw error;
    }
  }
  /**
   * 断开所有连接
   */
  disconnectAll() {
    this.connections.forEach((connection, id) => {
      try {
        if (this.cleanupConnectionListeners) {
          this.cleanupConnectionListeners(id, connection);
        }
        this.destroyConnection(connection).catch(() => {
        });
        if (this.onConnectionDestroyed) {
          this.onConnectionDestroyed(id);
        }
        this.notifyStatus(id, "disconnected", `Disconnected from ${id}`);
      } catch (error) {
      }
    });
    this.connections.clear();
  }
  /**
   * 注册数据接收回调
   * @param callback 回调函数
   */
  onData(callback) {
    this.dataCallbacks.push(callback);
  }
  /**
   * 注册原始数据接收回调，不经过按行缓存。用于 YMODEM 这类二进制协议。
   * @param callback 回调函数
   */
  onRawData(callback) {
    this.rawDataCallbacks.push(callback);
  }
  /**
   * 注册状态变更回调
   * @param callback 回调函数
   */
  onStatus(callback) {
    this.statusCallbacks.push(callback);
  }
  /**
   * 暂停或恢复指定连接的普通行解析。暂停期间 raw data 仍会正常通知。
   * 用于 YMODEM 等二进制传输，避免控制字节污染文本协议缓冲。
   */
  setLineParsingPaused(id, paused) {
    if (paused) {
      this.lineParsingPaused.add(id);
    } else {
      this.lineParsingPaused.delete(id);
    }
    this.lineBuffers.set(id, Buffer.alloc(0));
  }
  // 保护方法
  /**
   * 通知数据接收
   * @param id 连接ID
   * @param data 接收到的数据
   */
  notifyData(id, data) {
    for (const callback of this.dataCallbacks) {
      callback(id, data);
    }
  }
  /**
   * 通知原始数据接收
   * @param id 连接ID
   * @param data 接收到的原始数据
   */
  notifyRawData(id, data) {
    for (const callback of this.rawDataCallbacks) {
      callback(id, data);
    }
  }
  /**
   * 通知状态变更
   * @param id 连接ID
   * @param status 状态
   * @param message 可选消息
   */
  notifyStatus(id, status, message) {
    for (const callback of this.statusCallbacks) {
      callback(id, status, message);
    }
  }
  /**
   * 清理连接资源
   * @param id 连接ID
   */
  cleanupResources(id) {
    this.connections.delete(id);
  }
  // 数据处理方法
  /**
   * 初始化数据处理
   * @param connectionId 连接ID
   */
  setupDataProcessing(connectionId) {
    this.lineBuffers.set(connectionId, Buffer.alloc(0));
  }
  /**
   * 清理数据处理
   * @param connectionId 连接ID
   */
  cleanupDataProcessing(connectionId) {
    this.lineBuffers.delete(connectionId);
    this.lineParsingPaused.delete(connectionId);
  }
  /**
   * 处理原始数据
   * @param connectionId 连接ID
   * @param data 接收到的原始数据
   */
  processRawData(connectionId, data) {
    this.notifyRawData(connectionId, data);
    if (this.lineParsingPaused.has(connectionId)) {
      this.lineBuffers.set(connectionId, Buffer.alloc(0));
      return;
    }
    let buffer = this.lineBuffers.get(connectionId) || Buffer.alloc(0);
    buffer = Buffer.concat([buffer, data]);
    if (buffer.length > this.lineParsingConfig.maxBufferSize) {
      console.warn(`Buffer overflow for connection ${connectionId}, clearing buffer`);
      buffer = Buffer.alloc(0);
    }
    const lines = this.splitLines(buffer, this.lineParsingConfig.delimiter);
    this.lineBuffers.set(connectionId, lines.remaining);
    lines.complete.forEach((line) => {
      this.notifyData(connectionId, line);
    });
  }
  /**
   * 分割缓冲区中的行
   * @param buffer 要分割的缓冲区
   * @param delimiter 分隔符
   * @returns 分割结果
   */
  splitLines(buffer, delimiter) {
    const delimiterBuffer = typeof delimiter === "string" ? Buffer.from(delimiter, this.lineParsingConfig.encoding) : delimiter;
    const complete = [];
    let start = 0;
    while (true) {
      const delimiterIndex = buffer.indexOf(delimiterBuffer, start);
      if (delimiterIndex === -1) {
        break;
      }
      let delimiterLength = delimiterBuffer.length;
      let lineEnd = delimiterIndex;
      if (delimiterBuffer.equals(Buffer.from("\n", this.lineParsingConfig.encoding)) && delimiterIndex > 0 && buffer[delimiterIndex - 1] === Buffer.from("\r", this.lineParsingConfig.encoding)[0]) {
        delimiterLength = 2;
        lineEnd = delimiterIndex - 1;
      }
      const endIndex = this.lineParsingConfig.includeDelimiter ? delimiterIndex + (delimiterBuffer.equals(Buffer.from("\n", this.lineParsingConfig.encoding)) && delimiterLength === 2 ? 2 : delimiterBuffer.length) : lineEnd;
      const line = buffer.subarray(start, endIndex);
      if (line.length > 0) {
        complete.push(line);
      }
      start = delimiterIndex + delimiterLength;
    }
    const remaining = buffer.subarray(start);
    return { complete, remaining };
  }
  /**
   * 设置行解析配置
   * @param config 配置选项
   */
  setLineParsingConfig(config) {
    this.lineParsingConfig = { ...DEFAULT_LINE_PARSING_CONFIG, ...config };
  }
  // 工具方法
  /**
   * 检查连接是否存在
   * @param id 连接ID
   * @returns 是否存在
   */
  hasConnection(id) {
    return this.connections.has(id);
  }
  /**
   * 获取连接数量
   * @returns 连接数量
   */
  getConnectionCount() {
    return this.connections.size;
  }
}
class SerialPortManager extends BaseConnectionManager {
  checkTimers = /* @__PURE__ */ new Map();
  // 抽象方法实现
  async createConnection(config) {
    const port = new serialport.SerialPort({
      path: config.path,
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
      flowControl: config.flowControl === "hardware" ? 1 : config.flowControl === "software" ? 2 : 0,
      autoOpen: false
    });
    return new Promise((resolve, reject) => {
      port.open((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(port);
      });
    });
  }
  async destroyConnection(port) {
    return new Promise((resolve, reject) => {
      port.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async sendToConnection(port, data) {
    return new Promise((resolve, reject) => {
      port.write(data, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  generateConnectionId(config) {
    return config.path;
  }
  // 钩子方法实现
  setupConnectionListeners(portId, port) {
    super.setupDataProcessing(portId);
    port.on("data", (data) => {
      this.processRawData(portId, data);
    });
    port.on("error", (err) => {
      this.notifyStatus(portId, "error", err.message);
    });
    port.on("close", () => {
      this.handlePortClose(portId);
    });
  }
  cleanupConnectionListeners(_portId, _port) {
  }
  onConnectionCreated(portId, port) {
    this.startConnectionCheck(portId);
  }
  onConnectionDestroyed(portId) {
    const timer = this.checkTimers.get(portId);
    if (timer) {
      clearTimeout(timer);
      this.checkTimers.delete(portId);
    }
    super.cleanupDataProcessing(portId);
  }
  // 串口特定方法
  /**
   * 列出可用串口
   */
  async listPorts() {
    const ports = await serialport.SerialPort.list();
    return ports.map((port) => ({
      path: port.path,
      manufacturer: port.manufacturer || void 0,
      serialNumber: port.serialNumber || void 0,
      pnpId: port.pnpId || void 0,
      vendorId: port.vendorId || void 0,
      productId: port.productId || void 0
    }));
  }
  // 私有方法
  handlePortClose(portId) {
    this.disconnect(portId).catch(() => {
    });
  }
  startConnectionCheck(portId) {
    const checkInterval = 2e3;
    const checkPort = async () => {
      const port = this.connections.get(portId);
      if (!port) return;
      try {
        const availablePorts = await serialport.SerialPort.list();
        const portStillExists = availablePorts.some((p) => p.path === portId);
        if (!portStillExists) {
          console.log(`Port ${portId} was physically disconnected`);
          this.disconnect(portId).catch(() => {
          });
          return;
        }
        if (port.isOpen) {
          const timer2 = setTimeout(checkPort, checkInterval);
          this.checkTimers.set(portId, timer2);
        }
      } catch (error) {
        console.error(`Error checking port ${portId}:`, error);
        const timer2 = setTimeout(checkPort, checkInterval);
        this.checkTimers.set(portId, timer2);
      }
    };
    const timer = setTimeout(checkPort, checkInterval);
    this.checkTimers.set(portId, timer);
  }
  // 覆盖 disconnectAll 以清理串口特定资源
  disconnectAll() {
    this.checkTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.checkTimers.clear();
    super.disconnectAll();
  }
}
class TCPManager extends BaseConnectionManager {
  reconnectTimers = /* @__PURE__ */ new Map();
  configs = /* @__PURE__ */ new Map();
  manualDisconnects = /* @__PURE__ */ new Set();
  // 抽象方法实现
  async createConnection(config) {
    const clientId = this.generateConnectionId(config);
    this.clearReconnectTimer(clientId);
    return new Promise((resolve, reject) => {
      const socket = new net__namespace.Socket();
      const timeout = config.timeout || 5e3;
      let connected = false;
      socket.setTimeout(timeout);
      this.configs.set(clientId, config);
      socket.connect(config.port, config.host, () => {
        connected = true;
        socket.setKeepAlive(true, timeout);
        socket.setTimeout(0);
        console.info(`[tcp] connected ${clientId}`, {
          localAddress: socket.localAddress,
          localPort: socket.localPort,
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort
        });
        resolve(socket);
      });
      socket.on("error", (err) => {
        if (!connected) {
          reject(err);
        }
      });
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("Connection timeout"));
      });
    });
  }
  async destroyConnection(socket) {
    return new Promise((resolve) => {
      if (socket.destroyed) {
        resolve();
        return;
      }
      if (socket.listenerCount("error") === 0) {
        socket.on("error", (err) => {
          console.warn(`[tcp] ignored socket error during destroy: ${err.message}`);
        });
      }
      const timer = setTimeout(() => {
        socket.destroy();
        resolve();
      }, 1e3);
      socket.end(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  async sendToConnection(socket, data) {
    return new Promise((resolve, reject) => {
      socket.write(data, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  generateConnectionId(config) {
    return `${config.host}:${config.port}`;
  }
  // 钩子方法实现
  setupConnectionListeners(clientId, socket) {
    super.setupDataProcessing(clientId);
    socket.on("data", (data) => {
      this.processRawData(clientId, data);
    });
    socket.on("error", (err) => {
      const config = this.configs.get(clientId);
      if (config?.reconnect && !this.manualDisconnects.has(clientId)) {
        console.warn(`[tcp] socket error, will reconnect ${clientId}: ${err.message}`);
        this.notifyStatus(clientId, "connecting", err.message);
      } else {
        this.notifyStatus(clientId, "error", err.message);
      }
    });
    socket.on("close", () => {
      this.handleConnectionClose(clientId);
    });
  }
  cleanupConnectionListeners(_clientId, _socket) {
    _socket.removeAllListeners("data");
    _socket.removeAllListeners("error");
    _socket.removeAllListeners("close");
    _socket.on("error", (err) => {
      console.warn(`[tcp] ignored socket error after cleanup ${_clientId}: ${err.message}`);
    });
  }
  onConnectionCreated(_clientId, _socket) {
  }
  onConnectionDestroyed(clientId) {
    const timer = this.reconnectTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(clientId);
    }
    this.configs.delete(clientId);
    this.manualDisconnects.delete(clientId);
    super.cleanupDataProcessing(clientId);
  }
  // 私有方法
  async connect(config) {
    const clientId = this.generateConnectionId(config);
    this.manualDisconnects.delete(clientId);
    this.clearReconnectTimer(clientId);
    if (this.connections.has(clientId)) {
      await this.disconnect(clientId);
      this.manualDisconnects.delete(clientId);
    }
    return super.connect(config);
  }
  async disconnect(clientId) {
    this.manualDisconnects.add(clientId);
    this.clearReconnectTimer(clientId);
    return super.disconnect(clientId);
  }
  handleConnectionClose(clientId) {
    this.cleanupResources(clientId);
    const config = this.configs.get(clientId);
    const isManualDisconnect = this.manualDisconnects.has(clientId);
    if (isManualDisconnect || !config?.reconnect) {
      console.info(`[tcp] disconnected ${clientId}`);
      this.configs.delete(clientId);
      this.manualDisconnects.delete(clientId);
      this.clearReconnectTimer(clientId);
      this.notifyStatus(clientId, "disconnected", `Disconnected from ${clientId}`);
      return;
    }
    console.warn(`[tcp] disconnected unexpectedly, scheduling reconnect ${clientId}`);
    this.notifyStatus(clientId, "connecting", `Reconnecting to ${clientId}...`);
    this.scheduleReconnect(clientId, config);
  }
  clearReconnectTimer(clientId) {
    const timer = this.reconnectTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(clientId);
    }
  }
  async reconnect(clientId, config) {
    if (this.connections.has(clientId) || !this.configs.has(clientId) || this.manualDisconnects.has(clientId)) {
      return;
    }
    try {
      const socket = await this.createConnection(config);
      this.connections.set(clientId, socket);
      this.setupConnectionListeners(clientId, socket);
      this.onConnectionCreated(clientId, socket);
      this.notifyStatus(clientId, "connected", `Connected to ${clientId}`);
    } catch (error) {
      if (this.configs.has(clientId) && !this.manualDisconnects.has(clientId)) {
        console.warn(`[tcp] reconnect failed ${clientId}: ${error.message}`);
        this.notifyStatus(clientId, "connecting", `Reconnecting to ${clientId}...`);
        this.scheduleReconnect(clientId, config);
      }
    }
  }
  scheduleReconnect(clientId, config) {
    this.clearReconnectTimer(clientId);
    const interval = config.reconnectInterval || 3e3;
    const timer = setTimeout(() => {
      void this.reconnect(clientId, config);
    }, interval);
    this.reconnectTimers.set(clientId, timer);
  }
  // 覆盖 disconnectAll 以清理TCP特定资源
  disconnectAll() {
    for (const clientId of Array.from(this.connections.keys())) {
      this.manualDisconnects.add(clientId);
    }
    super.disconnectAll();
    this.reconnectTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.reconnectTimers.clear();
    this.configs.clear();
    this.manualDisconnects.clear();
  }
}
var dayjs_min = { exports: {} };
(function(module, exports$1) {
  !function(t, e) {
    module.exports = e();
  }(commonjsGlobal, function() {
    var t = 1e3, e = 6e4, n = 36e5, r = "millisecond", i = "second", s = "minute", u = "hour", a = "day", o = "week", c = "month", f = "quarter", h = "year", d = "date", l = "Invalid Date", $ = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/, y = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, M = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"), ordinal: function(t2) {
      var e2 = ["th", "st", "nd", "rd"], n2 = t2 % 100;
      return "[" + t2 + (e2[(n2 - 20) % 10] || e2[n2] || e2[0]) + "]";
    } }, m = function(t2, e2, n2) {
      var r2 = String(t2);
      return !r2 || r2.length >= e2 ? t2 : "" + Array(e2 + 1 - r2.length).join(n2) + t2;
    }, v = { s: m, z: function(t2) {
      var e2 = -t2.utcOffset(), n2 = Math.abs(e2), r2 = Math.floor(n2 / 60), i2 = n2 % 60;
      return (e2 <= 0 ? "+" : "-") + m(r2, 2, "0") + ":" + m(i2, 2, "0");
    }, m: function t2(e2, n2) {
      if (e2.date() < n2.date()) return -t2(n2, e2);
      var r2 = 12 * (n2.year() - e2.year()) + (n2.month() - e2.month()), i2 = e2.clone().add(r2, c), s2 = n2 - i2 < 0, u2 = e2.clone().add(r2 + (s2 ? -1 : 1), c);
      return +(-(r2 + (n2 - i2) / (s2 ? i2 - u2 : u2 - i2)) || 0);
    }, a: function(t2) {
      return t2 < 0 ? Math.ceil(t2) || 0 : Math.floor(t2);
    }, p: function(t2) {
      return { M: c, y: h, w: o, d: a, D: d, h: u, m: s, s: i, ms: r, Q: f }[t2] || String(t2 || "").toLowerCase().replace(/s$/, "");
    }, u: function(t2) {
      return void 0 === t2;
    } }, g = "en", D = {};
    D[g] = M;
    var p = "$isDayjsObject", S = function(t2) {
      return t2 instanceof _ || !(!t2 || !t2[p]);
    }, w = function t2(e2, n2, r2) {
      var i2;
      if (!e2) return g;
      if ("string" == typeof e2) {
        var s2 = e2.toLowerCase();
        D[s2] && (i2 = s2), n2 && (D[s2] = n2, i2 = s2);
        var u2 = e2.split("-");
        if (!i2 && u2.length > 1) return t2(u2[0]);
      } else {
        var a2 = e2.name;
        D[a2] = e2, i2 = a2;
      }
      return !r2 && i2 && (g = i2), i2 || !r2 && g;
    }, O = function(t2, e2) {
      if (S(t2)) return t2.clone();
      var n2 = "object" == typeof e2 ? e2 : {};
      return n2.date = t2, n2.args = arguments, new _(n2);
    }, b = v;
    b.l = w, b.i = S, b.w = function(t2, e2) {
      return O(t2, { locale: e2.$L, utc: e2.$u, x: e2.$x, $offset: e2.$offset });
    };
    var _ = function() {
      function M2(t2) {
        this.$L = w(t2.locale, null, true), this.parse(t2), this.$x = this.$x || t2.x || {}, this[p] = true;
      }
      var m2 = M2.prototype;
      return m2.parse = function(t2) {
        this.$d = function(t3) {
          var e2 = t3.date, n2 = t3.utc;
          if (null === e2) return /* @__PURE__ */ new Date(NaN);
          if (b.u(e2)) return /* @__PURE__ */ new Date();
          if (e2 instanceof Date) return new Date(e2);
          if ("string" == typeof e2 && !/Z$/i.test(e2)) {
            var r2 = e2.match($);
            if (r2) {
              var i2 = r2[2] - 1 || 0, s2 = (r2[7] || "0").substring(0, 3);
              return n2 ? new Date(Date.UTC(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2)) : new Date(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2);
            }
          }
          return new Date(e2);
        }(t2), this.init();
      }, m2.init = function() {
        var t2 = this.$d;
        this.$y = t2.getFullYear(), this.$M = t2.getMonth(), this.$D = t2.getDate(), this.$W = t2.getDay(), this.$H = t2.getHours(), this.$m = t2.getMinutes(), this.$s = t2.getSeconds(), this.$ms = t2.getMilliseconds();
      }, m2.$utils = function() {
        return b;
      }, m2.isValid = function() {
        return !(this.$d.toString() === l);
      }, m2.isSame = function(t2, e2) {
        var n2 = O(t2);
        return this.startOf(e2) <= n2 && n2 <= this.endOf(e2);
      }, m2.isAfter = function(t2, e2) {
        return O(t2) < this.startOf(e2);
      }, m2.isBefore = function(t2, e2) {
        return this.endOf(e2) < O(t2);
      }, m2.$g = function(t2, e2, n2) {
        return b.u(t2) ? this[e2] : this.set(n2, t2);
      }, m2.unix = function() {
        return Math.floor(this.valueOf() / 1e3);
      }, m2.valueOf = function() {
        return this.$d.getTime();
      }, m2.startOf = function(t2, e2) {
        var n2 = this, r2 = !!b.u(e2) || e2, f2 = b.p(t2), l2 = function(t3, e3) {
          var i2 = b.w(n2.$u ? Date.UTC(n2.$y, e3, t3) : new Date(n2.$y, e3, t3), n2);
          return r2 ? i2 : i2.endOf(a);
        }, $2 = function(t3, e3) {
          return b.w(n2.toDate()[t3].apply(n2.toDate("s"), (r2 ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(e3)), n2);
        }, y2 = this.$W, M3 = this.$M, m3 = this.$D, v2 = "set" + (this.$u ? "UTC" : "");
        switch (f2) {
          case h:
            return r2 ? l2(1, 0) : l2(31, 11);
          case c:
            return r2 ? l2(1, M3) : l2(0, M3 + 1);
          case o:
            var g2 = this.$locale().weekStart || 0, D2 = (y2 < g2 ? y2 + 7 : y2) - g2;
            return l2(r2 ? m3 - D2 : m3 + (6 - D2), M3);
          case a:
          case d:
            return $2(v2 + "Hours", 0);
          case u:
            return $2(v2 + "Minutes", 1);
          case s:
            return $2(v2 + "Seconds", 2);
          case i:
            return $2(v2 + "Milliseconds", 3);
          default:
            return this.clone();
        }
      }, m2.endOf = function(t2) {
        return this.startOf(t2, false);
      }, m2.$set = function(t2, e2) {
        var n2, o2 = b.p(t2), f2 = "set" + (this.$u ? "UTC" : ""), l2 = (n2 = {}, n2[a] = f2 + "Date", n2[d] = f2 + "Date", n2[c] = f2 + "Month", n2[h] = f2 + "FullYear", n2[u] = f2 + "Hours", n2[s] = f2 + "Minutes", n2[i] = f2 + "Seconds", n2[r] = f2 + "Milliseconds", n2)[o2], $2 = o2 === a ? this.$D + (e2 - this.$W) : e2;
        if (o2 === c || o2 === h) {
          var y2 = this.clone().set(d, 1);
          y2.$d[l2]($2), y2.init(), this.$d = y2.set(d, Math.min(this.$D, y2.daysInMonth())).$d;
        } else l2 && this.$d[l2]($2);
        return this.init(), this;
      }, m2.set = function(t2, e2) {
        return this.clone().$set(t2, e2);
      }, m2.get = function(t2) {
        return this[b.p(t2)]();
      }, m2.add = function(r2, f2) {
        var d2, l2 = this;
        r2 = Number(r2);
        var $2 = b.p(f2), y2 = function(t2) {
          var e2 = O(l2);
          return b.w(e2.date(e2.date() + Math.round(t2 * r2)), l2);
        };
        if ($2 === c) return this.set(c, this.$M + r2);
        if ($2 === h) return this.set(h, this.$y + r2);
        if ($2 === a) return y2(1);
        if ($2 === o) return y2(7);
        var M3 = (d2 = {}, d2[s] = e, d2[u] = n, d2[i] = t, d2)[$2] || 1, m3 = this.$d.getTime() + r2 * M3;
        return b.w(m3, this);
      }, m2.subtract = function(t2, e2) {
        return this.add(-1 * t2, e2);
      }, m2.format = function(t2) {
        var e2 = this, n2 = this.$locale();
        if (!this.isValid()) return n2.invalidDate || l;
        var r2 = t2 || "YYYY-MM-DDTHH:mm:ssZ", i2 = b.z(this), s2 = this.$H, u2 = this.$m, a2 = this.$M, o2 = n2.weekdays, c2 = n2.months, f2 = n2.meridiem, h2 = function(t3, n3, i3, s3) {
          return t3 && (t3[n3] || t3(e2, r2)) || i3[n3].slice(0, s3);
        }, d2 = function(t3) {
          return b.s(s2 % 12 || 12, t3, "0");
        }, $2 = f2 || function(t3, e3, n3) {
          var r3 = t3 < 12 ? "AM" : "PM";
          return n3 ? r3.toLowerCase() : r3;
        };
        return r2.replace(y, function(t3, r3) {
          return r3 || function(t4) {
            switch (t4) {
              case "YY":
                return String(e2.$y).slice(-2);
              case "YYYY":
                return b.s(e2.$y, 4, "0");
              case "M":
                return a2 + 1;
              case "MM":
                return b.s(a2 + 1, 2, "0");
              case "MMM":
                return h2(n2.monthsShort, a2, c2, 3);
              case "MMMM":
                return h2(c2, a2);
              case "D":
                return e2.$D;
              case "DD":
                return b.s(e2.$D, 2, "0");
              case "d":
                return String(e2.$W);
              case "dd":
                return h2(n2.weekdaysMin, e2.$W, o2, 2);
              case "ddd":
                return h2(n2.weekdaysShort, e2.$W, o2, 3);
              case "dddd":
                return o2[e2.$W];
              case "H":
                return String(s2);
              case "HH":
                return b.s(s2, 2, "0");
              case "h":
                return d2(1);
              case "hh":
                return d2(2);
              case "a":
                return $2(s2, u2, true);
              case "A":
                return $2(s2, u2, false);
              case "m":
                return String(u2);
              case "mm":
                return b.s(u2, 2, "0");
              case "s":
                return String(e2.$s);
              case "ss":
                return b.s(e2.$s, 2, "0");
              case "SSS":
                return b.s(e2.$ms, 3, "0");
              case "Z":
                return i2;
            }
            return null;
          }(t3) || i2.replace(":", "");
        });
      }, m2.utcOffset = function() {
        return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
      }, m2.diff = function(r2, d2, l2) {
        var $2, y2 = this, M3 = b.p(d2), m3 = O(r2), v2 = (m3.utcOffset() - this.utcOffset()) * e, g2 = this - m3, D2 = function() {
          return b.m(y2, m3);
        };
        switch (M3) {
          case h:
            $2 = D2() / 12;
            break;
          case c:
            $2 = D2();
            break;
          case f:
            $2 = D2() / 3;
            break;
          case o:
            $2 = (g2 - v2) / 6048e5;
            break;
          case a:
            $2 = (g2 - v2) / 864e5;
            break;
          case u:
            $2 = g2 / n;
            break;
          case s:
            $2 = g2 / e;
            break;
          case i:
            $2 = g2 / t;
            break;
          default:
            $2 = g2;
        }
        return l2 ? $2 : b.a($2);
      }, m2.daysInMonth = function() {
        return this.endOf(c).$D;
      }, m2.$locale = function() {
        return D[this.$L];
      }, m2.locale = function(t2, e2) {
        if (!t2) return this.$L;
        var n2 = this.clone(), r2 = w(t2, e2, true);
        return r2 && (n2.$L = r2), n2;
      }, m2.clone = function() {
        return b.w(this.$d, this);
      }, m2.toDate = function() {
        return new Date(this.valueOf());
      }, m2.toJSON = function() {
        return this.isValid() ? this.toISOString() : null;
      }, m2.toISOString = function() {
        return this.$d.toISOString();
      }, m2.toString = function() {
        return this.$d.toUTCString();
      }, M2;
    }(), k = _.prototype;
    return O.prototype = k, [["$ms", r], ["$s", i], ["$m", s], ["$H", u], ["$W", a], ["$M", c], ["$y", h], ["$D", d]].forEach(function(t2) {
      k[t2[1]] = function(e2) {
        return this.$g(e2, t2[0], t2[1]);
      };
    }), O.extend = function(t2, e2) {
      return t2.$i || (t2(e2, _, O), t2.$i = true), O;
    }, O.locale = w, O.isDayjs = S, O.unix = function(t2) {
      return O(1e3 * t2);
    }, O.en = D[g], O.Ls = D, O.p = {}, O;
  });
})(dayjs_min);
var dayjs_minExports = dayjs_min.exports;
const dayjs = /* @__PURE__ */ getDefaultExportFromCjs(dayjs_minExports);
class LogManager {
  logPath = null;
  currentLogFile;
  pendingLines = [];
  flushTimer = null;
  isFlushing = false;
  constructor() {
    this.currentLogFile = this.getLogFileName();
    this.setupLogRotation();
  }
  ensureLogDirectory() {
    if (!this.logPath) return;
    if (!fs__namespace.existsSync(this.logPath)) {
      fs__namespace.mkdirSync(this.logPath, { recursive: true });
    }
  }
  // Initialize after app is ready
  initialize() {
    this.logPath = path__namespace.join(require$$0$3.app.getPath("userData"), "logs");
    this.ensureLogDirectory();
  }
  getLogFileName() {
    return dayjs().format("YYYY-MM-DD") + ".log";
  }
  setupLogRotation() {
    log.transports.file.resolvePathFn = () => {
      return path__namespace.join(this.logPath, this.getLogFileName());
    };
    log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] {text}";
  }
  logData(direction, data, connection) {
    if (!this.logPath) return;
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: data.toString("hex"),
      size: data.length
    };
    const logLine = `${entry.timestamp} | ${direction.toUpperCase().padEnd(6)} | ${connection.padEnd(20)} | ${entry.data}
`;
    this.pendingLines.push(logLine);
    this.scheduleFlush();
  }
  scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushPendingLines();
    }, 250);
  }
  async flushPendingLines() {
    if (!this.logPath || this.isFlushing || this.pendingLines.length === 0) return;
    this.isFlushing = true;
    const lines = this.pendingLines.splice(0);
    const logFile = path__namespace.join(this.logPath, this.getLogFileName());
    try {
      await fs__namespace.promises.appendFile(logFile, lines.join(""));
    } catch (err) {
      console.error("Failed to write log:", err);
    } finally {
      this.isFlushing = false;
      if (this.pendingLines.length > 0) this.scheduleFlush();
    }
  }
  flush() {
    if (!this.logPath || this.pendingLines.length === 0) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const lines = this.pendingLines.splice(0);
    const logFile = path__namespace.join(this.logPath, this.getLogFileName());
    try {
      fs__namespace.appendFileSync(logFile, lines.join(""));
    } catch (err) {
      console.error("Failed to write log:", err);
    }
  }
  async exportLog(options) {
    const startDate = options.startDate ? dayjs(options.startDate) : dayjs().subtract(7, "day");
    const endDate = options.endDate ? dayjs(options.endDate) : dayjs();
    const entries = [];
    let currentDate = startDate;
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
      const logFile = path__namespace.join(this.logPath, currentDate.format("YYYY-MM-DD") + ".log");
      if (fs__namespace.existsSync(logFile)) {
        const content2 = fs__namespace.readFileSync(logFile, "utf-8");
        const lines = content2.split("\n").filter((line) => line.trim());
        for (const line of lines) {
          try {
            const jsonMatch = line.match(/\{.*\}/);
            if (jsonMatch) {
              entries.push(JSON.parse(jsonMatch[0]));
            } else {
              const parts = line.split(" | ");
              if (parts.length >= 4) {
                entries.push({
                  timestamp: parts[0].trim(),
                  direction: parts[1].trim().toLowerCase(),
                  connection: parts[2].trim(),
                  data: parts[3].trim(),
                  size: Buffer.from(parts[3].trim(), "hex").length
                });
              }
            }
          } catch (e) {
          }
        }
      }
      currentDate = currentDate.add(1, "day");
    }
    const exportPath = path__namespace.join(require$$0$3.app.getPath("downloads"), `device-log-${dayjs().format("YYYY-MM-DD-HHmmss")}.${options.format}`);
    let content;
    switch (options.format) {
      case "csv":
        content = this.formatCSV(entries);
        break;
      case "json":
        content = JSON.stringify(entries, null, 2);
        break;
      default:
        content = this.formatText(entries);
    }
    fs__namespace.writeFileSync(exportPath, content);
    return exportPath;
  }
  formatCSV(entries) {
    const header = "Timestamp,Direction,Connection,Data,Size\n";
    const rows = entries.map(
      (e) => `${e.timestamp},${e.direction},${e.connection},${e.data},${e.size}`
    ).join("\n");
    return header + rows;
  }
  formatText(entries) {
    return entries.map(
      (e) => `${e.timestamp} | ${e.direction.toUpperCase()} | ${e.connection} | ${e.data} (${e.size} bytes)`
    ).join("\n");
  }
  clearLogs() {
    if (this.logPath) {
      const files = fs__namespace.readdirSync(this.logPath);
      for (const file2 of files) {
        if (file2.endsWith(".log")) {
          fs__namespace.unlinkSync(path__namespace.join(this.logPath, file2));
        }
      }
    }
  }
}
let mainWindow = null;
const serialManager = new SerialPortManager();
const tcpManager = new TCPManager();
const logManager = new LogManager();
const DATA_FORWARD_INTERVAL_MS = 50;
const RAW_FORWARD_INTERVAL_MS = 10;
const MAX_FORWARD_CHUNKS = 200;
const FIRMWARE_MANIFEST_URL = "https://raw.giteeusercontent.com/sin-sun/mt303/raw/master/manifest.json";
const FIRMWARE_PRODUCT = "MT303";
const dataForwardBatches = /* @__PURE__ */ new Map();
const rawForwardBatches = /* @__PURE__ */ new Map();
let cachedFirmwareManifest = null;
const decryptTokenCache = /* @__PURE__ */ new Map();
function joinChunks(chunks, separator) {
  if (chunks.length === 0) return Buffer.alloc(0);
  if (chunks.length === 1 || !separator) return Buffer.concat(chunks);
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0) + separator.length * (chunks.length - 1);
  const output = Buffer.allocUnsafe(totalLength);
  let offset = 0;
  chunks.forEach((chunk, index) => {
    if (index > 0) {
      separator.copy(output, offset);
      offset += separator.length;
    }
    chunk.copy(output, offset);
    offset += chunk.length;
  });
  return output;
}
function enqueueRendererData(batches, channel, connectionId, data, intervalMs, separator) {
  const key = `${channel}:${connectionId}`;
  let batch = batches.get(key);
  if (!batch) {
    batch = { chunks: [], timer: null, timestamp: Date.now() };
    batches.set(key, batch);
  }
  batch.chunks.push(Buffer.from(data));
  batch.timestamp = Date.now();
  const flush = () => {
    const current = batches.get(key);
    if (!current) return;
    batches.delete(key);
    if (current.timer) clearTimeout(current.timer);
    if (!mainWindow || current.chunks.length === 0) return;
    const payload = joinChunks(current.chunks, separator);
    mainWindow.webContents.send(channel, {
      connectionId,
      data: Array.from(payload),
      timestamp: current.timestamp
    });
  };
  if (batch.chunks.length >= MAX_FORWARD_CHUNKS) {
    flush();
    return;
  }
  if (!batch.timer) {
    batch.timer = setTimeout(flush, intervalMs);
  }
}
function requestBuffer(url, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error(`Too many redirects: ${url}`));
  }
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "http:" ? http__namespace : require$$1__namespace;
    const req = client.get(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        timeout: 3e4,
        headers: {
          "User-Agent": "DeviceManager/1.0"
        }
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const location = res.headers.location;
        if (statusCode >= 300 && statusCode < 400 && location) {
          res.resume();
          const nextUrl = new URL(location, url).toString();
          requestBuffer(nextUrl, redirectCount + 1).then(resolve, reject);
          return;
        }
        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP ${statusCode}: ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error(`Request timeout: ${url}`));
    });
    req.on("error", reject);
  });
}
function getObjectField(value, field) {
  if (!value || typeof value !== "object" || !(field in value)) {
    throw new Error(`Invalid firmware manifest: missing ${field}`);
  }
  return value[field];
}
function normalizeFirmwareModule(moduleId, value) {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid firmware manifest: missing module ${moduleId}`);
  }
  const moduleValue = value;
  return {
    moduleId,
    moduleType: String(moduleValue.module_type ?? ""),
    version: String(moduleValue.version ?? ""),
    fileName: String(moduleValue.file_name ?? ""),
    url: String(moduleValue.url ?? ""),
    sizeBytes: Number(moduleValue.size_bytes ?? 0),
    sha256: String(moduleValue.sha256 ?? "")
  };
}
function normalizeFirmwareManifest(value) {
  const products = getObjectField(value, "products");
  const product = getObjectField(products, FIRMWARE_PRODUCT);
  const modules = getObjectField(product, "modules");
  const normalizedModules = {
    esp32: normalizeFirmwareModule("esp32", modules.esp32),
    fpga: normalizeFirmwareModule("fpga", modules.fpga)
  };
  for (const moduleInfo of Object.values(normalizedModules)) {
    if (!moduleInfo.version || !moduleInfo.fileName || !moduleInfo.url || !moduleInfo.sizeBytes || !moduleInfo.sha256) {
      throw new Error(`Invalid firmware manifest: incomplete module ${moduleInfo.moduleId}`);
    }
  }
  return {
    schemaVersion: Number(getObjectField(value, "schema_version")),
    generatedAt: String(getObjectField(value, "generated_at")),
    product: FIRMWARE_PRODUCT,
    allowDowngrade: Boolean(product.allow_downgrade),
    modules: normalizedModules
  };
}
async function fetchFirmwareManifest() {
  const data = await requestBuffer(FIRMWARE_MANIFEST_URL);
  const parsed = JSON.parse(data.toString("utf-8"));
  const manifest = normalizeFirmwareManifest(parsed);
  cachedFirmwareManifest = manifest;
  return manifest;
}
async function downloadFirmware(moduleId) {
  const manifest = cachedFirmwareManifest ?? await fetchFirmwareManifest();
  const moduleInfo = manifest.modules[moduleId];
  if (!moduleInfo) throw new Error(`Unknown firmware module: ${moduleId}`);
  const data = await requestBuffer(moduleInfo.url);
  if (data.length !== moduleInfo.sizeBytes) {
    throw new Error(`Firmware size mismatch: expected ${moduleInfo.sizeBytes}, got ${data.length}`);
  }
  const sha256 = crypto.createHash("sha256").update(data).digest("hex");
  if (sha256.toLowerCase() !== moduleInfo.sha256.toLowerCase()) {
    throw new Error(`Firmware sha256 mismatch: expected ${moduleInfo.sha256}, got ${sha256}`);
  }
  const output = new ArrayBuffer(data.length);
  new Uint8Array(output).set(data);
  return {
    moduleId,
    version: moduleInfo.version,
    fileName: moduleInfo.fileName,
    sizeBytes: data.length,
    sha256,
    data: output
  };
}
function requestJsonWithLog(url, method, body, headers = {}) {
  const safeHeaders = { ...headers };
  const requestLog = {
    url: url.toString().replace(/password=[^&]*/i, "password=***").replace(/token=[^&]*/i, "token=***"),
    method,
    headers: safeHeaders,
    body: body ? JSON.parse(body) : void 0
  };
  console.log("[decrypt] request", requestLog);
  log.info("[decrypt] request", JSON.stringify(requestLog));
  return new Promise((resolve, reject) => {
    const req = http__namespace.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        timeout: 25e3
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          let data = text;
          try {
            data = JSON.parse(text);
          } catch {
          }
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data
          };
          const responseText = JSON.stringify(response, null, 2);
          console.log("[decrypt] response", responseText);
          log.info("[decrypt] response", responseText);
          resolve(response);
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error(`Decrypt request timeout: ${url.toString()}`));
    });
    req.on("error", (error) => {
      const errorLog = {
        url: url.toString().replace(/password=[^&]*/i, "password=***").replace(/token=[^&]*/i, "token=***"),
        message: error.message
      };
      console.log("[decrypt] error", errorLog);
      log.error("[decrypt] error", JSON.stringify(errorLog));
      reject(error);
    });
    if (body) req.write(body);
    req.end();
  });
}
function getResponseData(response) {
  return response && typeof response === "object" && "data" in response ? response.data : void 0;
}
function getResponseStatusCode(response) {
  return response && typeof response === "object" && "statusCode" in response ? Number(response.statusCode) : void 0;
}
function getTokenFromLoginResponse(response) {
  const statusCode = getResponseStatusCode(response);
  if (statusCode === 401 || statusCode === 403) {
    throw new Error("Invalid username or password. Failed to get token.");
  }
  const data = getResponseData(response);
  if (!data || typeof data !== "object") {
    throw new Error("Invalid username or password. Failed to get token.");
  }
  const token = data.data?.token;
  if (typeof token !== "string" || !token) {
    throw new Error("Invalid username or password. Failed to get token.");
  }
  return token;
}
function normalizeDecryptError(error) {
  if (/ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ETIMEDOUT|timeout|EPERM|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(error.message)) {
    return new Error("Cannot connect to decrypt server.");
  }
  return error;
}
function normalizeDecryptHost(serverIp) {
  return serverIp.trim().replace(/^https?:\/\//, "");
}
function getDecryptTokenCacheKey(payload) {
  return `${normalizeDecryptHost(payload.serverIp)}:${payload.serverPort}:${payload.username?.trim() ?? ""}`;
}
function getDecryptTokenStatus(payload) {
  const cache = decryptTokenCache.get(getDecryptTokenCacheKey(payload));
  const hasToken = !!cache?.token;
  return {
    hasToken,
    status: hasToken ? "valid" : cache?.lastExpiredAt ? "expired" : "none",
    lastLoginAt: cache?.lastLoginAt,
    lastExpiredAt: cache?.lastExpiredAt
  };
}
async function getPasswordAuthToken(payload, host, forceLogin = false) {
  const username = payload.username?.trim();
  const password = payload.password ?? "";
  if (!username || !password) {
    throw new Error("Decrypt login failed: missing username/password");
  }
  const cacheKey = getDecryptTokenCacheKey({ ...payload, serverIp: host, username });
  const cachedToken = decryptTokenCache.get(cacheKey)?.token;
  if (cachedToken && !forceLogin) return cachedToken;
  const loginUrl = new URL(`http://${host}:${payload.serverPort}/api/login`);
  loginUrl.searchParams.set("username", username);
  loginUrl.searchParams.set("password", password);
  const loginResponse = await requestJsonWithLog(loginUrl, "GET");
  const token = getTokenFromLoginResponse(loginResponse);
  decryptTokenCache.set(cacheKey, { token, lastLoginAt: Date.now() });
  return token;
}
async function callSignatureDecryptService(payload, host) {
  if (!payload.deviceId || !payload.randomNum || !payload.signature) {
    throw new Error("Signature decrypt failed: missing deviceId/randomNum/signature");
  }
  const url = new URL(`http://${host}:${payload.serverPort}/api/1.0/dec`);
  const body = JSON.stringify({ hexData: payload.hexData });
  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    v: "1.0",
    deviceId: payload.deviceId,
    randomNum: payload.randomNum,
    signature: payload.signature
  };
  return requestJsonWithLog(url, "POST", body, headers);
}
async function callPasswordDecryptService(payload, host) {
  const buildDecryptUrl = (token2) => {
    const url = new URL(`http://${host}:${payload.serverPort}/api/yd/decrypt`);
    url.searchParams.set("hex", payload.hexData);
    url.searchParams.set("token", token2);
    return url;
  };
  const token = await getPasswordAuthToken(payload, host);
  const firstResponse = await requestJsonWithLog(buildDecryptUrl(token), "GET");
  if (getResponseStatusCode(firstResponse) !== 401) return firstResponse;
  const cacheKey = getDecryptTokenCacheKey({ ...payload, serverIp: host });
  const currentCache = decryptTokenCache.get(cacheKey) ?? {};
  decryptTokenCache.set(cacheKey, { ...currentCache, token: void 0, lastExpiredAt: Date.now() });
  log.warn("[decrypt] token expired, login again and retry once");
  const nextToken = await getPasswordAuthToken(payload, host, true);
  return requestJsonWithLog(buildDecryptUrl(nextToken), "GET");
}
async function callDecryptService(payload) {
  const inputHost = payload.serverIp.trim();
  const host = inputHost.replace(/^https?:\/\//, "");
  if (payload.authMethod === "password") {
    return callPasswordDecryptService(payload, host);
  }
  return callSignatureDecryptService(payload, host);
}
function createWindow() {
  const appIconPath = path.join(__dirname, "../../resources/icon.png");
  mainWindow = new require$$0$3.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0f172a",
    ...fs.existsSync(appIconPath) ? { icon: appIconPath } : {},
    frame: false,
    // titleBarStyle: 'hidden', // Removed to fully hide macOS traffic lights
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });
  if (process.env.NODE_ENV === "development") {
    const port = process.env.VITE_PORT || 5173;
    mainWindow.loadURL(`http://localhost:${port}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../out/renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== "development") {
    mainWindow.webContents.on("before-input-event", (event, input) => {
      const key = input.key.toLowerCase();
      const isDevToolsShortcut = input.key === "F12" || (input.control || input.meta) && input.shift && key === "i" || (input.control || input.meta) && input.shift && key === "j" || (input.control || input.meta) && input.shift && key === "c";
      if (isDevToolsShortcut) {
        event.preventDefault();
      }
    });
    mainWindow.removeMenu();
  }
}
require$$0$3.ipcMain.handle("serial:list", async () => {
  try {
    const ports = await serialManager.listPorts();
    return { success: true, data: ports };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("serial:open", async (_, config) => {
  try {
    const id = await serialManager.connect(config);
    return { success: true, data: id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("serial:close", async (_, portId) => {
  try {
    await serialManager.disconnect(portId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("serial:send", async (_, portId, data) => {
  try {
    await serialManager.send(portId, Buffer.from(data));
    logManager.logData("send", Buffer.from(data), portId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("serial:set-line-parsing-paused", async (_, portId, paused) => {
  try {
    serialManager.setLineParsingPaused(portId, paused);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("tcp:connect", async (_, config) => {
  try {
    const id = await tcpManager.connect(config);
    return { success: true, data: id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("tcp:disconnect", async (_, clientId) => {
  try {
    await tcpManager.disconnect(clientId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("tcp:send", async (_, clientId, data) => {
  try {
    await tcpManager.send(clientId, Buffer.from(data));
    logManager.logData("send", Buffer.from(data), clientId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("tcp:set-line-parsing-paused", async (_, clientId, paused) => {
  try {
    tcpManager.setLineParsingPaused(clientId, paused);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("log:export", async (_, options) => {
  try {
    const result = await logManager.exportLog(options);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("data:export", async (_, request) => {
  try {
    if (typeof request?.content !== "string") {
      throw new Error("Invalid export content.");
    }
    if (Buffer.byteLength(request.content, "utf8") > 100 * 1024 * 1024) {
      throw new Error("Export content exceeds the 100 MB limit.");
    }
    const requestedName = typeof request.defaultFileName === "string" ? path.basename(request.defaultFileName.trim()) : "";
    const defaultFileName = requestedName || `device-data-${Date.now()}.txt`;
    const options = {
      defaultPath: path.join(require$$0$3.app.getPath("documents"), defaultFileName),
      filters: [{ name: "Text files", extensions: ["txt"] }]
    };
    const saveResult = mainWindow ? await require$$0$3.dialog.showSaveDialog(mainWindow, options) : await require$$0$3.dialog.showSaveDialog(options);
    if (saveResult.canceled || !saveResult.filePath) {
      const result2 = { canceled: true };
      return { success: true, data: result2 };
    }
    await fs.promises.writeFile(saveResult.filePath, request.content, "utf8");
    const result = {
      canceled: false,
      filePath: saveResult.filePath
    };
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("decrypt:request", async (_, payload) => {
  try {
    const result = await callDecryptService(payload);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: normalizeDecryptError(error).message };
  }
});
require$$0$3.ipcMain.handle("decrypt:token-status", async (_, payload) => {
  try {
    return {
      success: true,
      data: getDecryptTokenStatus(payload)
    };
  } catch (error) {
    return { success: false, error: normalizeDecryptError(error).message };
  }
});
require$$0$3.ipcMain.handle("decrypt:login-token", async (_, payload) => {
  try {
    const host = normalizeDecryptHost(payload.serverIp);
    await getPasswordAuthToken({
      ...payload,
      authMethod: "password",
      hexData: ""
    }, host, true);
    return {
      success: true,
      data: getDecryptTokenStatus(payload)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("firmware:fetch-manifest", async () => {
  try {
    const result = await fetchFirmwareManifest();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("firmware:download", async (_, moduleId) => {
  try {
    const result = await downloadFirmware(moduleId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
require$$0$3.ipcMain.handle("window:minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});
require$$0$3.ipcMain.handle("window:maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
require$$0$3.ipcMain.handle("window:close", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});
serialManager.onData((portId, data) => {
  logManager.logData("receive", data, portId);
  enqueueRendererData(dataForwardBatches, "serial:data", portId, data, DATA_FORWARD_INTERVAL_MS, Buffer.from("\n"));
});
serialManager.onRawData((portId, data) => {
  enqueueRendererData(rawForwardBatches, "serial:raw-data", portId, data, RAW_FORWARD_INTERVAL_MS);
});
serialManager.onStatus((portId, status, message) => {
  if (mainWindow) {
    mainWindow.webContents.send("serial:status", {
      connectionId: portId,
      status,
      message
    });
  }
});
tcpManager.onData((clientId, data) => {
  logManager.logData("receive", data, clientId);
  enqueueRendererData(dataForwardBatches, "tcp:data", clientId, data, DATA_FORWARD_INTERVAL_MS, Buffer.from("\n"));
});
tcpManager.onRawData((clientId, data) => {
  enqueueRendererData(rawForwardBatches, "tcp:raw-data", clientId, data, RAW_FORWARD_INTERVAL_MS);
});
tcpManager.onStatus((clientId, status, message) => {
  if (mainWindow) {
    mainWindow.webContents.send("tcp:status", {
      connectionId: clientId,
      status,
      message
    });
  }
});
require$$0$3.app.whenReady().then(() => {
  logManager.initialize();
  if (process.platform === "darwin") {
    const appIconPath = path.join(__dirname, "../../resources/icon.png");
    if (fs.existsSync(appIconPath)) {
      require$$0$3.app.dock.setIcon(appIconPath);
    } else {
      log.warn(`[app] icon not found: ${appIconPath}`);
    }
  }
  createWindow();
  require$$0$3.app.on("activate", () => {
    if (require$$0$3.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
require$$0$3.app.on("window-all-closed", () => {
  logManager.flush();
  serialManager.disconnectAll();
  tcpManager.disconnectAll();
  require$$0$3.app.quit();
});
require$$0$3.app.on("before-quit", () => {
  logManager.flush();
  serialManager.disconnectAll();
  tcpManager.disconnectAll();
});
