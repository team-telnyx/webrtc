# Examples in React

We've included a few examples for you in [React](https://reactjs.org/). Use this project to immediately start making calls, or as a jumping off point for your own Telnyx WebRTC project. Examples are provided as [Storybook](https://storybook.js.org/) components.

## Getting started

You'll need Telnyx account to get started. [Sign up for free](https://telnyx.com/sign-up) and then follow our [quick start guide](https://developers.telnyx.com/docs/v2/sip-trunking/quickstarts/portal-setup) to create a Connection with Credentials Authentication. Make note of your Connection username and password.

At this point, you're ready to make calls to other SIP endpoints. You can create an Outbound Profile (step 4) to make phone calls from the web dialer to PSTN numbers.

## Running the examples

Set up and install the demo app:

```
npm run setup
npm install
```

To start the Storybook app:

```
npm run storybook
```

Your preferred browser should automatically open up to <http://localhost:6006>.

Use the Storybook [**Knobs**](https://github.com/storybookjs/storybook/tree/master/addons/knobs) feature to configure your Telnyx Connection username and password, destination number and caller number. And you're ready to make some calls with WebRTC!
