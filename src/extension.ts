import * as vscode from 'vscode';
import { processTranscription } from './transcriptionHandler';
import { sampleRateHertz, request, wordCorrections } from './variables';
import { tokenize } from './functions';
const { exec } = require('child_process');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();



let transcriptions: any[] = [];
let recognizeStream: any;
let recording: any;





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
