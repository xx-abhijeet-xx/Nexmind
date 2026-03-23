import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock Supabase before importing useChatState
vi.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockReturnThis()
    })
  }
}));

import { useChatState } from '../../src/hooks/useChatState';

describe('useChatState hook', () => {
  it('initializes with a default session', () => {
    const { result } = renderHook(() => useChatState());
    
    expect(result.current.sessions.length).toBe(1);
    expect(result.current.activeSession.id).toBe('default');
    expect(result.current.activeSession.messages.length).toBe(0);
  });

  it('can create a new session and set it to active', () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.newSession();
    });

    expect(result.current.sessions.length).toBe(2);
    expect(result.current.activeId).not.toBe('default');
    expect(result.current.activeSession.id).toBe(result.current.activeId);
  });

  it('manages loading and error state', () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.setError('Network error');
      result.current.setLoading(true);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
