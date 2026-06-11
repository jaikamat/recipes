/** Vitest setup: adds jest-dom matchers (toBeInTheDocument, etc.). */
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// findBy*/waitFor default to 1s, which flakes when the full suite runs
// files in parallel and a jsdom worker stalls. 5s keeps tests deterministic
// without slowing passing runs (polling exits as soon as the element shows).
configure({ asyncUtilTimeout: 5000 });
