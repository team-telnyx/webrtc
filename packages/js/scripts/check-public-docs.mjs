/** Assert the public API boundary in generated pages, navigation and search assets.
 * Run after each generator: node scripts/check-public-docs.mjs <markdown|html> [directory]
 * No source-text checks: this must catch renderer/configuration regressions too.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [format, root = 'docs/ts'] = process.argv.slice(2);
assert.ok(['markdown', 'html'].includes(format), 'Specify markdown or html');
const extension = format === 'html' ? '.html' : '.md';
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(html|md|js|json)$/.test(file)) files.push(file);
  }
}
walk(root);
assert.ok(
  files.some((file) => file.endsWith(extension)),
  `No ${format} pages`
);
if (format === 'html') {
  assert.ok(
    files.some((file) => file.endsWith('/assets/search.js')),
    'Missing search index'
  );
}
// TypeDoc inserts <wbr> in camelCase names and Markdown escapes underscores.
const normalize = (text) =>
  text
    .replace(/<wbr\s*\/?>/g, '')
    .replace(/\\_/g, '_')
    .toLowerCase();
const denied = [
  '_terminateActiveCallsLocally',
  'onOutboundConfirmed',
  'onSignalingRequestTimeout',
  'callReportVoiceSdkId',
  'reconnectTokenCanaryRtcServer',
  'reconnectTokenVoiceSdkId',
  'handleLoginError',
  'serverDisconnect',
  'signalingStateClosed',
  'reportIceRestartFailed',
  'reportNoRtp',
  'reportPeerFailure',
  'startSignalingHealthMonitor',
  'stopSignalingHealthMonitor',
  'resetReconnectAttempts',
  'clearReconnectToken',
  'getEstablishmentTimings',
  '_applyDesiredAudioMuteState',
  'flushIntermediateCallReport',
  'shouldForceRelayCandidateForRecovery',
  'rtcIp',
  'rtcPort',
  'skipTrailing',
  'useCanaryRtcServer',
  'skipLastVoiceSdkId',
  'CallRecorder',
  'TimingsCollector',
  'TimingsCallLike',
  'TimingsBuildOptions',
  'createTimingsCollector',
  'buildPreCallIceReport',
  'buildPreCallNetworkReport',
  'buildPreCallMicrophoneReport',
  'buildVerdict',
  'createDiagnosticContext',
  'collectCallEstablishmentTimings',
  'logCallEstablishmentTimings',
  'VSDK-318',
  'VSDK-412',
  'BBT-generated',
  'UsersClass',
  'pre-routing',
  'b2bua-rtc',
  'voice-sdk-debug',
  'voice-sdk-proxy',
  'not part of the app-facing API',
  'subject to change without a semver bump',
];
const failures = [];
const contents = new Map(
  files.map((file) => [file, normalize(readFileSync(file, 'utf8'))])
);
for (const [file, text] of contents) {
  for (const term of denied) {
    if (normalize(file + '\n' + text).includes(term.toLowerCase())) {
      failures.push(`${file}: exposes ${term}`);
    }
  }
  // Scope this short name to a member anchor/name, not arbitrary English or theme JS.
  if (/(?:#env\b|id=["']env["']|\\?"name\\?"\s*:\s*\\?"env\\?")/.test(text)) {
    failures.push(`${file}: exposes env`);
  }
}
// Require actual API pages and member anchors, not just mentions in prose/nav.
const allowed = {
  'classes/TelnyxRTC': [
    'connect',
    'disconnect',
    'newCall',
    'on',
    'off',
    'triggerIceRestart',
    'runPreCall',
    'runNetworkCheck',
    'runMicrophoneCheck',
  ],
  'classes/Call': [
    'answer',
    'hangup',
    'muteAudio',
    'unmuteAudio',
    'hold',
    'unhold',
  ],
  'classes/PreCallDiagnosis': ['run'],
  'classes/PreCallDiagnostic': ['run'],
  'interfaces/IClientOptions': [
    'login_token',
    'login',
    'password',
    'region',
    'iceServers',
    'trickleIce',
    'forceRelayCandidate',
    'prefetchIceCandidates',
    'maxReconnectAttempts',
    'enableCallRecording',
    'mediaPermissionsRecovery',
  ],
  'interfaces/ICallOptions': [
    'destinationNumber',
    'localStream',
    'remoteStream',
  ],
  'interfaces/PreCallDiagnosticReport': [
    'verdict',
    'timings',
    'ice',
    'network',
    'microphone',
    'serverTests',
  ],
  'interfaces/PreCallTimingsReport': ['totalMs', 'callEstablishment'],
  'interfaces/PreCallIceReport': ['candidates', 'selectedPair'],
  'interfaces/PreCallNetworkReport': ['quality', 'rtt', 'inbound', 'outbound'],
  'interfaces/PreCallMicrophoneReport': [
    'currentPermissionState',
    'recordingPerformed',
  ],
};
for (const [page, members] of Object.entries(allowed)) {
  const file = join(root, page + extension);
  const text = contents.get(file);
  if (!text) failures.push(`Missing public page: ${file}`);
  else
    for (const member of members) {
      const anchor =
        format === 'html'
          ? `id="${member.toLowerCase()}"`
          : `#${member.toLowerCase()}`;
      if (!text.includes(anchor))
        failures.push(`${file}: missing public member ${member}`);
    }
}
// Only the no-argument hangup overload is application-facing. The internal
// execute flag can suppress BYE and must not be advertised to customers.
const callPage = contents.get(join(root, 'classes/Call' + extension)) || '';
const callText = callPage.replace(/<[^>]*>/g, '').replace(/[*`]/g, '');
if (/hangup\s*\([^)]*\b(?:params|execute)\b/.test(callText)) {
  failures.push('Call.hangup exposes internal control parameters');
}
const options =
  contents.get(join(root, 'interfaces/IClientOptions' + extension)) || '';
for (const guidance of ['consent', 'chromium', 'firefox', 'safari']) {
  if (!options.includes(guidance))
    failures.push(`Recording guidance missing: ${guidance}`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Public docs boundary passed: ${format} (${files.length} pages/assets scanned)`
  );
