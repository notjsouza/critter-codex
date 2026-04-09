import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'entryImages',
  access: (allow) => ({
    'entries/*': [allow.authenticated.to(['read', 'write', 'delete'])],
  }),
});
