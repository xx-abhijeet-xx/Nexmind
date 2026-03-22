import { detectFileRequest, getFileMimeType, downloadFile } from '../utils/api';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn()
  }
}));

describe('detectFileRequest', () => {
  test('detects markdown request', () => {
    const result = detectFileRequest('create a markdown file with my notes');
    expect(result).not.toBeNull();
    expect(result.fileType).toBe('md');
  });

  test('detects javascript request', () => {
    const result = detectFileRequest('generate a javascript file for auth');
    expect(result).not.toBeNull();
    expect(result.fileType).toBe('js');
  });

  test('detects jsx request', () => {
    const result = detectFileRequest('write a jsx component for login form');
    expect(result).not.toBeNull();
    expect(result.fileType).toBe('jsx');
  });

  test('detects html request', () => {
    const result = detectFileRequest('create an html file for my landing page');
    expect(result).not.toBeNull();
    expect(result.fileType).toBe('html');
  });

  test('detects json request', () => {
    const result = detectFileRequest('make a json file with config data');
    expect(result).not.toBeNull();
    expect(result.fileType).toBe('json');
  });

  test('returns null for non-file request', () => {
    expect(detectFileRequest('what is React?')).toBeNull();
    expect(detectFileRequest('hello')).toBeNull();
    expect(detectFileRequest('fix my bug')).toBeNull();
  });

  test('returns prompt in result', () => {
    const result = detectFileRequest('create a markdown file about React hooks');
    expect(result.prompt).toBeTruthy();
  });

  test('returns fileName in result', () => {
    const result = detectFileRequest('generate a js file');
    expect(result.fileName).toContain('.js');
  });
});

describe('getFileMimeType', () => {
  test('md → text/markdown', () => expect(getFileMimeType('md')).toBe('text/markdown'));
  test('txt → text/plain', () => expect(getFileMimeType('txt')).toBe('text/plain'));
  test('html → text/html', () => expect(getFileMimeType('html')).toBe('text/html'));
  test('js → text/javascript', () => expect(getFileMimeType('js')).toBe('text/javascript'));
  test('jsx → text/javascript', () => expect(getFileMimeType('jsx')).toBe('text/javascript'));
  test('css → text/css', () => expect(getFileMimeType('css')).toBe('text/css'));
  test('json → application/json', () => expect(getFileMimeType('json')).toBe('application/json'));
  test('unknown → text/plain (fallback)', () => expect(getFileMimeType('xyz')).toBe('text/plain'));
});
