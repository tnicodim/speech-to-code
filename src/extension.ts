import * as vscode from 'vscode';
import { processTranscription } from './transcriptionHandler';
import { sampleRateHertz, request } from './variables';
import { tokenize, updateStatusBar, showMessageWithTimeout } from './functions';
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

let recordingTimer: NodeJS.Timeout | null = null;
let isRecordingActive: boolean = false;
// let transcriptions: any[] = [];
let recognizeStream: any;
let recording: any;
export let myStatusBarItem: vscode.StatusBarItem;


function startRecording() {

if (isRecordingActive){
  showMessageWithTimeout('Recording already in progress!');
  return;
}

isRecordingActive = true;

  recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', (data: { results: { alternatives: { transcript: any; }[]; }[]; }) => {
      const transcription = data.results[0] && data.results[0].alternatives[0]
        ? data.results[0].alternatives[0].transcript
        : '\n\nReached transcription time limit\n';
      if(transcription !== ''){
        processTranscription(tokenize(transcription));
        // process.stdout.write('Transcription: ' + transcription + '\n');
        // process.stdout.write('Corrected Transcription: ' + tokenize(transcription) + '\n');
      }
    });

  recording = recorder.record({
    sampleRateHertz: sampleRateHertz,
    threshold: 0,
    verbose: false,
    recordProgram: 'sox',
    silence: '3.0',
  });

  recording.stream().on('recorder threw an error:', console.error).pipe(recognizeStream);

  // Clear existing timer if it's set
  if (recordingTimer) {
    clearTimeout(recordingTimer);
  }
   // Set a timer to stop and restart recording every 300 seconds
   recordingTimer = setTimeout(() => {
    console.log('Restarting recording...');
    stopRecording();
    startRecording();
  }, 300000); // 300 seconds = 300000 milliseconds


  showMessageWithTimeout('Recording Started!');
}

function stopRecording() {
  if (recording) {
    recording.stop();
    isRecordingActive = false;
    showMessageWithTimeout('Recording Stopped!');
  }
  if (recognizeStream) {
    recognizeStream.destroy();
  }
  if (recordingTimer) {
    clearTimeout(recordingTimer);
    recordingTimer = null;
  }
  
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "Speech-to-Code" is now active!');
  myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
  myStatusBarItem.show();
  updateStatusBar(`$(mic) Waiting for recording to start`);
  myStatusBarItem.command = 'speech-to-code.startRecord';
  myStatusBarItem.tooltip = "Click to start voice recording";
  context.subscriptions.push(myStatusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('speech-to-code.startRecord', () => {
      startRecording();
      updateStatusBar(`$(mic-filled) Recording in progress`, 800);
      myStatusBarItem.command = 'speech-to-code.stopRecord';
      myStatusBarItem.tooltip = "Click to stop voice recording";
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('speech-to-code.stopRecord', () => {
      stopRecording();
      updateStatusBar(`$(mic) Recording stopped`, 2000, `$(mic) Waiting for recording to start`);
      myStatusBarItem.command = 'speech-to-code.startRecord';
      myStatusBarItem.tooltip = "Click to start voice recording";
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('Extension "Speech-to-Code" deactivated!');
  myStatusBarItem.dispose();
}
