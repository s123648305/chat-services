let fallbackCounter = 0;

const bytesToUuid = (bytes: Uint8Array) => {
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};

export const createUuid = () => {
  const webCrypto = globalThis.crypto;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    fallbackCounter = (fallbackCounter + 1) >>> 0;
    const timestamp = Date.now();

    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
    for (let index = 0; index < 6; index += 1) {
      bytes[index] ^= Math.floor(timestamp / (2 ** (index * 8))) & 0xff;
    }
    for (let index = 0; index < 4; index += 1) {
      bytes[12 + index] ^= (fallbackCounter >>> (index * 8)) & 0xff;
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
};
