import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Contact from './Contact';
import { supabase } from '../lib/supabaseClient';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
    })),
  },
}));

const renderContact = () => {
  return render(
    <BrowserRouter>
      <Contact />
    </BrowserRouter>
  );
};

describe('Contact Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the contact form correctly', () => {
    renderContact();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/question/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('submits the form and shows success message', async () => {
    // Setup mock return for successful insert
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({ insert: insertMock });

    renderContact();

    // Fill out form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/question/i), { target: { value: 'This is a test question.' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    // Expect loading state
    expect(screen.getByRole('button', { name: /sending.../i })).toBeInTheDocument();

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/thank you! your message has been sent successfully/i)).toBeInTheDocument();
    });

    // Verify supabase was called correctly
    expect(supabase.from).toHaveBeenCalledWith('contacts');
    expect(insertMock).toHaveBeenCalledWith([{
      name: 'Test User',
      email: 'test@example.com',
      question: 'This is a test question.',
    }]);

    // Verify form was reset
    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
    expect(screen.getByLabelText(/question/i)).toHaveValue('');
  });

  it('shows error message on submission failure', async () => {
    // Setup mock return for failed insert
    const insertMock = vi.fn().mockResolvedValue({ error: new Error('Submission failed') });
    (supabase.from as any).mockReturnValue({ insert: insertMock });

    renderContact();

    // Fill out form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/question/i), { target: { value: 'Test question' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/there was an error sending your message/i)).toBeInTheDocument();
    });
  });
});
