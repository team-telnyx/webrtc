import React from 'react';
import PropTypes from 'prop-types';
import { DialPadContainer, ButtonAnswer, ButtonEnd } from './styles';

const DialPad = ({
  call,
  onDigit,
  onBackspace,
  onStartCall,
  onEndCall,
  toggleHold,
  toggleMute,
  toggleDeaf,
  isHold,
  isMute,
  isDeaf,
  disabled,
  isIncomingCall,
}) => {
  function makeSendDigit(x) {
    onDigit(x);
  }

  const answerCall = async () => {
    if (call) {
      call.answer();
    }
  };

  const hangup = () => {
    call.hangup();
  };

  return (
    <DialPadContainer>
      {isIncomingCall ? (
        <React.Fragment>
          <ButtonAnswer
            data-testid='btn-answer'
            type='button'
            onClick={answerCall}
          >
            Answer
          </ButtonAnswer>
          <div />
          <ButtonEnd data-testid='btn-reject' type='button' onClick={hangup}>
            Reject
          </ButtonEnd>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <button type='button' onClick={() => makeSendDigit('1')}>
            1
          </button>
          <button type='button' onClick={() => makeSendDigit('2')}>
            2<span>ABC</span>
          </button>
          <button type='button' onClick={() => makeSendDigit('3')}>
            3<span>DEF</span>
          </button>
          <button type='button' onClick={() => makeSendDigit('4')}>
            4<span>GHI</span>
          </button>
          <button type='button' onClick={() => makeSendDigit('5')}>
            5<span>JKL</span>
          </button>
          <button type='button' onClick={() => makeSendDigit('6')}>
            6<span>MNO</span>
          </button>
          <button type='button' onClick={() => makeSendDigit('7')}>
            7<span>PQRS</span>
          </button>
          <button type='button' onClick={() => makeSendDigit('8')}>
            8<span>TUV</span>
          </button>
          <button type='button' onClick={() => makeSendDigit('9')}>
            9<span>WXYZ</span>
          </button>
          <button type='button' onClick={() => makeSendDigit('*')}>
            *
          </button>
          <button type='button' onClick={() => makeSendDigit('0')}>
            0
          </button>
          <button type='button' onClick={() => makeSendDigit('#')}>
            #
          </button>

          {call ? (
            <button
              type='button'
              data-testid='btn-toggle-mute'
              onClick={toggleMute}
              className={isMute ? 'active' : ''}
            >
              {isMute ? (
                <span data-testid='img-mute' role='img' aria-label={'Mute'}>
                  🔇
                </span>
              ) : (
                <span data-testid='img-unmute' role='img' aria-label={'Unmute'}>
                  🔈
                </span>
              )}
            </button>
          ) : (
            <div />
          )}

          {call ? (
            <button
              data-testid='btn-end-call'
              type='button'
              onClick={onEndCall}
              className='EndButton'
            >
              End
            </button>
          ) : (
            <button
              type='button'
              data-testid='btn-call'
              onClick={onStartCall}
              className='CallButton'
              disabled={disabled}
            >
              Call
            </button>
          )}

          {call ? (
            <button
              type='button'
              onClick={toggleHold}
              data-testid='btn-toggle-hold'
              className={isHold ? 'active' : ''}
            >
              {isHold ? (
                <span data-testid='img-hold' role='img' aria-label={'Hold'}>
                  ⏸
                </span>
              ) : (
                <span data-testid='img-unhold' role='img' aria-label={'Unhold'}>
                  ▶️
                </span>
              )}
            </button>
          ) : (
            <button type='button' onClick={onBackspace}>
              ⌫
            </button>
          )}
          {call && (
            <button
              type='button'
              onClick={toggleDeaf}
              data-testid='btn-toggle-deaf'
              className={isDeaf ? 'active' : ''}
            >
              {isDeaf ? (
                <img
                  data-testid='img-deaf'
                  src='./images/hearing_disabled-24px.svg'
                  role='img'
                  aria-label={'Deaf'}
                ></img>
              ) : (
                <img
                  src='./images/hearing-24px.svg'
                  role='img'
                  data-testid='img-undeaf'
                  aria-label={'UnDeaf'}
                ></img>
              )}
            </button>
          )}
        </React.Fragment>
      )}
    </DialPadContainer>
  );
};

DialPad.propTypes = {
  call: PropTypes.object,
  onDigit: PropTypes.func.isRequired,
  onBackspace: PropTypes.func.isRequired,
  onStartCall: PropTypes.func.isRequired,
  onEndCall: PropTypes.func.isRequired,
  toggleHold: PropTypes.func.isRequired,
  toggleMute: PropTypes.func.isRequired,
  toggleDeaf: PropTypes.func.isRequired,
  isHold: PropTypes.bool.isRequired,
  isMute: PropTypes.bool.isRequired,
  isDeaf: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  isIncomingCall: PropTypes.bool.isRequired,
};

export default DialPad;
