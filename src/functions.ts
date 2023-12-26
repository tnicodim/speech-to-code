export function tokenize(text: string): string[] {
    const words: string[] = text.match(/\b\w+\b/g) || [];
    const lowercasedWords: string[] = words.map(word => word.toLowerCase());
    return lowercasedWords;
  }
  