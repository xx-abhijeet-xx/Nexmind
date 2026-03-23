import { describe, it, expect } from 'vitest';
import { classifyQuery } from '../../Backend/utils/classifier';

describe('Intent Classifier logic', () => {
  it('identifies exact chitchat words and ignores substrings', () => {
    expect(classifyQuery('hi')).toBe('chitchat');
    expect(classifyQuery('hi, how are you?')).toBe('chitchat');
    
    // "history" contains "hi" but is NOT chitchat, should route to factual
    expect(classifyQuery('what is the history of Rome?')).toBe('factual');
    
    // "white" contains "hi"
    expect(classifyQuery('why is snow white?')).not.toBe('chitchat');
  });

  it('routes realtime requests correctly', () => {
    expect(classifyQuery('what is the bitcoin price today?')).toBe('search');
    expect(classifyQuery('latest news on ai')).toBe('search');
  });
});
