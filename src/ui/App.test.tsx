import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App shell', () => {
  it('renders the title and navigation', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Mythic Circuit' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  const routes: Array<[path: string, heading: string]> = [
    ['/', 'Home'],
    ['/collection', 'Collection'],
    ['/circuit', 'Circuit Builder'],
    ['/battle', 'Battle'],
    ['/packs', 'Packs'],
    ['/settings', 'Settings'],
  ];

  it.each(routes)('renders the %s route with heading "%s"', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
  });
});
