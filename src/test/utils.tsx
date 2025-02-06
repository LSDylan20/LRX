import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { RenderOptions } from '@testing-library/react';

// Import your providers here
import { AuthProvider } from '@/features/auth/AuthProvider';

function render(
  ui: React.ReactElement,
  { route = '/', ...renderOptions }: RenderOptions & { route?: string } = {}
) {
  window.history.pushState({}, 'Test page', route);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { render };
