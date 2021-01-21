// Global authentication configuration
import React, { Fragment, useEffect } from 'react';
import { AddonPanel } from '@storybook/components';
import { useAddonState, useGlobals } from '@storybook/api';
import { addons, types } from '@storybook/addons';

const AuthForm = () => {
  const [globals, setGlobals] = useGlobals();
  const [state, setState] = useAddonState('my/auth-addon', {
    username: '',
    password: '',
    token: '',
  });

  const handleChange = (e) => {
    setState({
      ...state,
      [e.target.name]: e.target.value,
    });
  };

  const handleBlur = () => {
    setGlobals({
      telnyxAuth: state,
    });
  };

  useEffect(() => {
    // Set initial global state
    setGlobals({
      telnyxAuth: state,
    });
  }, []);

  return (
    <Fragment>
      <section>
        <p>Enter your Telnyx SIP Connection username and password:</p>
        <fieldset>
          <label htmlFor='sip_username'>SIP username: </label>
          <input
            id='sip_username'
            name='username'
            type='text'
            value={state.username}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </fieldset>
        <fieldset>
          <label htmlFor='sip_username'>SIP password: </label>
          <input
            id='sip_username'
            name='password'
            type='password'
            value={state.password}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </fieldset>
      </section>

      <section>
        <p>
          Or, use an{' '}
          <a
            href='https://developers.telnyx.com/docs/v2/webrtc/quickstart#step-5--create-on-demand-credential'
            target='_blank'
          >
            access token:
          </a>
        </p>

        <fieldset>
          <label htmlFor='sip_username'>Access Token: </label>
          <input
            id='access_token'
            name='token'
            type='password'
            value={state.token}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </fieldset>
      </section>
    </Fragment>
  );
};

addons.register('my/auth-addon', () => {
  addons.add('auth-addon/panel', {
    title: 'Authentication',
    type: types.PANEL,
    render: ({ active, key }) => (
      <AddonPanel active={active} key={key}>
        <AuthForm />
      </AddonPanel>
    ),
  });
});
