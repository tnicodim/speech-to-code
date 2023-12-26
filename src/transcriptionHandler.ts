import * as vscode from 'vscode';
import { stopRecording } from './extension';

export function processTranscription(transcription: string[]) {
    // stop command
    if (transcription[0] === 'stop') {
        stopRecording();
        return;
        // compile command
    } else if (transcription[0] === 'compile') {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const filePath = editor.document.uri.fsPath;
        if (filePath.endsWith('.py')) {
          const terminal = vscode.window.createTerminal('Python Terminal');
          terminal.sendText(`python "${filePath}"`);
          terminal.show();
        } else {
          vscode.window.showErrorMessage('The file is not a Python file (.py)');
        }
      } else {
        vscode.window.showErrorMessage('No active editor');
      }
    }
  }