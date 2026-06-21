import { test, expect } from './minimal-fixtures';

test('minimal extension loads', async ({ extensionId }) => {
  expect(extensionId).toBeTruthy();
  console.log('Extension ID:', extensionId);
});
