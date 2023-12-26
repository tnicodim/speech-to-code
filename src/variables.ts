export const encoding = 'LINEAR16';
export const sampleRateHertz = 16000;
export const languageCode = 'en-US';
export const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    speechContexts: [{
      phrases: ['function sum', 'compile', 'sum', 'function', 'define', 'parameters', 'variable', 'array', 'for loop', 'if statement', 'boolean', 'string', 'integer', 'class', 'object', 'method', 'property']
    }],
  },
  interimResults: false,
};
export const wordCorrections: Record<string, string> = {
    'some': 'sum',
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9',
    'zero': '0',
    'compiled': 'compile'
  };