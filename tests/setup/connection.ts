import logger from '../../src/Modules/Verto/util/logger'
const Connection = require('../../src/Modules/Verto/services/Connection')
jest.mock('../../src/Modules/Verto/services/Connection')


jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid')
  };
});


logger.disableAll()
