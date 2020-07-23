import styled from 'styled-components';

const Container = styled.div`
  font-family: sans-serif;
  margin: 0 auto;
  text-align: center;
  max-width: fit-content;

  * {
    box-sizing: border-box;
  }
`;

const NumberInput = styled.input`
  width: 100%;
  margin-bottom: 10px;
  padding: 5px;
  font-size: 16px;
  text-align: center;
  border: 2px solid #eff1f2;
  border-radius: 4px;
  color: #5c5f64;
`;

const DialPadContainer = styled.div`
  display: grid;
  margin-bottom: 10px;
  max-width: fit-content;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(5, 1fr);
  grid-gap: 10px;
  justify-items: center;
  align-items: center;

  button {
    appearance: none;
    width: 60px;
    height: 60px;
    border: 0;
    border-radius: 50%;
    color: #5c5f64;
    font-size: 20px;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
    }
  }

  button span {
    display: block;
    font-size: 10px;
    text-transform: lowercase;
  }

  .CallButton,
  .EndButton {
    color: #fff;
    font-size: 16px;
  }

  .CallButton {
    background-color: #3fc08b;
  }

  .EndButton {
    background-color: #ff6666;
  }
`;

const ButtonAnswer = styled.button`
  color: #fff !important;
  border-radius: 50%;
  width: 80px !important;
  height: 80px !important;
  background-color: #1ea7fd;
  cursor: pointer;
`;

const ButtonEnd = styled.button`
  cursor: pointer;
  color: #fff !important;
  border-radius: 50%;
  width: 80px !important;
  height: 80px !important;
  background-color: #ff6666;
`;

export {
  Container, NumberInput, DialPadContainer, ButtonAnswer, ButtonEnd,
};
