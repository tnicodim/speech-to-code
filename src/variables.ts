export const defaultTimeout = 1000;
export const encoding = 'LINEAR16';
export const sampleRateHertz = 16000;
export const languageCode = 'en-US';
export const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    speechContexts: [{
      phrases: ['new line','without context','delete', 'start selection', 
      'end selection','write','format document' ,'redo' ,'undo' ,'copy' , 
      'paste' ,'comment line', 'go to previous', 'go to previous word', 
      'go to previous line', 'go to two', 'go to line', 'go to next', 
      'go to next word', 'go to end', 'function sum', 'compile', 'sum', 
      'with context', 'go to sum']
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
    'compiled': 'compile',
    'right': 'write',
    'uh': ''
  };

 