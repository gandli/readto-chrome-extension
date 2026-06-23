import './options.css';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
} from 'react';
import { createRoot } from 'react-dom/client';
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import type { CefrLevel, TranslationMode, LlmConfig } from '../lib/types';
import { getFullConfig, getSettings, getLlmConfig, saveSettings, saveLlmConfig, isLocalhost } from '../lib/storage';
import { loadWordlist, filterForLevel } from '../lib/level-filter';
import { getTranslator } from '../lib/translations';
import { applyAnnotations } from '../lib/inline-renderer';
import type { FilteredWord } from '../lib/level-filter';
import { hasQueryParams, chatCompletionsUrl } from '../lib/llm-url';

/* ─── Constants ─────────────────────────────────────────────────── */

const LEVEL_NAMES = ['入门', '基础', '进阶', '熟练', '精通'] as const;
const LEVEL_COUNT = LEVEL_NAMES.length;
const TICK_COUNT = 21;
const TICK_MAJOR_INTERVAL = 5;

/** Map CefrLevel string → slider position (1-based) */
const LEVEL_TO_POS: Record<CefrLevel, number> = {
  A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 5,
};

/** Map slider position → CefrLevel string */
const POS_TO_LEVEL: Record<number, CefrLevel> = {
  1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1',
};

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

const SAVE_DEBOUNCE_MS = 200;
const LLM_SAVE_DEBOUNCE_MS = 500;
const STATUS_VISIBLE_MS = 1200;
const PREVIEW_DELAY_MS = 300;

/** Preview paragraph */
const PREVIEW_ITEMS = [
  {
    domain: 'News',
    text: "The president announced sweeping reforms to the nation's tax system yesterday, marking the most significant overhaul in a decade. Critics denounce the changes as disproportionately benefiting wealthy citizens, accusing the administration of profligate giveaways and austerity toward middle-class families already burdened by rising costs. Proponents counter that lower taxes will stimulate investment and ameliorate broader inequities. The bill faces a difficult path through the fractious, polarized legislature, where opposition lawmakers have vowed to obstruct its passage with vituperative floor speeches. Despite a flurry of grassroots rhetoric, recent polls indicate voters remain deeply skeptical of what they view as perfunctory concessions, leaving negotiations at a fragile impasse.",
  },
];

/* ─── Helpers ───────────────────────────────────────────────────── */

function sliderPercent(pos: number): number {
  return ((pos - 0.5) / LEVEL_COUNT) * 100;
}

function clampPos(n: number): number {
  return n < 1 ? 1 : n > LEVEL_COUNT ? LEVEL_COUNT : n;
}

/** Check if LLM config is fully filled and valid */
function isLlmConfigValid(llm: LlmConfig | null): boolean {
  if (!llm || !llm.endpoint || !llm.model || hasQueryParams(llm.endpoint)) return false;
  if (isLocalhost(llm.endpoint)) return true;
  return /^https:\/\//i.test(llm.endpoint) ? !!llm.apiKey : false;
}

/** Check if config is completely empty */
function isConfigEmpty(cfg: { endpoint: string; apiKey: string; model: string }): boolean {
  return !cfg.endpoint && !cfg.apiKey && !cfg.model;
}

/** Validate LLM config and return error message or null */
function validateLlmConfig(cfg: {
  level: CefrLevel;
  mode: string;
  endpoint: string;
  apiKey: string;
  model: string;
}): string | null {
  if (cfg.mode === 'local' || isConfigEmpty(cfg)) return null;
  if (!/^https?:\/\//.test(cfg.endpoint)) return '接口地址要以 http:// 或 https:// 开头';
  if (!/^https:\/\//.test(cfg.endpoint) && !isLocalhost(cfg.endpoint))
    return '非本机地址必须用 https://，否则 API key 会明文传输';
  if (!isLocalhost(cfg.endpoint) && cfg.apiKey.length < 8) return 'API key 太短';
  if (!cfg.model) return '模型不能为空';
  if (hasQueryParams(cfg.endpoint)) return '接口地址不能带 ?查询参数（运行时会被丢弃）';
  return null;
}

/**
 * Annotate a text paragraph using the local dictionary translator.
 * Returns a <p> element with readto ruby annotations applied.
 */
async function annotatePreviewText(
  text: string,
  level: CefrLevel,
  translator?: ReturnType<typeof getTranslator>,
): Promise<HTMLParagraphElement> {
  await loadWordlist();
  const p = document.createElement('p');
  p.textContent = text;
  const targets: FilteredWord[] = filterForLevel(p, level);
  const trans = translator ?? getTranslator({ translationMode: 'local' });
  const translations = await trans.translate({
    context: text,
    targets: targets.map((t) => ({ word: t.word, occurrence: t.occurrenceIndex })),
  });
  applyAnnotations(p, targets, translations);
  return p;
}

/* ─── Sonner Toaster wrapper ────────────────────────────────────── */

function ReadtoToaster() {
  return (
    <Toaster
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border group-[.toast]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  );
}

/* ─── Readto Logo ───────────────────────────────────────────────── */

const LOGO_BASE = 'inline-flex items-baseline font-readto-serif font-medium leading-none -tracking-[0.02em] text-readto-ink';
const LOGO_SIZES: Record<string, string> = {
  sm: 'text-[16px]',
  md: 'text-[24px]',
  lg: 'text-[32px]',
};

function ReadtoLogo({
  variant = 'plain',
  size = 'md',
  className = '',
}: {
  variant?: 'plain' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span data-size={size} className={`${LOGO_BASE} ${LOGO_SIZES[size]}${className ? ' ' + className : ''}`}>
      readto
      <span data-readto-dot className="text-readto-accent font-semibold">.</span>
      {variant === 'ai' && (
        <span className="ml-[2px] text-[0.7em] tracking-normal font-normal text-readto-muted">ai</span>
      )}
    </span>
  );
}

/* ─── Subtitle ──────────────────────────────────────────────────── */

const SUBTITLE_CN = '读懂每一个词';
const SUBTITLE_EN = 'Read to know';
const SUBTITLE_DOT = '·';

function ReadtoSubtitle({ className = '' }: { className?: string }) {
  return (
    <span className={`text-[12px] text-readto-muted tracking-[0.02em] whitespace-nowrap${className ? ' ' + className : ''}`}>
      {SUBTITLE_CN}
      <span className="mx-[7px] text-readto-muted-2">{SUBTITLE_DOT}</span>
      {SUBTITLE_EN}
    </span>
  );
}

/* ─── Section Wrapper ───────────────────────────────────────────── */

function Section({
  title,
  lede,
  children,
}: {
  title?: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      {title && (
        <h2 className="mb-5 font-serif text-lg font-semibold leading-tight -tracking-[0.01em]">
          {title}
        </h2>
      )}
      {lede && (
        <p className="mb-7 max-w-[44ch] text-sm text-muted-foreground">{lede}</p>
      )}
      {children}
    </section>
  );
}

/* ─── Labeled Input ─────────────────────────────────────────────── */

function LabeledInput({
  id,
  label,
  type,
  value,
  placeholder,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full border-0 border-b border-border bg-transparent px-0 py-2 font-mono text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none focus:ring-0"
      />
    </div>
  );
}

/* ─── Status Indicator ──────────────────────────────────────────── */

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

function StatusIndicator({ status }: { status: SaveStatus }) {
  const [showSaved, setShowSaved] = useState(status === 'saved');

  useEffect(() => {
    if (status !== 'saved') {
      setShowSaved(false);
      return;
    }
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), STATUS_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [status]);

  if (status === 'saving') return <>&middot; 保存中</>;
  if (status === 'error') return <span role="alert" className="text-[#b91c1c]">&middot; 没保存</span>;
  if (showSaved) return <>&middot; 已保存</>;
  return <></>;
}

/* ─── Level Slider ──────────────────────────────────────────────── */

const KNOB_SHADOW = 'shadow-[0_0_0_4px_var(--readto-bg),0_0_0_5px_rgba(17,17,17,0.08)]';
const KNOB_HOVER = 'hover:shadow-[0_0_0_4px_var(--readto-bg),0_0_0_8px_rgba(17,17,17,0.12)]';
const KNOB_DRAG = 'shadow-[0_0_0_4px_var(--readto-bg),0_0_0_10px_rgba(17,17,17,0.16)]';

function LevelSlider({
  level,
  onLevelChange,
  ariaLabel = '英语水平',
}: {
  level: number;
  onLevelChange: (pos: number) => void;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const percent = sliderPercent(level);

  const resolveLevel = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el) return level;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return level;
      const ratio = Math.max(0, Math.min(rect.width, clientX - rect.left)) / rect.width;
      return clampPos(Math.floor(ratio * LEVEL_COUNT) + 1);
    },
    [level],
  );

  const handleSet = useCallback((pos: number) => onLevelChange(pos), [onLevelChange]);

  // Mouse drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      handleSet(resolveLevel(e.clientX));
    },
    [resolveLevel, handleSet],
  );

  // Touch drag
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        setDragging(true);
        handleSet(resolveLevel(touch.clientX));
      }
    },
    [resolveLevel, handleSet],
  );

  // Global move/up listeners while dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX != null) handleSet(resolveLevel(clientX));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, resolveLevel, handleSet]);

  // Keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          handleSet(clampPos(level - 1));
          return;
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          handleSet(clampPos(level + 1));
          return;
        case 'Home':
        case 'PageDown':
          e.preventDefault();
          handleSet(1);
          return;
        case 'End':
        case 'PageUp':
          e.preventDefault();
          handleSet(LEVEL_COUNT);
          return;
      }
    },
    [level, handleSet],
  );

  return (
    <div>
      {/* Label row */}
      <div className="readto-levels flex font-readto-sans text-[15px] text-readto-muted-2 select-none tracking-normal antialiased">
        {LEVEL_NAMES.map((name, i) => {
          const pos = i + 1;
          const active = pos === level;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              className={
                'flex-1 text-center px-1 bg-transparent border-0 cursor-pointer transition-colors hover:text-readto-fg-2 ' +
                (active ? 'readto-active text-readto-ink font-medium' : 'text-inherit')
              }
              onClick={() => handleSet(pos)}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className="readto-track-wrap relative h-9 mt-2.5 cursor-pointer outline-none"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={1}
        aria-valuemax={LEVEL_COUNT}
        aria-valuenow={level}
        aria-valuetext={LEVEL_NAMES[level - 1]}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
      >
        {/* Tick marks */}
        <div className="readto-ticks absolute left-[10%] right-[10%] top-1/2 h-3.5 -translate-y-1/2 flex justify-between items-center pointer-events-none">
          {Array.from({ length: TICK_COUNT }, (_, i) => {
            const isMajor = i % TICK_MAJOR_INTERVAL === 0;
            return (
              <div
                key={i}
                className={
                  'readto-tick w-px ' +
                  (isMajor ? 'readto-tick-major h-3.5 bg-readto-muted-2' : 'h-2 bg-readto-rule')
                }
              />
            );
          })}
        </div>

        {/* Track line */}
        <div className="readto-track absolute inset-x-0 top-1/2 h-px bg-readto-rule -translate-y-1/2" />

        {/* Track fill */}
        <div
          className="readto-track-fill absolute left-0 top-1/2 h-0.5 bg-readto-ink -translate-y-1/2 transition-[width] duration-[350ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ width: percent + '%' }}
        />

        {/* Knob */}
        <div
          className={
            'readto-knob absolute top-1/2 w-3.5 h-3.5 bg-readto-ink rounded-full -translate-x-1/2 -translate-y-1/2 transition-[left,box-shadow] duration-[350ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ' +
            (dragging
              ? `readto-drag cursor-grabbing ${KNOB_DRAG}`
              : `cursor-grab ${KNOB_SHADOW} ${KNOB_HOVER}`)
          }
          style={{ left: percent + '%' }}
        />
      </div>
    </div>
  );
}

/* ─── Preview Row ───────────────────────────────────────────────── */

function PreviewRow({ element }: { element: HTMLElement }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) el.replaceChildren(element);
  }, [element]);

  return (
    <div className="border-t border-border py-5 last:border-b">
      <div ref={containerRef} className="text-[15px] leading-[1.85] text-foreground" />
    </div>
  );
}

/* ─── Level + Preview Section ───────────────────────────────────── */

interface PreviewItem {
  domain: string;
  text: string;
  element: HTMLElement | null;
  status: 'pending' | 'plain' | 'done';
}

function LevelPreview({
  level,
  onLevelChange,
  mode = 'local',
  llm = null,
}: {
  level: CefrLevel;
  onLevelChange: (l: CefrLevel) => void;
  mode?: TranslationMode;
  llm?: LlmConfig | null;
}) {
  const deferredLevel = useDeferredValue(level);
  const [items, setItems] = useState<PreviewItem[]>(
    PREVIEW_ITEMS.map((item) => ({ ...item, element: null, status: 'pending' })),
  );

  const endpoint = llm?.endpoint ?? '';
  const apiKey = llm?.apiKey ?? '';
  const model = llm?.model ?? '';
  const useLlm = mode === 'llm';
  const llmValid = useLlm && isLlmConfigValid(llm);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const runLocal = async () => {
      try {
        const results = await Promise.all(
          PREVIEW_ITEMS.map((item) =>
            annotatePreviewText(item.text, deferredLevel),
          ),
        );
        if (cancelled) return;
        setItems(
          PREVIEW_ITEMS.map((item, i) => ({
            ...item,
            element: results[i],
            status: 'done',
          })),
        );
      } catch (err) {
        if (cancelled) return;
        console.warn('[readto] local preview annotate failed:', err);
        setItems(
          PREVIEW_ITEMS.map((item) => {
            const p = document.createElement('p');
            p.textContent = item.text;
            return { ...item, element: p, status: 'done' as const };
          }),
        );
      }
    };

    const runLlm = async () => {
      if (!llm) return;

      let wordlistOk = true;
      try {
        await loadWordlist();
      } catch (err) {
        console.warn('[readto] wordlist load failed, mounting plain text:', err);
        wordlistOk = false;
      }
      if (cancelled) return;

      // Create plain text elements first
      const elements: HTMLParagraphElement[] = [];
      const streamItems: Array<{
        context: string;
        targets: Array<{ word: string; occurrence: number }>;
      }> = [];

      for (const item of PREVIEW_ITEMS) {
        const p = document.createElement('p');
        p.textContent = item.text;
        const targets: FilteredWord[] = wordlistOk
          ? filterForLevel(p, deferredLevel)
          : [];
        elements.push(p);
        streamItems.push({
          context: item.text,
          targets: targets.map((t) => ({
            word: t.word,
            occurrence: t.occurrenceIndex,
          })),
        });
      }

      if (cancelled) return;

      // Show plain text immediately
      setItems(
        PREVIEW_ITEMS.map((item, i) => ({
          ...item,
          element: elements[i],
          status: 'plain' as const,
        })),
      );

      // Stream LLM annotations
      try {
        const { streamPreviewAnnotations } = await import('../lib/stream-preview');
        if (cancelled) return;
        await streamPreviewAnnotations({
          items: streamItems,
          cfg: llm,
          elements,
          level: deferredLevel,
          abortSignal: abortController.signal,
          onParagraphDone: (index: number) => {
            if (cancelled) return;
            setItems((prev) => {
              const next = prev.slice();
              if (next[index]) next[index] = { ...next[index], status: 'done' };
              return next;
            });
          },
        });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn('[readto] LLM stream failed, keeping local-dict annotations:', err);
      }
    };

    if (llmValid) {
      const timeout = setTimeout(() => void runLlm(), PREVIEW_DELAY_MS);
      return () => {
        cancelled = true;
        clearTimeout(timeout);
        abortController.abort();
      };
    }

    runLocal();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [deferredLevel, llmValid, endpoint, apiKey, model]);

  const allReady = items.every((u) => u.element !== null);

  return (
    <Section title="选择你的英语水平">
      <LevelSlider
        level={LEVEL_TO_POS[level]}
        onLevelChange={(pos) => onLevelChange(POS_TO_LEVEL[pos])}
      />

      {/* Preview heading */}
      <div className="mt-9 mb-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        效果预览
      </div>

      {/* LLM incomplete warning */}
      {useLlm && !llmValid && (
        <p className="mb-3 text-[11px] italic text-muted-foreground">
          下面的 LLM 配置没填完，暂时先用本地词典预览。
        </p>
      )}

      {/* Preview content */}
      {allReady ? (
        <div>
          {items.map((u) => (
            <PreviewRow key={u.domain} element={u.element!} />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">加载中…</div>
      )}
    </Section>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="mb-14 flex items-end justify-between border-b border-foreground pb-4">
      <div>
        <ReadtoLogo size="lg" />
        <div className="mt-1.5">
          <ReadtoSubtitle />
        </div>
      </div>
      {right !== undefined && (
        <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground tabular-nums hidden min-[420px]:block">
          {right}
        </div>
      )}
    </header>
  );
}

/* ─── Settings Hook ─────────────────────────────────────────────── */

function useSettings() {
  const [level, setLevelState] = useState<CefrLevel>('B2');
  const [mode, setModeState] = useState<TranslationMode>('local');
  const [endpoint, setEndpointState] = useState(DEFAULT_ENDPOINT);
  const [apiKey, setApiKeyState] = useState('');
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [autoSpeak, setAutoSpeakState] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Refs for latest values (used in debounced callbacks)
  const levelRef = useRef(level);
  const modeRef = useRef(mode);
  const autoSpeakRef = useRef(autoSpeak);
  levelRef.current = level;
  modeRef.current = mode;
  autoSpeakRef.current = autoSpeak;

  const endpointRef = useRef(endpoint);
  const apiKeyRef = useRef(apiKey);
  const modelRef = useRef(model);
  endpointRef.current = endpoint;
  apiKeyRef.current = apiKey;
  modelRef.current = model;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const llmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial settings
  useEffect(() => {
    getLlmConfig().then((config) => {
      // Level — map C2 to C1 since slider only goes to 5
      const lv: CefrLevel = config.level === 'C2' ? 'C1' : config.level;
      setLevelState((prev) => (prev === 'B2' ? lv : prev));
      setModeState((prev) => (prev === 'local' ? config.translationMode : prev));
      setAutoSpeakState(config.autoSpeak ?? false);
      if (config.llm) {
        const llm = config.llm;
        setEndpointState((prev) => (prev === DEFAULT_ENDPOINT ? llm.endpoint : prev));
        setApiKeyState((prev) => (prev === '' ? llm.apiKey : prev));
        setModelState((prev) => (prev === DEFAULT_MODEL ? llm.model : prev));
      }
    });
  }, []);

  // Debounced settings save
  const debouncedSaveSettings = useCallback(() => {
    setSaveStatus('pending');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      setSaveStatus('saving');
      saveSettings({ level: levelRef.current, translationMode: modeRef.current, autoSpeak: autoSpeakRef.current })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // Debounced LLM save
  const doSaveLlm = useCallback(async (showError: boolean) => {
    const err = validateLlmConfig({
      level: levelRef.current,
      mode: modeRef.current,
      endpoint: endpointRef.current,
      apiKey: apiKeyRef.current,
      model: modelRef.current,
    });
    if (err) {
      setSaveStatus('error');
      if (showError) toast.error(err);
      return;
    }
    setSaveStatus('saving');
    const empty = isConfigEmpty({
      endpoint: endpointRef.current,
      apiKey: apiKeyRef.current,
      model: modelRef.current,
    });
    try {
      if (empty) {
        await saveLlmConfig(null);
      } else {
        await saveLlmConfig({
          endpoint: endpointRef.current,
          apiKey: apiKeyRef.current,
          model: modelRef.current,
        });
      }
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      if (showError) toast.error(`没保存成功：${(e as Error).message}`);
    }
  }, []);

  const debouncedSaveLlm = useCallback(() => {
    setSaveStatus('pending');
    if (llmTimerRef.current) clearTimeout(llmTimerRef.current);
    llmTimerRef.current = setTimeout(() => {
      llmTimerRef.current = null;
      doSaveLlm(false);
    }, LLM_SAVE_DEBOUNCE_MS);
  }, [doSaveLlm]);

  // Flush LLM save immediately (on blur / unmount)
  const flushLlm = useCallback(() => {
    if (llmTimerRef.current !== null) {
      clearTimeout(llmTimerRef.current);
      llmTimerRef.current = null;
      doSaveLlm(true);
    }
  }, [doSaveLlm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveSettings({ level: levelRef.current, translationMode: modeRef.current });
      }
      if (llmTimerRef.current) {
        clearTimeout(llmTimerRef.current);
        llmTimerRef.current = null;
        doSaveLlm(true);
      }
    };
  }, [doSaveLlm]);

  const setLevel = useCallback(
    (l: CefrLevel) => {
      setLevelState(l);
      debouncedSaveSettings();
    },
    [debouncedSaveSettings],
  );

  const setMode = useCallback(
    (m: TranslationMode) => {
      setModeState(m);
      debouncedSaveSettings();
    },
    [debouncedSaveSettings],
  );

  const setAutoSpeak = useCallback(
    (v: boolean) => {
      setAutoSpeakState(v);
      debouncedSaveSettings();
    },
    [debouncedSaveSettings],
  );

  const setEndpoint = useCallback(
    (v: string) => {
      setEndpointState(v);
      debouncedSaveLlm();
    },
    [debouncedSaveLlm],
  );

  const setApiKey = useCallback(
    (v: string) => {
      setApiKeyState(v);
      debouncedSaveLlm();
    },
    [debouncedSaveLlm],
  );

  const setModel = useCallback(
    (v: string) => {
      setModelState(v);
      debouncedSaveLlm();
    },
    [debouncedSaveLlm],
  );

  return {
    level,
    setLevel,
    mode,
    setMode,
    autoSpeak,
    setAutoSpeak,
    endpoint,
    setEndpoint,
    apiKey,
    setApiKey,
    model,
    setModel,
    flushLlm,
    saveStatus,
  };
}

/* ─── Main App ──────────────────────────────────────────────────── */

function App() {
  const {
    level,
    setLevel,
    mode,
    setMode,
    autoSpeak,
    setAutoSpeak,
    endpoint,
    setEndpoint,
    apiKey,
    setApiKey,
    model,
    setModel,
    flushLlm,
    saveStatus,
  } = useSettings();

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  /** Test LLM connection */
  async function handleTestConnection() {
    const cfg = { level, mode, endpoint, apiKey, model };
    const err = validateLlmConfig(cfg);
    if (err) {
      setTestResult({ ok: false, msg: err });
      return;
    }
    if (isConfigEmpty(cfg)) {
      setTestResult({ ok: false, msg: '先把接口地址和模型填上。' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const resp = await fetch(chatCompletionsUrl(endpoint), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Reply with JSON {"ok":true}.' },
            { role: 'user', content: 'ping' },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 20,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!resp.ok) {
        setTestResult({ ok: false, msg: `HTTP ${resp.status}` });
        return;
      }

      const content = (await resp.json())?.choices?.[0]?.message?.content;
      if (!content) {
        setTestResult({ ok: false, msg: '接口返回的内容是空的。' });
        return;
      }
      JSON.parse(content);
      setTestResult({ ok: true, msg: '连通了。' });
    } catch (e) {
      setTestResult({ ok: false, msg: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  const llmConfig: LlmConfig | null = useMemo(() => {
    if (!endpoint && !apiKey && !model) return null;
    return { endpoint, apiKey, model };
  }, [endpoint, apiKey, model]);

  return (
    <main className="mx-auto max-w-[720px] px-5 pt-10 pb-20 min-[640px]:px-10 min-[640px]:pt-20 min-[640px]:pb-[120px]">
      <ReadtoToaster />

      <Header right={<StatusIndicator status={saveStatus} />} />

      <p className="mb-10 max-w-[56ch] font-serif text-[14px] leading-[1.6] text-muted-foreground">
        装好了。打开任何英文网页，超出你水平的词会自动带上中文注音。
      </p>

      {/* Level selector + Live preview */}
      <LevelPreview
        level={level}
        onLevelChange={setLevel}
        mode={mode}
        llm={llmConfig}
      />

      {/* AI toggle */}
      <Section>
        <label htmlFor="llm-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex cursor-pointer items-start gap-4 py-2">
          <input
            id="llm-toggle"
            type="checkbox"
            checked={mode === 'llm'}
            onChange={(e) => setMode(e.target.checked ? 'llm' : 'local')}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={
              'mt-[3px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background ' +
              (mode === 'llm'
                ? 'border-foreground bg-foreground text-background'
                : 'border-muted-foreground')
            }
          >
            {mode === 'llm' && (
              <svg
                viewBox="0 0 10 8"
                className="h-[8px] w-[10px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1,4 3.5,6.5 9,1" />
              </svg>
            )}
          </span>
          <div>
            <div className="font-serif text-[17px] font-semibold -tracking-[0.005em] text-foreground">
              开启 AI 增强
            </div>
            <div className="mt-0.5 max-w-[56ch] text-[13px] text-muted-foreground">
              可选：用你的 API key 做上下文感知翻译，更准一点
            </div>
          </div>
        </label>
      </Section>

      {/* Auto-speak toggle */}
      <Section>
        <label htmlFor="auto-speak-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex cursor-pointer items-start gap-4 py-2">
          <input
            id="auto-speak-toggle"
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => setAutoSpeak(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={
              'mt-[3px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background ' +
              (autoSpeak
                ? 'border-foreground bg-foreground text-background'
                : 'border-muted-foreground')
            }
          >
            {autoSpeak && (
              <svg
                viewBox="0 0 10 8"
                className="h-[8px] w-[10px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1,4 3.5,6.5 9,1" />
              </svg>
            )}
          </span>
          <div>
            <div className="font-serif text-[17px] font-semibold -tracking-[0.005em] text-foreground">
              悬停自动朗读
            </div>
            <div className="mt-0.5 max-w-[56ch] text-[13px] text-muted-foreground">
              鼠标悬停生词时自动播放英文发音
            </div>
          </div>
        </label>
      </Section>      {/* LLM config (expandable) */}
      {mode === 'llm' && (
        <Section>
          <div className="space-y-5">
            <LabeledInput
              id="endpoint"
              label="接口地址"
              type="url"
              value={endpoint}
              onChange={setEndpoint}
              onBlur={flushLlm}
            />
            <LabeledInput
              id="apiKey"
              label="API key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={setApiKey}
              onBlur={flushLlm}
            />
            <LabeledInput
              id="model"
              label="模型"
              type="text"
              value={model}
              onChange={setModel}
              onBlur={flushLlm}
            />
          </div>

          {/* Test connection button */}
          <div className="mt-7 flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center gap-2 border border-foreground px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            >
              {testing ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  测试中…
                </>
              ) : (
                '测试连接'
              )}
            </button>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              role={testResult.ok ? 'status' : 'alert'}
              className={
                'mt-4 border-l-2 pl-3 text-[12px] ' +
                (testResult.ok
                  ? 'border-[#166534] text-[#166534]'
                  : 'border-[#b91c1c] text-[#b91c1c]')
              }
            >
              {testResult.ok ? '✓ ' : '✗ '}
              {testResult.msg}
            </div>
          )}

          {/* Refresh note */}
          <div className="mt-16 flex items-center justify-end border-t border-foreground pt-6">
            <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              刷新网页后才会生效
            </span>
          </div>
        </Section>
      )}

      {/* Privacy section */}
      <aside className="mt-24 border-t border-border pt-5">
        <h3 className="mb-2.5 font-serif text-sm font-semibold">关于隐私</h3>
        <p className="max-w-[60ch] text-[12px] leading-[1.65] text-muted-foreground">
          插件本身不收集任何数据。开启 LLM 增强后，网页段落会直接发送到你配置的 LLM 接口，插件作者看不到这些内容。 完整说明见{' '}
          <a
            href="https://readto.ai/privacy"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2 hover:text-foreground"
          >
            readto.ai/privacy
          </a>
          。
        </p>
      </aside>
    </main>
  );
}

// ─── Mount ─────────────────────────────────────────────────────────

const root = document.getElementById('root');
if (!root) throw new Error('options: #root missing');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
