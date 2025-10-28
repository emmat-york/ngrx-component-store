import { TestBed } from '@angular/core/testing';
import { Component, OnDestroy } from '@angular/core';
import { Observable, Subject, of, defer } from 'rxjs';
import { ComponentStore } from './component-store';
import { INITIAL_STATE_INJECTION_TOKEN } from './component-store';

interface CounterState {
  count: number;
  label: string;
}

function createStore(initial: CounterState): ComponentStore<CounterState> {
  // Create inside an injection context so `inject(DestroyRef)` works
  return TestBed.runInInjectionContext(() => new ComponentStore<CounterState>(initial));
}

@Component({ selector: 'host-cmp', template: '' })
class HostComponent implements OnDestroy {
  store = new ComponentStore<CounterState>({ count: 0, label: 'init' });
  ngOnDestroy(): void {}
}

// —— Helpers ——
const inc = (state: CounterState, by: number): CounterState => ({
  ...state,
  count: state.count + by,
});

// wait until queued microtasks (queueMicrotask) flush
function flushMicrotasks(): Promise<void> {
  return new Promise<void>(resolve => queueMicrotask(() => resolve()));
}
// small async tick to allow task/macroqueue
function nextTick(): Promise<void> {
  return new Promise(r => setTimeout(r, 0));
}

describe('ComponentStore – full suite (single file)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HostComponent],
      providers: [
        {
          provide: INITIAL_STATE_INJECTION_TOKEN,
          useValue: { count: 0, label: 'init' } as CounterState,
        },
      ],
    });
  });

  // ===== State basics =====
  it('initializes with provided state (frozen snapshot)', () => {
    const store = createStore({ count: 1, label: 'one' });
    const snap = store.get();
    expect(snap).toEqual({ count: 1, label: 'one' });
    expect(Object.isFrozen(snap)).toBeTrue();

    // Attempting to mutate a frozen snapshot must throw in strict mode
    expect(() => {
      snap.count = 999;
    }).toThrowError(TypeError);

    // Internal state must remain intact
    expect(store.get()).toEqual({ count: 1, label: 'one' });
  });

  it('get(fn) maps current frozen state', () => {
    const store = createStore({ count: 2, label: 'two' });
    const doubled = store.get((s: CounterState) => s.count * 2);
    expect(doubled).toBe(4);
  });

  it('updater applies immutable updates', () => {
    const store = createStore({ count: 0, label: 'init' });
    const add = store.updater(inc);
    add(3);

    const snap = store.get();
    expect(snap).toEqual({ count: 3, label: 'init' });
    expect(Object.isFrozen(snap)).toBeTrue();
  });

  it('setState(state) replaces state; setState(fn) derives from current', () => {
    const store = createStore({ count: 0, label: 'a' });
    store.setState({ count: 10, label: 'b' });
    expect(store.get()).toEqual({ count: 10, label: 'b' });

    store.setState((s: CounterState) => ({ ...s, count: s.count + 5 }));
    expect(store.get()).toEqual({ count: 15, label: 'b' });
  });

  it('patchState(partial) shallow-merges; patchState(fn) merges returned partial', () => {
    const store = createStore({ count: 0, label: 'init' });
    store.patchState({ label: 'changed' });
    expect(store.get()).toEqual({ count: 0, label: 'changed' });

    store.patchState((s: CounterState) => ({ count: s.count + 7 }));
    expect(store.get()).toEqual({ count: 7, label: 'changed' });
  });

  // ===== select(fn) =====
  it('select(fn) maps + distinctUntilChanged; emits synchronously first time', async () => {
    const store = createStore({ count: 0, label: 'init' });
    const counts: number[] = [];

    const sub = store.select((s: CounterState) => s.count).subscribe((v: number) => counts.push(v));
    expect(counts).toEqual([0]); // sync first

    store.setState({ count: 0, label: 'init' }); // noop due to distinct
    store.patchState({ count: 1 });
    store.patchState({ count: 1 }); // noop
    store.patchState({ count: 2 });

    await nextTick();
    sub.unsubscribe();
    expect(counts).toEqual([0, 1, 2]);
  });

  it('select(fn) should replay last value to new subscribers (shareReplay(1))', async () => {
    const store = createStore({ count: 1, label: 'x' });
    const count$ = store.select((s: CounterState) => s.count);

    const firstValues: number[] = [];
    const secondValues: number[] = [];

    const sub1 = count$.subscribe((v: number) => firstValues.push(v));
    store.patchState({ count: 2 });
    await nextTick();

    const sub2 = count$.subscribe((v: number) => secondValues.push(v));

    await nextTick();
    sub1.unsubscribe();
    sub2.unsubscribe();

    expect(firstValues).toEqual([1, 2]);
    expect(secondValues).toEqual([2]);
  });

  // ===== select({ ... }) VM =====
  it('select(object) emits combined VM; shares & replays', async () => {
    const store = createStore({ count: 1, label: 'a' });

    const count$ = store.select(s => s.count);
    const label$ = store.select(s => s.label);

    const vm$ = store.select({ count: count$, label: label$ });

    const emissions: Array<{ count: number; label: string }> = [];
    const sub = vm$.subscribe(v => emissions.push(v));

    store.patchState({ count: 2 });
    store.patchState({ label: 'b' });

    await nextTick();

    // replay to a late subscriber
    const late: any[] = [];
    const sub2 = vm$.subscribe(v => late.push(v));
    await nextTick();

    sub.unsubscribe();
    sub2.unsubscribe();

    expect(emissions[0]).toEqual({ count: 1, label: 'a' });
    expect(emissions.some(e => e.count === 2 && e.label === 'a')).toBeTrue();
    expect(emissions.some(e => e.count === 2 && e.label === 'b')).toBeTrue();
    expect(late.at(-1)).toEqual({ count: 2, label: 'b' }); // replays last
  });

  // ===== select(...selectors, projector) =====
  it('select(...selectors, projector) combines, projects, distincts & replays', async () => {
    const store = createStore({ count: 1, label: 'a' });
    const count$ = store.select((s: CounterState) => s.count);
    const label$ = store.select((s: CounterState) => s.label);

    const summary$ = store.select(count$, label$, (c: number, l: string) => `${l}:${c}`);

    const values: string[] = [];
    const sub = summary$.subscribe((v: string) => values.push(v));

    store.patchState({ count: 2 }); // emit
    store.patchState({ label: 'b' }); // emit

    await nextTick();

    // Distinct on projector result: change label only should NOT emit when projector ignores it
    const parity$ = store.select(count$, label$, (c: number) => c % 2);
    const par: number[] = [];
    const parSub = parity$.subscribe((v: number) => par.push(v));

    store.patchState({ label: 'c' }); // projector output unchanged -> no emit
    store.patchState({ count: 3 }); // projector output changes -> emit

    await nextTick();

    // Replay to late subscriber
    const late: string[] = [];
    const sub2 = summary$.subscribe(v => late.push(v));
    await nextTick();

    sub.unsubscribe();
    parSub.unsubscribe();
    sub2.unsubscribe();

    expect(values[0]).toBe('a:1');
    expect(values).toContain('a:2');
    expect(values).toContain('b:2');
    expect(par).toEqual([0, 1]);
    expect(late.at(-1)).toBe('c:3');
  });

  it('projector work is shared across subscribers (no duplicate recompute)', async () => {
    const store = createStore({ count: 0, label: 'x' });

    const a$ = store.select((s: CounterState) => s.count);
    const b$ = store.select((s: CounterState) => s.label);

    let projectorCalls = 0;

    const combined$ = store.select(a$, b$, (c: number, l: string) => {
      projectorCalls++;
      return `${l}:${c}`;
    });

    const seen1: string[] = [];
    const seen2: string[] = [];

    const s1 = combined$.subscribe(v => seen1.push(v));
    const s2 = combined$.subscribe(v => seen2.push(v));

    store.patchState({ count: 1 });
    store.patchState({ label: 'y' });

    await nextTick();
    s1.unsubscribe();
    s2.unsubscribe();

    // projector должен вызваться по одному разу на изменение, а не на каждого подписчика
    expect(projectorCalls).toBe(1 /* initial */ + 1 /* count */ + 1 /* label */);
    expect(seen1.length).toBe(seen2.length);
    expect(seen1[0]).toBe(seen2[0]);
  });

  // ===== debounceSync behavior =====
  describe('select(fn, { debounce: true }) with debounceSync()', () => {
    it('collapses synchronous bursts to one emission per microtask', async () => {
      const store = createStore({ count: 0, label: 'x' });
      const values: number[] = [];

      const sub = store
        .select(s => s.count, { debounce: true })
        .subscribe((v: number) => values.push(v));

      // Immediately after subscription, nothing yet (debounced to microtask)
      expect(values).toEqual([]);

      // Burst in same macrotask
      store.patchState({ count: 1 });
      store.patchState({ count: 2 });
      store.patchState({ count: 3 });

      await flushMicrotasks();
      expect(values).toEqual([3]);

      // Next burst -> next microtask flush
      store.patchState({ count: 4 });
      store.patchState({ count: 5 });
      await flushMicrotasks();

      sub.unsubscribe();
      expect(values).toEqual([3, 5]);
    });

    it('flushes the latest buffered value on completion', async () => {
      const store = createStore({ count: 0, label: 'x' });
      const values: number[] = [];

      const sub = store
        .select((s: CounterState) => s.count, { debounce: true })
        .subscribe((v: number) => values.push(v));

      store.patchState({ count: 1 });
      store.patchState({ count: 2 });

      // Complete source: debounceSync must emit last buffered value
      store.ngOnDestroy();

      await nextTick();
      sub.unsubscribe();
      expect(values).toEqual([2]);
    });
  });

  // ===== effect() =====
  it('effect accepts static values and observables', async () => {
    const store = createStore({ count: 0, label: 'x' });

    const tapped: any[] = [];
    const fx = store.effect(
      (src$: Observable<any>) =>
        new Observable<any>(observer => {
          const sub = src$.subscribe(v => {
            tapped.push(v);
            observer.next(v);
          });
          return () => sub.unsubscribe();
        }),
    );

    const sub1 = fx(123);
    const sub2 = fx(of('abc'));

    await nextTick();
    sub1.unsubscribe();
    sub2.unsubscribe();
    expect(tapped).toEqual([123, 'abc']);
  });

  it('effect subscriptions are torn down on host destroy (DestroyRef)', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;

    const received: number[] = [];
    const trigger = new Subject<number>();

    const fx = host.store.effect((src$: Observable<number>) => src$);
    const sub = fx(trigger.asObservable());

    // observe normal store emissions
    const selectCount$ = host.store.select(s => s.count);
    const selectSub = selectCount$.subscribe(v => received.push(v));

    host.store.patchState({ count: 5 });

    fixture.destroy(); // triggers DestroyRef teardown inside store

    // After destroy, pushing more should not cause issues/leaks
    trigger.next(3);

    await nextTick();
    selectSub.unsubscribe();
    sub.unsubscribe();

    expect(received[0]).toBe(0);
    expect(received.at(-1)).toBe(5);
  });

  it('ngOnDestroy completes the internal subject (no further emissions)', async () => {
    const store = createStore({ count: 0, label: 'x' });
    const values: number[] = [];

    const sub = store.select((s: CounterState) => s.count).subscribe(v => values.push(v));

    expect(values).toEqual([0]); // initial sync emission

    store.ngOnDestroy();

    // Post-complete updates should not emit
    store.patchState({ count: 1 });

    await nextTick();
    sub.unsubscribe();
    expect(values).toEqual([0]);
  });

  // ===== refCount sanity (underlying source subscribes only when needed) =====
  it('select(..., projector) uses refCount: subscribes only while observers exist', async () => {
    const store = createStore({ count: 0, label: 'r' });

    // Track subscriptions to a cold observable we feed into a selector
    let activeSubs = 0;
    const cold$ = defer(
      () =>
        new Observable<number>(subscriber => {
          activeSubs++;
          subscriber.next(store.get((s: CounterState) => s.count));
          const int = setInterval(
            () => subscriber.next(store.get((s: CounterState) => s.count)),
            5,
          );
          return () => {
            clearInterval(int);
            activeSubs--;
          };
        }),
    );

    // Build a selector that includes the cold$ (simulate external stream in combineLatest)
    const count$ = store.select((s: CounterState) => s.count);
    const shared$ = store.select(count$, cold$, (c: number) => c);

    expect(activeSubs).toBe(0);

    const s1: number[] = [];
    const a = shared$.subscribe(v => s1.push(v));
    await nextTick();
    expect(activeSubs).toBe(1);

    const s2: number[] = [];
    const b = shared$.subscribe(v => s2.push(v));
    await nextTick();
    // still 1 because shareReplay({refCount:true}) shares upstream
    expect(activeSubs).toBe(1);

    a.unsubscribe();
    b.unsubscribe();
    await nextTick();
    expect(activeSubs).toBe(0);
  });
});
