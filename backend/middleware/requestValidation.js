import { cleanupUploadedFiles } from './validateUploadedFiles.js';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

export const isValidObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
export const isValidEmail = (value) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isValidPhone = (value) => {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/[\s()-]/g, '');
  return /^\+?\d{10,13}$/.test(digits) && (digits.length === 10 || digits.startsWith('+233') && digits.length === 13 || digits.startsWith('233') && digits.length === 12);
};
export const isValidPassword = (value) => typeof value === 'string' && value.length >= 8 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z\d]/.test(value);

const nonEmptyString = (max, min = 1) => (value) =>
  typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const enumOf = (...allowed) => (value) => typeof value === 'string' && allowed.includes(value);
const integer = ({ min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => (value) => {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^-?\d+$/.test(value))) return false;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max;
};
const numericRange = ({ min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => (value) => {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value))) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
};
const validAddress = (value) => isRecord(value) && Object.keys(value).every((field) => ['address', 'city', 'state', 'country', 'postalCode'].includes(field)) &&
  nonEmptyString(200)(value.address) && nonEmptyString(100)(value.city) && nonEmptyString(100)(value.state) &&
  nonEmptyString(100)(value.country) && nonEmptyString(30)(value.postalCode);
const validSpecs = (value) => {
  let specs = value;
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch { return false; }
  }
  return Array.isArray(specs) && specs.length <= 100 && specs.every((spec) => isRecord(spec) &&
    Object.keys(spec).every((key) => key === 'key' || key === 'value') &&
    nonEmptyString(100)(spec.key) && nonEmptyString(1000)(spec.value));
};
const validBoolean = (value) => [true, false, 'true', 'false'].includes(value);
const optional = (validator) => (value) => value === undefined || validator(value);

export const validators = {
  email: (value) => isValidEmail(value),
  phone: (value) => isValidPhone(value),
  password: (value) => isValidPassword(value),
  name: (value) => nonEmptyString(80, 2)(value) && /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(value.trim()),
  shortText: nonEmptyString(120),
  longText: nonEmptyString(5000),
  objectId: isValidObjectId,
  quantity: integer({ min: 1, max: 1000 }),
  cartQuantity: integer({ min: 0, max: 1000 }),
  price: integer({ min: 0, max: 100000000 }),
  stock: integer({ min: 0, max: 1000000 }),
  rating: numericRange({ min: 1, max: 5 }),
  orderStatus: enumOf('PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN REQUESTED', 'RETURNED', 'REFUNDED'),
  paymentMethod: enumOf('COD', 'ONLINE'),
  address: validAddress,
  specifications: validSpecs,
  boolean: validBoolean,
};

// Schema shape: { body: { field: validator }, params: { id: validator }, query: {...} }
// Add a trailing * to a required field name; unknown keys are rejected by default.
export const validateRequest = (shape, { allowUnknown = false } = {}) => async (req, res, next) => {
  const errors = [];
  for (const [part, fields] of Object.entries(shape)) {
    const source = req[part] ?? (part === 'body' ? {} : {});
    if (!isRecord(source)) {
      errors.push({ field: part, message: `${part} must be an object.` });
      continue;
    }
    const expected = new Set(Object.keys(fields).map((key) => key.replace(/\*$/, '')));
    if (!allowUnknown) {
      for (const key of Object.keys(source)) {
        if (!expected.has(key)) errors.push({ field: `${part}.${key}`, message: 'Unexpected field.' });
      }
    }
    for (const [fieldName, validate] of Object.entries(fields)) {
      const required = fieldName.endsWith('*');
      const field = fieldName.replace(/\*$/, '');
      if (!own(source, field) || source[field] === undefined) {
        if (required) errors.push({ field: `${part}.${field}`, message: 'This field is required.' });
        continue;
      }
      if (required && typeof source[field] === 'string' && !source[field].trim()) {
        errors.push({ field: `${part}.${field}`, message: 'This field cannot be empty.' });
      } else if (!validate(source[field])) {
        errors.push({ field: `${part}.${field}`, message: `Invalid ${field}.` });
      }
    }
  }
  if (errors.length) {
    await cleanupUploadedFiles(req.files);
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  return next();
};

export const validateNoInputBody = validateRequest({ body: {} });
export const validateNoInputQuery = validateRequest({ query: {} });
export const validateNoInputRequest = validateRequest({ body: {}, query: {} });

export const validatePaginationQuery = (req, res, next) => {
  const errors = [];
  for (const field of ['page', 'limit']) {
    const value = req.query[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || (field === 'limit' && Number(value) > 100) || (field === 'page' && Number(value) > 10000000)) {
      errors.push({ field: `query.${field}`, message: `Invalid ${field}.` });
    }
  }
  if (errors.length) return res.status(422).json({ success: false, message: 'Validation failed', errors });
  return next();
};
