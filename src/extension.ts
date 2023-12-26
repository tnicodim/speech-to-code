import * as vscode from 'vscode';
import { processTranscription } from './transcriptionHandler';
const { exec } = require('child_process');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

const wordCorrections: Record<string, string> = {
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

const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';
const request = {
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

let transcriptions: any[] = [];
let recognizeStream: any;
let recording: any;

function tokenize(text: string): string[] {
  const words: string[] = text.match(/\b\w+\b/g) || [];
  const lowercasedWords: string[] = words.map(word => word.toLowerCase());
  return lowercasedWords;
}

function startRecording() {
  recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', (data: { results: { alternatives: { transcript: any; }[]; }[]; }) => {
      const transcription = data.results[0] && data.results[0].alternatives[0]
        ? data.results[0].alternatives[0].transcript
        : '\n\nReached transcription time limit\n';
      let correctedTranscription = transcription
        .split(' ')
        .map((word: string) => wordCorrections[word.toLowerCase()] || word)
        .join(' ');
        
      transcriptions.push(correctedTranscription);
      processTranscription(tokenize(correctedTranscription));
      process.stdout.write('Transcription: ' + transcription + '\n');
      process.stdout.write('Corrected Transcription: ' + correctedTranscription + '\n');
      //process.stdout.write('Transcription History: ' + transcriptions + '\n');
    });

  recording = recorder.record({
    sampleRateHertz: sampleRateHertz,
    threshold: 0,
    verbose: false,
    recordProgram: 'sox',
    silence: '10',
  });

  recording.stream().on('recorder threw an error:', console.error).pipe(recognizeStream);
  console.log('Recording started');
  vscode.window.showInformationMessage('Recording Started!');
}

export function stopRecording() {
  if (recording) {
    recording.stop();
  }
  if (recognizeStream) {
    recognizeStream.destroy();
  }
  console.log('Recording stopped');
  vscode.window.showInformationMessage('Recording Stopped!');
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "speech-to-code-python" is now active!');
 // processTranscription(['compile']);

  context.subscriptions.push(
    vscode.commands.registerCommand('speech-to-code-python.helloWorld', () => {
      vscode.window.showInformationMessage('Hello World from Speech-to-Code Python!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('speech-to-code-python.startRecord', () => {
      startRecording();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('speech-to-code-python.stopRecord', () => {
      stopRecording();
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('Extension "speech-to-code-python" deactivated!');
}
