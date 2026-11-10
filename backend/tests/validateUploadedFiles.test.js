import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImages } from '../middleware/validateUploadedFiles.js';

test('validateImages skips Cloudinary-style uploads without throwing', async () => {
  let nextCalled = false;
  const req = {
    files: [{
      path: 'https://res.cloudinary.com/demo/image/upload/v1234/test.jpg',
      originalname: 'test.jpg'
    }]
  };
  const res = {};

  await validateImages(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
