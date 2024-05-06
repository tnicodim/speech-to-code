import * as vscode from 'vscode';
import * as fs from './functions';
import { stopRecording } from './extension';

export function processTranscription(transcription: string[]) {
  process.stdout.write('parameter: ' + transcription + '\n');

  try {
    switch (transcription[0]) {
      case 'stop':
        stopRecording();
        return;

      case 'compile':
        fs.compileCommand();
        return;

      case 'goto':
        fs.goToCommand(transcription);
        return;

      case 'write':
      case 'using':
        fs.writeCommand(transcription);
        return;

      default:
        fs.otherCommand(transcription);
        // console.log('Unknown command: ', transcription[0]);
        // Handle unrecognized commands or add more cases as needed
        break;
    }
  } catch (error) {
    console.error('An error occurred:', error);
    // Handle or log the error appropriately
  }
}


/* 
Commands:

============================================================================================
Voice Navigation Commands
============================================================================================
1. Go to Next Line
Command: "goto next line"
Description: Move the cursor to the start of the next line.
+------------------------+-----------------------------+-----------------------------------+
2. Go to Specific Line
Command: "goto line [lineNumber]"
Description: Move the cursor to the start of the specified line.
+------------------------+-----------------------------+-----------------------------------+
3. Go to Line End
Command: "goto line end"
Description: Move the cursor to the end of the current line.
+------------------------+-----------------------------+-----------------------------------+
4. Go to Line Start
Command: "goto line start"
Description: Move the cursor to the start of the current line.
+------------------------+-----------------------------+-----------------------------------+
5. Go to Document End
Command: "goto document end"
Description: Move the cursor to the end of the document.
+------------------------+-----------------------------+-----------------------------------+
6. Go to Document Start
Command: "goto document start"
Description: Move the cursor to the start of the document.
+------------------------+-----------------------------+-----------------------------------+
7. Go to Next Word
Command: "goto next word"
Description: Move the cursor to the end of the next word.
+------------------------+-----------------------------+-----------------------------------+
8. Go to Specific Word
Command: "goto [word]"
Description: Move the cursor to the end of the specified word on the current line.
+------------------------+-----------------------------+-----------------------------------+
9. Go to Previous Word
Command: "goto previous word"
Description: Move the cursor to the start of the previous word.
+------------------------+-----------------------------+-----------------------------------+
10. Go to Previous Line
Command: "goto previous line"
Description: Move the cursor to the start of the previous line.
+------------------------+-----------------------------+-----------------------------------+
11. Go to Next
Command: "goto next"
Description: Executes the goto next command for your previously spoken goto command (goto next word by default).
+------------------------+-----------------------------+-----------------------------------+
12. Go to Previous
Command: "goto previous"
Description: Executes the goto previous command for your previously spoken goto command (goto previous word by default).
+------------------------+-----------------------------+-----------------------------------+

Usage Examples
"goto next line" - Move to the start of the next line.
"goto line 10" - Move to the start of line 10.
"goto line end" - Move to the end of the current line.
"goto start" - Move to the start of the document.
"goto next word" - Move to the end of the next word.
"goto 5" - Move to the start of the 5th word on the current line.

============================================================================================
*/