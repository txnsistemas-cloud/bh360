// Node's asynchronous native realpath may return EPERM inside a Windows sandbox.
// The synchronous JS implementation still resolves and validates symbolic links.
const fs = require("node:fs");
const original = fs.promises.realpath.bind(fs.promises);
fs.promises.realpath = async function realpath(file, options) {
  try {
    return await original(file, options);
  } catch (error) {
    if (process.platform !== "win32" || error.code !== "EPERM") throw error;
    return fs.realpathSync(file, options);
  }
};
const mkdirAsync = fs.promises.mkdir.bind(fs.promises);
fs.promises.mkdir = async function mkdir(file, options) {
  try {
    return await mkdirAsync(file, options);
  } catch (error) {
    if (process.platform !== "win32" || error.code !== "EPERM") throw error;
    return fs.mkdirSync(file, options);
  }
};
const mkdirCallback = fs.mkdir.bind(fs);
fs.mkdir = function mkdir(file, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }
  return mkdirCallback(file, options, (error, result) => {
    if (!error || process.platform !== "win32" || error.code !== "EPERM")
      return callback(error, result);
    try {
      const value = fs.mkdirSync(file, options);
      callback(null, value);
    } catch (syncError) {
      callback(syncError);
    }
  });
};
