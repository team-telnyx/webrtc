/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
require('dotenv').config();

module.exports = (on, config) => {
  on('before:browser:launch', (browser, launchOptions) => {
    //Using cypress with WebRTC https://github.com/cypress-io/cypress/issues/2704
    if (browser.name === 'chrome' || browser.name === 'edge') {
      launchOptions.args.push('--disable-gpu');
      launchOptions.args.push('--no-sandbox');
      launchOptions.args.push('--disable-setuid-sandbox');
      launchOptions.args.push('--disable-dev-shm-usage');
      launchOptions.args.push('--disable-features=VizDisplayCompositor');
      launchOptions.args.push('--use-fake-ui-for-media-stream');
      launchOptions.args.push('--use-fake-device-for-media-stream');
      launchOptions.args.push('--allow-file-access-from-files');
      launchOptions.args.push('--disable-translate');
      //FIXME: added temporarily to fix this error INCOMPATIBLE_DESTINATION
      launchOptions.args.push('--disable-features=WebRtcHideLocalIpsWithMdns');
    }

    if (browser.name === 'firefox') {
      const firefoxUserPrefs = {
        'media.navigator.streams.fake': true,
        'media.navigator.permission.disabled': true,
        'browser.cache.disk.enable': false,
        'browser.cache.disk.capacity': 0,
        'browser.cache.disk.smart_size.enabled': false,
        'browser.cache.disk.smart_size.first_run': false,
        'browser.sessionstore.resume_from_crash': false,
        'browser.startup.page': 0,
        'device.storage.enabled': false,
        'media.gstreamer.enabled': false,
        'browser.startup.homepage': 'about:blank',
        'browser.startup.firstrunSkipsHomepage': false,
        'extensions.update.enabled': false,
        'app.update.enabled': false,
        'network.http.use-cache': false,
        'browser.shell.checkDefaultBrowser': false,
        'media.peerconnection.ice.obfuscate_host_addresses': false, //FIXME: added temporarily to fix this error INCOMPATIBLE_DESTINATION
      };
      launchOptions.preferences = {
        ...launchOptions.preferences,
        ...firefoxUserPrefs,
      };
    }

    return launchOptions;
  });

  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  config.env.username = process.env.STORYBOOK_USERNAME;
  config.env.password = process.env.STORYBOOK_PASSWORD;
  config.env.destination = process.env.STORYBOOK_DESTINATION;

  return config;
};
