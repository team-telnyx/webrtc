// Get local version of @telnyx/webrtc
const packageInfo = require('../js/package.json');

console.log(packageInfo.version);

module.exports.version = packageInfo.version;