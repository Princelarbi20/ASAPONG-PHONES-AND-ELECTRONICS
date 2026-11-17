import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { getPasswordStrength, isValidPassword, passwordCharacterLength } from '../shared/passwordPolicy.js';
import { hashPassword, verifyPassword } from '../utils/passwordHash.js';
import { validators } from '../middleware/requestValidation.js';

test('shared password rules accept flexible passwords and strong passphrases', () => {
  for (const password of ['abcdefgh', 'correct horse battery staple 9', 'a'.repeat(128), ' leading and trailing ']) {
    assert.equal(isValidPassword(password), true, JSON.stringify(password));
    assert.equal(validators.password(password), true);
  }
  assert.equal(passwordCharacterLength('😀'.repeat(128)), 128);
});

test('shared password rules reject short, overlong, empty-space-only, and common passwords', () => {
  for (const password of ['short7!', 'a'.repeat(129), '        ', 'password', '12345678']) {
    assert.equal(isValidPassword(password), false, JSON.stringify(password));
    assert.equal(validators.password(password), false);
  }
});

test('strength helper reports Weak, Fair, Good, and Strong', () => {
  assert.equal(getPasswordStrength('password'), 'Weak');
  assert.equal(getPasswordStrength('abcdefgh'), 'Weak');
  assert.equal(getPasswordStrength('Abcdefgh'), 'Fair');
  assert.equal(getPasswordStrength('Abcdefghi12345'), 'Good');
  assert.equal(getPasswordStrength('Correct horse battery staple 9!'), 'Strong');
});

test('bcrypt prehash keeps the entire 128-character password significant and supports legacy hashes', async () => {
  const first = `${'a'.repeat(80)}one`;
  const second = `${'a'.repeat(80)}two`;
  const hash = await hashPassword(first, 4);
  assert.equal(hash.startsWith('$bcrypt-sha256$'), true);
  assert.equal(await verifyPassword(first, hash), true);
  assert.equal(await verifyPassword(second, hash), false);

  const legacyHash = await bcrypt.hash('LegacyPassword1!', 4);
  assert.equal(await verifyPassword('LegacyPassword1!', legacyHash), true);
  assert.equal(await verifyPassword('WrongPassword1!', legacyHash), false);
});
