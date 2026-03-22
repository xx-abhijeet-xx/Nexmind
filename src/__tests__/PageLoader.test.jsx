import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import PageLoader from '../components/PageLoader';

describe('PageLoader', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('renders without crashing', () => {
    const { container } = render(<PageLoader onComplete={() => {}} />);
    expect(container).toBeTruthy();
  });

  test('calls onComplete after minMs', async () => {
    const onComplete = jest.fn();
    render(<PageLoader onComplete={onComplete} minMs={500} />);

    expect(onComplete).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1000));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  test('shows CHYMERA text', () => {
    const { getByText } = render(<PageLoader onComplete={() => {}} />);
    // Each letter is a separate span — check for at least one
    expect(getByText('C')).toBeInTheDocument();
  });

  test('adds pl--out class before calling onComplete', async () => {
    const onComplete = jest.fn();
    const { container } = render(<PageLoader onComplete={onComplete} minMs={500} />);
    const loader = container.firstChild;

    act(() => jest.advanceTimersByTime(600));
    await waitFor(() => expect(loader).toHaveClass('pl--out'));
  });
});
