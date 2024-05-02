import * as vscode from 'vscode';

let lastGoToCommand = 'word';

export function tokenize(text: string): string[] {
  // Match words using a regular expression
  const words: string[] = text.match(/\b\w+\b/g) || [];

  // Lowercase the words
  const lowercasedWords: string[] = words.map(word => word.toLowerCase());

  // Combine 'go' and 'to' into 'goto'
  for (let i = 0; i < lowercasedWords.length - 1; i++) {
    const currentWord = lowercasedWords[i];
    const nextWord = lowercasedWords[i + 1];

    if (currentWord === 'go' && nextWord === 'to') {
      lowercasedWords[i] = 'goto';  // Replace 'go' with 'goto'
      lowercasedWords.splice(i + 1, 1);  // Remove 'to'
    }
  }

  return lowercasedWords;
}


export function compileCommand() {
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

export function defineCommand(transcription: string[]) {
  //shift transcription to remove command
  transcription.shift();
  let row = 0;
  let column = 2;
  let text = transcription[0];
  const editor = vscode.window.activeTextEditor;

  if (editor) {
    // Create a TextEdit instance to represent the change you want to make
    const edit = new vscode.TextEdit(new vscode.Range(new vscode.Position(row, column), new vscode.Position(row, column)), text);

    // Apply the edit to the document
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(editor.document.uri, [edit]);

    // Apply the changes
    return vscode.workspace.applyEdit(workspaceEdit).then(() => {
      // Move the cursor to the inserted text
      const newPosition = new vscode.Position(row, column + text.length);
      const newSelection = new vscode.Selection(newPosition, newPosition);
      editor.selection = newSelection;
    });
  } else {
    vscode.window.showErrorMessage('No active text editor found.');
    return undefined;
  }
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
      switch (command) {
        
        case 'goto next line':
          goToNextLine(editor);
          lastGoToCommand = ' line';
          break;

        case 'goto previous line':
          goToPreviousLine(editor);
          lastGoToCommand = ' line';
          break;

        case /^goto line \d+$/.test(command) ? command : undefined:
          const lineNumber = parseInt(command.split(' ').pop() || '0', 10);
          goToLine(editor, lineNumber);
         // lastGoToCommand = ' line';
          break;

        case 'goto line end':
          goToLineEnd(editor);
          break;

        case 'goto line start':
          goToLineStart(editor);
          break;

        case 'goto document end':
          goToDocumentEnd(editor);
          break;

        case 'goto document start':
          goToDocumentStart(editor);
          break;

        case 'goto next word':
          goToNextWord(editor);
          lastGoToCommand = ' word';
          break;

        case /^goto \w+$/.test(command) ? command : undefined:
          const targetWord = command.split(' ')[1];
          goToWord(editor, targetWord);
          lastGoToCommand = ' word';
          break;

        case 'goto previous word':
          goToPreviousWord(editor);
          lastGoToCommand = ' word';
          break;

        default:
          vscode.window.showErrorMessage(`Unsupported goto command: ${command}`);
      }
    } else {
      vscode.window.showErrorMessage('No active text editor found.');
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

      switch (command) {
        case 'undo':
          undo(editor);
          break;

        case 'redo':
          redo(editor);
          break;

        case 'paste':
          paste(editor);
          break;

        case 'format document':
          formatDocument(editor);
          break;

        case 'comment line':
          toggleLineComment(editor);
          break;

        default:
          vscode.window.showErrorMessage(`Unsupported other command: ${command}`);
      }
    } else {
      vscode.window.showErrorMessage('No active text editor found.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
    // Handle or log the error appropriately
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
  const newPosition = new vscode.Position(lastLine, 0);
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
     if (currentLine.text[wordEndPosition] == targetWord[targetWord.length - 1]){
       wordEndPosition++;
     }
    const newPosition = new vscode.Position(currentPosition.line, wordEndPosition);
    const newSelection = new vscode.Selection(newPosition, newPosition);
    editor.selection = newSelection;
    found = true;
    break;  // Break after the first match
  }

  if (!found) {
    console.log(`Word '${targetWord}' not found on the current line.`);
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
