import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { createCloudinaryMulterStorage, createSignatureInspector } from '../utils/cloudinaryMulterStorage.js';
import { cleanupPartialUploads, commitUploadedFiles } from '../utils/uploadCleanup.js';
import { hasImageSignature, hasPdfSignature } from '../utils/fileSignatures.js';
import { normalizeUploadedImagePaths } from '../utils/normalizeImagePaths.js';

const runUpload = (storage, req, input, originalname) => new Promise((resolve, reject) => {
  storage._handleFile(req, {
    originalname,
    stream: Readable.from([input]),
  }, (error, file) => error ? reject(error) : resolve(file));
});

const makeCloudinary = ({ fail = false } = {}) => {
  const uploads = [];
  const deletes = [];
  return {
    uploads,
    deletes,
    uploader: {
      upload_stream(options, callback) {
        const chunks = [];
        const stream = new Writable({ write(chunk, encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
        stream.on('finish', () => setImmediate(() => {
          uploads.push({ options, bytes: Buffer.concat(chunks) });
          if (fail) callback(new Error('provider upload failed'));
          else callback(null, {
            secure_url: `https://res.cloudinary.com/test/${options.resource_type}/${options.type}/${options.folder}/${options.public_id}`,
            public_id: options.folder ? `${options.folder}/${options.public_id}` : options.public_id,
            bytes: Buffer.concat(chunks).length,
          });
        }));
        return stream;
      },
      destroy(publicId, options, callback) {
        deletes.push({ publicId, options });
        callback?.(null, { result: 'ok' });
      },
    },
  };
};

test('Cloudinary storage accepts multiple signed product images and preserves response metadata', async () => {
  const cloudinary = makeCloudinary();
  const storage = createCloudinaryMulterStorage({
    cloudinary,
    folder: 'products',
    inspectStream: () => createSignatureInspector(hasImageSignature, 'image'),
  });
  const req = {};
  const imageBytes = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('image-data')]);

  const files = await Promise.all([
    runUpload(storage, req, imageBytes, 'phone-one.png'),
    runUpload(storage, req, imageBytes, 'phone-two.png'),
  ]);

  assert.equal(files.length, 2);
  assert.ok(files.every((file) => file.path.startsWith('https://res.cloudinary.com/')));
  assert.deepEqual(normalizeUploadedImagePaths(files), files.map(({ path: imageUrl }) => imageUrl));
  assert.ok(files.every((file) => file.resource_type === 'image' && file.delivery_type === 'upload'));
  assert.equal(cloudinary.uploads.length, 2);
  assert.ok(cloudinary.uploads.every(({ options }) => options.resource_type === 'image' && options.type === 'upload'));
  commitUploadedFiles(req);
  await cleanupPartialUploads(req, cloudinary);
  assert.equal(cloudinary.deletes.length, 0);
});

test('certificate uploads use authenticated raw PDFs and delete on uncommitted database failure', async () => {
  const cloudinary = makeCloudinary();
  const storage = createCloudinaryMulterStorage({
    cloudinary,
    resourceType: 'raw',
    deliveryType: 'authenticated',
    publicIdPrefix: 'dealer-certificates-',
    publicIdExtension: '.pdf',
    inspectStream: () => createSignatureInspector(hasPdfSignature, 'PDF'),
  });
  const req = {};
  const pdfBytes = Buffer.from('%PDF-1.7\ncertificate');
  const file = await runUpload(storage, req, pdfBytes, 'registration.pdf');

  assert.equal(file.resource_type, 'raw');
  assert.equal(file.delivery_type, 'authenticated');
  assert.match(file.filename, /^dealer-certificates-.*\.pdf$/);
  const certificateUrl = `/uploads/certificates/${file.filename}`;
  assert.match(certificateUrl, /^\/uploads\/certificates\/dealer-certificates-.*\.pdf$/);
  assert.deepEqual(cloudinary.uploads[0].options, {
    public_id: file.filename,
    resource_type: 'raw',
    type: 'authenticated',
  });
  await cleanupPartialUploads(req, cloudinary);
  assert.deepEqual(cloudinary.deletes[0], {
    publicId: file.filename,
    options: { resource_type: 'raw', type: 'authenticated', invalidate: true },
  });
});

test('invalid upload content and provider failures fail the upload without accepting files', async () => {
  const cloudinary = makeCloudinary();
  const storage = createCloudinaryMulterStorage({
    cloudinary,
    folder: 'products',
    inspectStream: () => createSignatureInspector(hasImageSignature, 'image'),
  });
  await assert.rejects(runUpload(storage, {}, Buffer.from('not an image'), 'fake.png'), /Invalid image/);

  const failingCloudinary = makeCloudinary({ fail: true });
  const failingStorage = createCloudinaryMulterStorage({ cloudinary: failingCloudinary, folder: 'products' });
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  await assert.rejects(runUpload(failingStorage, {}, bytes, 'phone.jpg'), /provider upload failed/);
});
