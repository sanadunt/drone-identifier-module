"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Serial port methods
  serial: {
    list: () => electron.ipcRenderer.invoke("serial:list"),
    open: (config) => electron.ipcRenderer.invoke("serial:open", config),
    close: (portId) => electron.ipcRenderer.invoke("serial:close", portId),
    send: (portId, data) => electron.ipcRenderer.invoke("serial:send", portId, data),
    setLineParsingPaused: (portId, paused) => electron.ipcRenderer.invoke("serial:set-line-parsing-paused", portId, paused),
    onData: (callback) => {
      const handler = (_, payload) => callback(payload);
      electron.ipcRenderer.on("serial:data", handler);
      return () => electron.ipcRenderer.removeListener("serial:data", handler);
    },
    onRawData: (callback) => {
      const handler = (_, payload) => callback(payload);
      electron.ipcRenderer.on("serial:raw-data", handler);
      return () => electron.ipcRenderer.removeListener("serial:raw-data", handler);
    },
    onStatus: (callback) => {
      const handler = (_, payload) => callback(payload);
      electron.ipcRenderer.on("serial:status", handler);
      return () => electron.ipcRenderer.removeListener("serial:status", handler);
    },
    onError: (callback) => {
      const handler = (_, error) => callback(error);
      electron.ipcRenderer.on("serial:error", handler);
      return () => electron.ipcRenderer.removeListener("serial:error", handler);
    }
  },
  // TCP methods
  tcp: {
    connect: (config) => electron.ipcRenderer.invoke("tcp:connect", config),
    disconnect: (clientId) => electron.ipcRenderer.invoke("tcp:disconnect", clientId),
    send: (clientId, data) => electron.ipcRenderer.invoke("tcp:send", clientId, data),
    setLineParsingPaused: (clientId, paused) => electron.ipcRenderer.invoke("tcp:set-line-parsing-paused", clientId, paused),
    onData: (callback) => {
      const handler = (_, payload) => callback(payload);
      electron.ipcRenderer.on("tcp:data", handler);
      return () => electron.ipcRenderer.removeListener("tcp:data", handler);
    },
    onRawData: (callback) => {
      const handler = (_, payload) => callback(payload);
      electron.ipcRenderer.on("tcp:raw-data", handler);
      return () => electron.ipcRenderer.removeListener("tcp:raw-data", handler);
    },
    onStatus: (callback) => {
      const handler = (_, payload) => callback(payload);
      electron.ipcRenderer.on("tcp:status", handler);
      return () => electron.ipcRenderer.removeListener("tcp:status", handler);
    },
    onError: (callback) => {
      const handler = (_, error) => callback(error);
      electron.ipcRenderer.on("tcp:error", handler);
      return () => electron.ipcRenderer.removeListener("tcp:error", handler);
    }
  },
  // Log methods
  log: {
    export: (options) => electron.ipcRenderer.invoke("log:export", options),
    clear: () => electron.ipcRenderer.invoke("log:clear")
  },
  data: {
    export: (request) => electron.ipcRenderer.invoke("data:export", request)
  },
  // Decrypt service methods
  decrypt: {
    request: (payload) => electron.ipcRenderer.invoke("decrypt:request", payload),
    tokenStatus: (payload) => electron.ipcRenderer.invoke("decrypt:token-status", payload),
    loginToken: (payload) => electron.ipcRenderer.invoke("decrypt:login-token", payload)
  },
  // Online firmware methods
  firmware: {
    fetchManifest: () => electron.ipcRenderer.invoke("firmware:fetch-manifest"),
    download: (moduleId) => electron.ipcRenderer.invoke("firmware:download", moduleId)
  },
  // Window control methods
  window: {
    minimize: () => electron.ipcRenderer.invoke("window:minimize"),
    maximize: () => electron.ipcRenderer.invoke("window:maximize"),
    close: () => electron.ipcRenderer.invoke("window:close")
  }
});
