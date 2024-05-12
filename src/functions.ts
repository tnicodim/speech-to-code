import * as vscode from 'vscode';
import OpenAI from 'openai';
import { myStatusBarItem } from './extension';
import { defaultTimeout, defaultTimeoutPopup, wordCorrections } from './variables';
import { window } from 'vscode';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let lastGoToCommand = 'word';
let selectionStart: vscode.Position;
let selectionEnd: vscode.Position;
let lastApiResponse: string;

export function tokenize(text: string): string[] {
  // Match words using a regular expression
  const words: string[] = text.match(/\b\d+\.\d+|\w+\b/g) || [];

  const correctedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    let word = words[i].toLowerCase();  // Convert to lowercase for matching
    word = wordCorrections[word] !== undefined ? wordCorrections[word] : words[i];  // Apply corrections
    correctedWords.push(word);
  }

  // handle special cases
  for (let i = 0; i < correctedWords.length - 1; i++) {
    const currentWord = correctedWords[i];
    const nextWord = correctedWords[i + 1];
    const previousWord = correctedWords[i - 1];

    if (currentWord === 'go' && nextWord === 'to') {
      correctedWords[i] = 'goto';  // Replace 'go' with 'goto'
      correctedWords.splice(i + 1, 1);  // Remove 'to'
    } else if (currentWord === 'and' && (nextWord === 'selection' || previousWord === 'document')) {
      correctedWords[i] = 'end';  // Replace 'and' with 'end'
    }
  }
  return correctedWords.filter(item => item !== '');;
}

export function compileCommand() {
  vscode.commands.executeCommand('workbench.action.debug.start')
  .then(() => {
      updateStatusBar("Debugging started!", defaultTimeout);
  }, err => {
      showMessageWithTimeout("Failed to start debugging: " + err);
  });
}




export async function writeCommand(transcription: string[]) {
  try {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      updateStatusBar(`Processing your command`);
      let command = removeContextPhrases(transcription.join(' ').toLowerCase());
      let languageId = editor.document.languageId;
      let userPrompt = `${command}`;
      let systemPrompt = `You need to write strictly just ${languageId} code based on what the user asks you and nothing else, no explanations needed, just the code snippet. Make sure the text is always wrapped in triple backticks even if it's 1 line of code or a comment because your answer will be typed straight into vscode. Also if the user asks you to modify something make sure you dont add extra complexity but just do the task he asked you to.`
      if (transcription[0] === 'using' || transcription[0] === 'with') {
        //use context
        const context = await getClipboardContent();
        userPrompt += `. My code for context:\n${context?.trim()}`;
      }

      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ "role": "system", "content": `${systemPrompt}` }, { "role": "user", "content": `${userPrompt}` }],
      });
      if (chatCompletion.choices && chatCompletion.choices.length > 0 && chatCompletion.choices[0].message) {
        // Regex to capture text between triple backticks ignoring the first line after the first set of backticks
        const regex = /```(?:[^\n]+\n)?([\s\S]*?)```/;
        const response = chatCompletion.choices[0].message?.content || '';
        const matches = regex.exec(response);
        if (matches && matches[1]) {  // Check if there is a captured group
          const codeToInsert = matches[1].trim();  // Trim to remove any extra whitespace
          lastApiResponse = codeToInsert;
          // Replace the currently selected text
          editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, codeToInsert);
          });
          updateStatusBar('Code inserted successfully', defaultTimeout);
        } else {
          showMessageWithTimeout('No code block found within the response.');
        }
      } else {
        showMessageWithTimeout('No response message from OpenAI chat completion.');
      }
    } else {
      showMessageWithTimeout('No active text editor found.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

function removeContextPhrases(text: string) {
  // Define the phrases to remove
  const phrasesToRemove = ["with context", "without context", "using context"];

  // Use a regular expression to remove the phrases
  let result = text;
  phrasesToRemove.forEach(phrase => {
    let regex = new RegExp("\\b" + phrase + "\\b", "gi");
    result = result.replace(regex, '');
  });

  return result.trim();
}

export function goToCommand(transcription: string[]) {
  try {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      // Handle different cases for navigation
      let command = transcription.join(' ').toLowerCase();
      if (command === 'goto next' || command === 'goto previous') {
        command += lastGoToCommand;
      }
      switch (true) { // Use 'true' to use conditions in case statements
        case command === 'goto next line':
          goToNextLine(editor);
          lastGoToCommand = ' line';
          updateStatusBar("Moved to next line", 1000);
          break;

        case command === 'goto previous line':
          goToPreviousLine(editor);
          lastGoToCommand = ' line';
          updateStatusBar("Moved to previous line", 1000);
          break;

        case /^goto line \d+$/.test(command):
          const lineNumber = parseInt(command.split(' ').pop() || '0', 10);
          goToLine(editor, lineNumber);
          updateStatusBar(`Moved to line ${lineNumber}`, 1000);
          break;

        case command === 'goto line end':
          goToLineEnd(editor);
          updateStatusBar("Moved to line end", 1000);
          break;

        case command === 'goto line start':
          goToLineStart(editor);
          updateStatusBar("Moved to line start", 1000);
          break;

        case command === 'goto document end':
          goToDocumentEnd(editor);
          updateStatusBar("Moved to document end", 1000);
          break;

        case command === 'goto document start':
          goToDocumentStart(editor);
          updateStatusBar("Moved to document start", 1000);
          break;

        case command === 'goto next word':
          goToNextWord(editor);
          lastGoToCommand = ' word';
          updateStatusBar("Moved to next word", 1000);
          break;

        case /^goto \w+$/.test(command):
          const targetWord = command.split(' ')[1];
          goToWord(editor, targetWord);
          lastGoToCommand = ' word';
          updateStatusBar(`Moved to word '${targetWord}'`, 1000);
          break;

        case command === 'goto previous word':
          goToPreviousWord(editor);
          lastGoToCommand = ' word';
          updateStatusBar("Moved to previous word", 1000);
          break;

        default:
          showMessageWithTimeout(`Unsupported goto command: ${command}`);
      }
    } else {
      showMessageWithTimeout('No active text editor found.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
    // Handle or log the error appropriately
  }
}

export function otherCommand(transcription: string[]) {
  try {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      // Handle different cases for navigation
      const command = transcription.join(' ').toLowerCase();

      const selectFromToRegex = /^select from (\d+) to (\d+)$/;
      const selectMatch = command.match(selectFromToRegex);

      switch (command) {
        case 'copy':
          copyTextToClipboard(editor);
          updateStatusBar("Copied to clipboard", 1000);
          break;

          case 'copy line':
          copyLine(editor);
          updateStatusBar("Copied line to clipboard", 1000);
          break;

        case 'undo':
          case 'and do':
          undo(editor);
          updateStatusBar("Undid last action", 1000);
          break;

        case 'redo':
          redo(editor);
          updateStatusBar("Redid last action", 1000);
          break;

        case 'paste':
          paste(editor);
          updateStatusBar("Pasted from clipboard", 1000);
          break;

        case 'paste previous':
          pastePrevious(editor);
          updateStatusBar("Pasted previous API response", 1000);
          break;

        case 'format document':
          formatDocument(editor);
          updateStatusBar("Formatted the document", 1000);
          break;

        case 'comment line':
          toggleLineComment(editor);
          updateStatusBar("Toggled line comment", 1000);
          break;

        case 'start selection':
          startSelection(editor);
          updateStatusBar("Started text selection", 1000);
          break;

        case 'end selection':
          endSelection(editor);
          updateStatusBar("Ended text selection", 1000);
          break;

        case 'delete':
          deleteSelection(editor);
          updateStatusBar("Deleted selection", 1000);
          break;

        case 'delete line':
          deleteLine(editor);
          updateStatusBar("Deleted the line", 1000);
          break;

        case 'new line':
          newline(editor);
          updateStatusBar("Inserted a new line", 1000);
          break;

        case 'cut':
          vscode.commands.executeCommand('editor.action.clipboardCutAction');
          updateStatusBar("Cut the selection", 1000);
          break;

        case 'select line':
         selectLine(editor);
          updateStatusBar("Selected the line", 1000);
          break;

        case 'select all':
          vscode.commands.executeCommand('editor.action.selectAll');
          updateStatusBar("Selected all text", 1000);
          break;

        case '':
          // Intentionally empty to handle no input gracefully
          break;

        default:
          if (selectMatch) {
            const startLine = parseInt(selectMatch[1], 10);
            const endLine = parseInt(selectMatch[2], 10);
            selectFromTo(editor, startLine, endLine);
            updateStatusBar(`Selected from line ${startLine} to line ${endLine}`, 1000);
          }
          else{
            showMessageWithTimeout(`Unsupported other command: ${command}`);
          }
      }
    } else {
      showMessageWithTimeout('No active text editor found.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

function pastePrevious(editor: vscode.TextEditor) {
  if (lastApiResponse) {
    editor.edit(editBuilder => {
      editBuilder.replace(editor.selection.active, lastApiResponse);
    });
  } else {
    showMessageWithTimeout('No previous API response available.');
  }

}

function selectLine(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  const currentLine = editor.document.lineAt(currentPosition.line);
  const range = new vscode.Range(currentLine.range.start, currentLine.range.end);
  const newSelection = new vscode.Selection(range.start, range.end);
  editor.selection = newSelection;
}

function copyLine(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  const currentLine = editor.document.lineAt(currentPosition.line);
  const range = new vscode.Range(currentLine.range.start, currentLine.range.end);
  const text = editor.document.getText(range);
  vscode.env.clipboard.writeText(text);
}

function deleteLine(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  const currentLine = editor.document.lineAt(currentPosition.line);
  const range = new vscode.Range(currentLine.range.start, currentLine.range.end);
  editor.edit(editBuilder => {
    editBuilder.delete(range);
  });
}

function newline(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  editor.edit(editBuilder => {
    editBuilder.insert(currentPosition, '\n'); // Insert a newline character at the cursor position
  });
}

function selectFromTo(editor: vscode.TextEditor, startLine: number, endLine: number) {
  const start = new vscode.Position(startLine - 1, 0); // Convert to zero-based index
  const end = new vscode.Position(endLine, 0); // End line start position
  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(new vscode.Range(start, end));
}

function startSelection(editor: vscode.TextEditor) {
  if (editor) {
    const currentPosition = editor.selection.active;
    selectionStart = currentPosition;
    const userFeedbackSelection = new vscode.Selection(selectionStart, selectionStart.translate(0, 1));
    editor.selection = userFeedbackSelection;
  } else {
    console.error('No active editor');
  }
}



function endSelection(editor: vscode.TextEditor) {
  if (editor) {
    const currentPosition = editor.selection.active;
    selectionEnd = currentPosition;
    if (selectionStart && selectionEnd) {
      const newSelection = new vscode.Selection(selectionStart, selectionEnd);
      editor.selection = newSelection;
    } else {
      showMessageWithTimeout('No start position found');
    }
  } else {
    console.error('No active editor');
  }

}

function goToLineEnd(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  const currentLine = editor.document.lineAt(currentPosition.line);
  const newPosition = currentLine.range.end;
  const newSelection = new vscode.Selection(newPosition, newPosition);
  editor.selection = newSelection;
}

function goToLineStart(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  const currentLine = editor.document.lineAt(currentPosition.line);
  const newPosition = currentLine.range.start;
  const newSelection = new vscode.Selection(newPosition, newPosition);
  editor.selection = newSelection;
}

function goToNextLine(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  const nextLine = currentPosition.line + 1;
  const newPosition = new vscode.Position(nextLine, 0);
  const newSelection = new vscode.Selection(newPosition, newPosition);
  editor.selection = newSelection;
}

function goToPreviousLine(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  const previousLine = currentPosition.line - 1;

  if (previousLine >= 0) { // Ensure we don't go above the first line
    const newPosition = new vscode.Position(previousLine, 0);
    const newSelection = new vscode.Selection(newPosition, newPosition);
    editor.selection = newSelection;
  }
}

function goToLine(editor: vscode.TextEditor, lineNumber: number) {
  const newPosition = new vscode.Position(lineNumber - 1, 0);
  const newSelection = new vscode.Selection(newPosition, newPosition);
  editor.selection = newSelection;
}

function goToDocumentEnd(editor: vscode.TextEditor) {
  const lastLine = editor.document.lineCount - 1;
  const line = editor.document.lineAt(lastLine);
  const lastCharPosition = line.text.length;
  const newPosition = new vscode.Position(lastLine, lastCharPosition);
  const newSelection = new vscode.Selection(newPosition, newPosition);
  editor.selection = newSelection;
}

function goToDocumentStart(editor: vscode.TextEditor) {
  const newPosition = new vscode.Position(0, 0);
  const newSelection = new vscode.Selection(newPosition, newPosition);
  editor.selection = newSelection;
}

function goToNextWord(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  console.log('Current Position:', currentPosition);

  const currentLine = editor.document.lineAt(currentPosition.line);
  console.log('Current Line:', currentLine.text);

  const currentLineText = currentLine.text;
  const remainingText = currentLineText.substring(currentPosition.character);
  console.log('Remaining Text:', remainingText);

  // Use a modified regex to consider the cursor position
  const nextWordMatch = remainingText.match(/\b(\w*)\b/);

  if (nextWordMatch) {
    const nextWord = nextWordMatch[1]; // Extract the matched word
    const nextWordStart = currentPosition.character + (nextWordMatch.index ?? 0) + nextWord.length;
    console.log('Next Word Start:', nextWordStart);

    const newPosition = new vscode.Position(currentPosition.line, nextWordStart);
    console.log('New Position:', newPosition);

    const newSelection = new vscode.Selection(newPosition, newPosition);
    console.log('New Selection:', newSelection);

    editor.selection = newSelection;
  }
}

function goToWord(editor: vscode.TextEditor, targetWord: string) {
  const currentPosition = editor.selection.active;
  const currentLine = editor.document.lineAt(currentPosition.line);
  const currentLineText = currentLine.text;
  const remainingText = currentLineText.substring(currentPosition.character);

  const wordRegex = new RegExp(`(?:^|[^\\w])${targetWord}(?:$|[^\\w])`);  // This matches the exact word
  let match;
  let found = false;

  while ((match = wordRegex.exec(remainingText)) !== null) {
    let wordEndPosition = currentLine.text.length - remainingText.length + match.index + targetWord.length;
    if (currentLine.text[wordEndPosition] == targetWord[targetWord.length - 1]) {
      wordEndPosition++;
    }
    const newPosition = new vscode.Position(currentPosition.line, wordEndPosition);
    const newSelection = new vscode.Selection(newPosition, newPosition);
    editor.selection = newSelection;
    found = true;
    break;  // Break after the first match
  }

  if (!found) {
    showMessageWithTimeout(`Word '${targetWord}' not found on the current line.`);
  }
}

function goToPreviousWord(editor: vscode.TextEditor) {
  const currentPosition = editor.selection.active;
  console.log('Current Position:', currentPosition);

  const currentLine = editor.document.lineAt(currentPosition.line);
  console.log('Current Line:', currentLine.text);

  const currentLineText = currentLine.text;
  const textBeforeCursor = currentLineText.substring(0, currentPosition.character);
  console.log('Text Before Cursor:', textBeforeCursor);

  // Use a modified regex to consider the cursor position
  const previousWordMatch = textBeforeCursor.match(/\b\w+\b(\W*)$/);

  if (previousWordMatch) {
    const previousWord = previousWordMatch[0]; // Extract the matched word
    const previousWordStart = currentPosition.character - previousWord.length;
    console.log('Previous Word Start:', previousWordStart);

    const newPosition = new vscode.Position(currentPosition.line, previousWordStart);
    console.log('New Position:', newPosition);

    const newSelection = new vscode.Selection(newPosition, newPosition);
    console.log('New Selection:', newSelection);

    editor.selection = newSelection;
  }
}

function undo(editor: vscode.TextEditor) {
  if (editor) {
    vscode.commands.executeCommand('undo');
  }
}

function redo(editor: vscode.TextEditor) {
  if (editor) {
    vscode.commands.executeCommand('redo');
  }
}

function paste(editor: vscode.TextEditor) {
  if (editor) {
    vscode.commands.executeCommand('editor.action.clipboardPasteAction');
  } else {
    showMessageWithTimeout('No active editor available.');
  }
}

function formatDocument(editor: vscode.TextEditor) {
  if (editor) {
    vscode.commands.executeCommand('editor.action.formatDocument');
  }
}

function toggleLineComment(editor: vscode.TextEditor) {
  if (editor) {
    vscode.commands.executeCommand('editor.action.commentLine');
  }
}

async function copyTextToClipboard(editor: vscode.TextEditor) {
  if (editor) {
    vscode.commands.executeCommand('editor.action.clipboardCopyAction');
  } else {
    showMessageWithTimeout('No active editor available.');
  }
}

async function getClipboardContent() {
  try {
    const clipboardText = await vscode.env.clipboard.readText();
    return clipboardText;
  } catch (error) {
    console.error('Failed to read clipboard content:', error);
  }
}

function deleteSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection; // Get the current selection
    editor.edit(editBuilder => {
      editBuilder.delete(selection); // Delete the selected text
    });
  } else {
    showMessageWithTimeout('No active text editor found.');
  }
}

export function updateStatusBar(message: string, timeout?: number, timeoutMessage?: string) {
  myStatusBarItem.text = message;
  if (timeout) {
    setTimeout(() => {
      myStatusBarItem.text = timeoutMessage || `$(mic-filled) Waiting for a new command...`;
    }, timeout);
  }
}

//taken from https://github.com/mysql/mysql-shell-plugins/blob/master/gui/extension/src/utilities.ts

export function showMessageWithTimeout(message: string, timeout = defaultTimeoutPopup)
{
  void window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: message,
      cancellable: false,
    },
    async (progress): Promise<void> => {
      await waitFor(timeout, () => { return false; });
      progress.report({ increment: 100 });
    });
}


//taken from https://github.com/mysql/mysql-shell-plugins/blob/master/gui/frontend/src/utilities/helpers.ts

async function waitFor (timeout: number, condition: () => boolean): Promise<boolean> {
  while (!condition() && timeout > 0) {
      timeout -= 100;
      await sleep(100);
  }

  return timeout > 0 ? true : false;
};
export const sleep = (ms: number): Promise<unknown> => {
  return new Promise((resolve) => {
      return setTimeout(resolve, ms);
  });
};