import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Entry: a
    .model({
      name: a.string().required(),
      description: a.string(),
      image: a.string(),
      latitude: a.float(),
      longitude: a.float(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
