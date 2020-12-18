import logger from '../util/logger';
import BaseSession from '../BaseSession';
import { sessionStorage } from '../util/storage';

export default async (session: BaseSession): Promise<string> => {
  const params: { protocol?: string } = {};
  const { signature, relayProtocol } = session;
  if (relayProtocol && relayProtocol.split('_')[1] === signature) {
    params.protocol = relayProtocol;
  } else {
    const prevProtocol = await sessionStorage.getItem(signature);
    if (prevProtocol) {
      params.protocol = prevProtocol;
    }
  }
  logger.error('Error during setup the session protocol.');
  return new Promise<string>((_, reject) => {
    reject();
  });
};
