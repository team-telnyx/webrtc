import logger from '../../util/logger'
const Connection = require('../../services/Connection')
jest.mock('../../services/Connection')


jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid')
  };
});


logger.disableAll()
