// @vitest-environment jsdom
/**
 * Coverage boost R4 · src/options/App.tsx presentational parts
 *
 * App.tsx is a bootstrap-heavy file (1148 loc) whose root createRoot() call
 * makes the top-level `App` component hard to test in isolation. This suite
 * exercises the seven exported *pure/presentational* helpers that live in
 * that same file — they don't touch chrome.storage, don't fetch, and don't
 * open Shadow DOM — so they lift the file's coverage floor with essentially
 * zero mocking.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  sliderPercent,
  clampPos,
  ReadtoLogo,
  ReadtoSubtitle,
  Section,
  LabeledInput,
  StatusIndicator,
} from '../src/options/App';

/* ─── Pure helpers ───────────────────────────────────────────────── */

describe('coverage-boost R4: sliderPercent', () => {
  it('midpoint (pos 3) maps to 50% for a 5-level scale', () => {
    // ((3 - 0.5) / 5) * 100 = 50
    expect(sliderPercent(3)).toBe(50);
  });

  it('pos 1 maps to 10% (lowest tick)', () => {
    expect(sliderPercent(1)).toBe(10);
  });

  it('pos 5 maps to 90% (highest tick)', () => {
    expect(sliderPercent(5)).toBe(90);
  });

  it('handles fractional positions linearly', () => {
    expect(sliderPercent(2.5)).toBe(40);
  });
});

describe('coverage-boost R4: clampPos', () => {
  it('clamps below-1 values to 1', () => {
    expect(clampPos(-3)).toBe(1);
    expect(clampPos(0)).toBe(1);
    expect(clampPos(0.999)).toBe(1);
  });

  it('clamps above-5 values to LEVEL_COUNT (5)', () => {
    expect(clampPos(6)).toBe(5);
    expect(clampPos(1000)).toBe(5);
  });

  it('passes valid values through unchanged', () => {
    expect(clampPos(1)).toBe(1);
    expect(clampPos(3)).toBe(3);
    expect(clampPos(5)).toBe(5);
    expect(clampPos(2.5)).toBe(2.5);
  });
});

/* ─── ReadtoLogo ─────────────────────────────────────────────────── */

describe('coverage-boost R4: ReadtoLogo', () => {
  it('renders "readto" wordmark with accent dot by default', () => {
    const { container } = render(<ReadtoLogo />);
    expect(container.textContent).toContain('readto');
    const dot = container.querySelector('[data-readto-dot]');
    expect(dot).not.toBeNull();
    expect(dot!.textContent).toBe('.');
  });

  it('shows "ai" suffix when variant is "ai"', () => {
    const { container } = render(<ReadtoLogo variant="ai" />);
    expect(container.textContent).toContain('ai');
  });

  it('omits "ai" suffix when variant is "plain"', () => {
    const { container } = render(<ReadtoLogo variant="plain" />);
    // "ai" should not appear as its own inline span
    const spans = container.querySelectorAll('span');
    const hasAi = Array.from(spans).some((s) => s.textContent === 'ai');
    expect(hasAi).toBe(false);
  });

  it('applies data-size attribute for sm/md/lg sizes', () => {
    const { container: sm } = render(<ReadtoLogo size="sm" />);
    expect(sm.querySelector('[data-size="sm"]')).not.toBeNull();

    const { container: md } = render(<ReadtoLogo size="md" />);
    expect(md.querySelector('[data-size="md"]')).not.toBeNull();

    const { container: lg } = render(<ReadtoLogo size="lg" />);
    expect(lg.querySelector('[data-size="lg"]')).not.toBeNull();
  });

  it('merges className prop into the root span', () => {
    const { container } = render(<ReadtoLogo className="my-extra-class" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('my-extra-class');
  });
});

/* ─── ReadtoSubtitle ─────────────────────────────────────────────── */

describe('coverage-boost R4: ReadtoSubtitle', () => {
  it('renders both Chinese and English subtitle segments', () => {
    const { container } = render(<ReadtoSubtitle />);
    expect(container.textContent).toContain('读懂每一个词');
    expect(container.textContent).toContain('Read to know');
  });

  it('includes the mid-dot separator', () => {
    const { container } = render(<ReadtoSubtitle />);
    expect(container.textContent).toContain('·');
  });

  it('applies extra className when provided', () => {
    const { container } = render(<ReadtoSubtitle className="extra" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('extra');
  });
});

/* ─── Section ────────────────────────────────────────────────────── */

describe('coverage-boost R4: Section', () => {
  it('renders children inside a <section>', () => {
    const { container } = render(
      <Section>
        <p>child content</p>
      </Section>,
    );
    expect(container.querySelector('section')).not.toBeNull();
    expect(container.textContent).toContain('child content');
  });

  it('renders optional title as <h2>', () => {
    render(
      <Section title="Section Heading">
        <p>x</p>
      </Section>,
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Section Heading');
  });

  it('renders optional lede paragraph', () => {
    const { container } = render(
      <Section title="T" lede="This is a lede.">
        <p>x</p>
      </Section>,
    );
    expect(container.textContent).toContain('This is a lede.');
  });

  it('omits title/lede when not provided', () => {
    const { container } = render(
      <Section>
        <span>only-child</span>
      </Section>,
    );
    expect(container.querySelector('h2')).toBeNull();
    expect(container.textContent).toBe('only-child');
  });
});

/* ─── LabeledInput ───────────────────────────────────────────────── */

describe('coverage-boost R4: LabeledInput', () => {
  it('renders label + input with matching for/id attributes', () => {
    render(
      <LabeledInput
        id="my-field"
        label="My Label"
        type="text"
        value="hello"
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('My Label') as HTMLInputElement;
    expect(input.id).toBe('my-field');
    expect(input.value).toBe('hello');
    expect(input.type).toBe('text');
  });

  it('applies placeholder when provided', () => {
    render(
      <LabeledInput
        id="f"
        label="L"
        type="text"
        value=""
        placeholder="type here"
        onChange={() => {}}
      />,
    );
    expect((screen.getByLabelText('L') as HTMLInputElement).placeholder).toBe('type here');
  });

  it('calls onChange with the raw string value when input changes', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const spy = (val: string) => {
      captured = val;
    };
    let captured = '';
    render(
      <LabeledInput id="f" label="L" type="text" value="" onChange={spy} />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('L'), 'ab');
    // fires onChange per keystroke — last captured char is the final one
    expect(captured.length).toBeGreaterThan(0);
  });

  it('calls onBlur handler when provided', async () => {
    let blurred = false;
    render(
      <LabeledInput
        id="f"
        label="L"
        type="text"
        value=""
        onChange={() => {}}
        onBlur={() => {
          blurred = true;
        }}
      />,
    );
    const input = screen.getByLabelText('L') as HTMLInputElement;
    input.focus();
    input.blur();
    expect(blurred).toBe(true);
  });
});

/* ─── StatusIndicator ────────────────────────────────────────────── */

describe('coverage-boost R4: StatusIndicator', () => {
  it('renders empty for idle status', () => {
    const { container } = render(<StatusIndicator status="idle" />);
    // idle → renders empty fragment
    expect(container.textContent).toBe('');
  });

  it('renders "保存中" for saving status', () => {
    const { container } = render(<StatusIndicator status="saving" />);
    expect(container.textContent).toContain('保存中');
  });

  it('renders error message with role=alert for error status', () => {
    render(<StatusIndicator status="error" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('没保存');
  });

  it('renders "已保存" for saved status', () => {
    const { container } = render(<StatusIndicator status="saved" />);
    expect(container.textContent).toContain('已保存');
  });
});
