export function buildGeneratePrompt(userInput: string): string {
  return [
    'You are a helpful assistant. Answer the user request clearly and concisely.',
    'If the request is unsafe or unclear, reply with a short refusal.',
    '',
    'User request:',
    userInput.trim(),
  ].join('\n');
}
