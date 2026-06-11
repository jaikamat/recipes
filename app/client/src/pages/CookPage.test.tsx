import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import CookPage from './CookPage';
import { makeRecipe, renderWithRecipes } from '../test-utils';

function renderCookPage() {
  return renderWithRecipes(
    <Routes>
      <Route path="/recipe/:category/:slug" element={<CookPage />} />
    </Routes>,
    [makeRecipe()],
    { route: '/recipe/dinner/test-recipe' },
  );
}

/** The current (large) step's text content. */
function currentStep(): string {
  return document.querySelector('.step-current')!.textContent!;
}

describe('CookPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  test('arrow keys step through, bounded at both ends', async () => {
    renderCookPage();
    await screen.findByText(/Brown the turkey/);
    expect(currentStep()).toContain('Brown the turkey');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(currentStep()).toContain('Add the sauce');
    fireEvent.keyDown(window, { key: ' ' });
    expect(currentStep()).toContain('Simmer and serve');
    // At the last step: next is a no-op, not a crash.
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(currentStep()).toContain('Simmer and serve');

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(currentStep()).toContain('Add the sauce');
    fireEvent.keyDown(window, { key: 'Home' });
    expect(currentStep()).toContain('Brown the turkey');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(currentStep()).toContain('Brown the turkey');

    fireEvent.keyDown(window, { key: 'End' });
    expect(currentStep()).toContain('Simmer and serve');
    fireEvent.keyDown(window, { key: '2' });
    expect(currentStep()).toContain('Add the sauce');
  });

  test('step position survives a re-render via sessionStorage', async () => {
    const { unmount } = renderCookPage();
    await screen.findByText(/Brown the turkey/);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    unmount();

    renderCookPage();
    await screen.findByText(/Add the sauce/);
    expect(currentStep()).toContain('Add the sauce');
  });

  test('batch size scales parsed ingredients, leaves unparsed verbatim', async () => {
    renderCookPage();
    await screen.findByText(/454g \(1 lb\) ground turkey/);

    // Recipe makes 4 → make 8 (the ×2 button).
    fireEvent.click(screen.getByRole('button', { name: '×2' }));
    expect(await screen.findByText(/908g \(2 lb\) ground turkey/)).toBeInTheDocument();
    expect(screen.getByText('Salt to taste')).toBeInTheDocument();
    expect(screen.getByText('not scaled')).toBeInTheDocument();
    // Macros stay per-serving regardless of batch.
    expect(screen.getByText('383 cal')).toBeInTheDocument();
  });
});
