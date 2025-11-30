/// <reference types="jest" />

declare const global: typeof globalThis & {
  fetch: jest.Mock;
};
