import { Amplify } from 'aws-amplify';

let configured = false;

export function bootstrapAmplify() {
  if (configured) {
    return;
  }

  try {
    // Keep startup resilient when local Amplify outputs are not present yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const outputs = require('../../../amplify_outputs.json');
    Amplify.configure(outputs);
    configured = true;
  } catch {
    configured = false;
  }
}

export function isAmplifyConfigured() {
  return configured;
}
