import React from 'react';
/* eslint no-unused-vars: off */
import {
  DialPadContainer, ButtonAnswer, ButtonEnd,
} from './styles';

const DialPad = ({
  call,
  onDigit,
  onBackspace,
  onStartCall,
  onEndCall,
  toggleHold,
  disabled,
  isIncomingCall,
  isMuted,
  onMuted,
  onUnMuted,
}) => {
  const held = call && call.isHeld;

  const makeSendDigit = (x) => () => onDigit(x);

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
          <ButtonAnswer type='button' onClick={answerCall}>
            Answer
          </ButtonAnswer>
          <div />
          <ButtonEnd type='button' onClick={hangup}>
            Reject
          </ButtonEnd>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <button type='button' onClick={makeSendDigit('1')}>
            1
          </button>
          <button type='button' onClick={makeSendDigit('2')}>
            2<span>ABC</span>
          </button>
          <button type='button' onClick={makeSendDigit('3')}>
            3<span>DEF</span>
          </button>
          <button type='button' onClick={makeSendDigit('4')}>
            4<span>GHI</span>
          </button>
          <button type='button' onClick={makeSendDigit('5')}>
            5<span>JKL</span>
          </button>
          <button type='button' onClick={makeSendDigit('6')}>
            6<span>MNO</span>
          </button>
          <button type='button' onClick={makeSendDigit('7')}>
            7<span>PQRS</span>
          </button>
          <button type='button' onClick={makeSendDigit('8')}>
            8<span>TUV</span>
          </button>
          <button type='button' onClick={makeSendDigit('9')}>
            9<span>WXYZ</span>
          </button>
          <button type='button' onClick={makeSendDigit('*')}>
            *
          </button>
          <button type='button' onClick={makeSendDigit('0')}>
            0
          </button>
          <button type='button' onClick={makeSendDigit('#')}>
            #
          </button>

          {call ? (
            <button
              type='button'
              onClick={isMuted ? onUnMuted : onMuted}
              className={isMuted ? 'active' : ''}
            >
              <span role='img' aria-label={isMuted ? 'Unmute' : 'Mute'}>
                🔇
              </span>
            </button>
          ) : (
            <div />
          )}

          {call ? (
            <button type='button' onClick={onEndCall} className='EndButton'>
              End
            </button>
          ) : (
            <button
              type='button'
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
              className={held ? 'active' : ''}
            >
              <span role='img' aria-label={held ? 'Unhold' : 'Hold'}>
                ⏸
              </span>
            </button>
          ) : (
            <button type='button' onClick={onBackspace}>
              ⌫
            </button>
          )}
        </React.Fragment>
      )}
    </DialPadContainer>
  );
};

export default DialPad;
