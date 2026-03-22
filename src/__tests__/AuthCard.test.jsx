import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthCard from '../components/landing/AuthCard';

const MemoryRouter = ({ children }) => <div>{children}</div>;

// Mock auth context
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    signUp: jest.fn(),
    signInWithGoogle: jest.fn(),
    user: null,
  }),
}));

// Mock react router
jest.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }) => <div>{children}</div>,
  Link: ({ children }) => <a>{children}</a>,
  useNavigate: () => jest.fn(),
}), { virtual: true });

// Mock supabase
jest.mock('../config/supabase', () => ({
  supabase: { auth: { updateUser: jest.fn() } },
}));

const renderAuthCard = () =>
  render(
    <MemoryRouter>
      <AuthCard />
    </MemoryRouter>
  );

describe('AuthCard', () => {
  test('renders Sign in tab by default', () => {
    renderAuthCard();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  test('shows email and password fields on login tab', () => {
    renderAuthCard();
    expect(screen.getAllByPlaceholderText('you@example.com')[0]).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('••••••••')[0]).toBeInTheDocument();
  });

  test('switching to Register tab shows full name field', () => {
    renderAuthCard();
    fireEvent.click(screen.getByText('Register'));
    expect(screen.getAllByPlaceholderText('Ada Lovelace')[0]).toBeInTheDocument();
  });

  test('Register tab shows phone field', () => {
    renderAuthCard();
    fireEvent.click(screen.getByText('Register'));
    expect(screen.getAllByPlaceholderText('+91 00000 00000')[0]).toBeInTheDocument();
  });

  test('shows error when register form submitted empty', () => {
    renderAuthCard();
    fireEvent.click(screen.getByText('Register'));
    fireEvent.click(screen.getAllByText('Create account →')[0]);
    expect(screen.getAllByRole('alert')[0]).toBeInTheDocument();
  });

  test('Continue button exists on login tab', () => {
    renderAuthCard();
    expect(screen.getAllByText('Continue to Chymera →')[0]).toBeInTheDocument();
  });

  test('Google sign in button rendered', () => {
    renderAuthCard();
    expect(screen.getAllByText('Continue with Google')[0]).toBeInTheDocument();
  });
});
