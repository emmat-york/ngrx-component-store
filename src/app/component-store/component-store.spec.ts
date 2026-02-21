import { ComponentStore, INITIAL_STATE_INJECTION_TOKEN } from './component-store';
import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { Subject, tap } from 'rxjs';

interface ComponentStoreState {
  name: string;
  age: number;
  car: {
    brand: string;
    isElectric: boolean;
  };
  isMarried: boolean;
}

const INITIAL_STATE: ComponentStoreState = {
  name: 'Andrei',
  age: 30,
  car: {
    brand: 'BMW',
    isElectric: false,
  },
  isMarried: false,
};

describe('ComponentStore', () => {
  let componentStore: ComponentStore<ComponentStoreState>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ComponentStore,
        { provide: INITIAL_STATE_INJECTION_TOKEN, useValue: INITIAL_STATE },
      ],
    });

    componentStore = TestBed.inject(ComponentStore) as ComponentStore<ComponentStoreState>;
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(componentStore).toBeDefined();
    });

    it('initial state', () => {
      const currentState = componentStore.get();

      expect(currentState).toEqual(INITIAL_STATE);
    });
  });

  describe('get', () => {
    it("'get(fn)' should return correct snapshot", () => {
      const partialState = {
        name: 'Emmat',
        car: { brand: 'Tesla', isElectric: true },
      };

      componentStore.patchState(partialState);

      const result = componentStore.get(state => ({ name: state.name, car: state.car }));

      expect(result).toEqual(partialState);
    });

    it("'get' should return correct snapshot", () => {
      const newState: ComponentStoreState = {
        name: 'Darth Vader',
        age: 40,
        car: {
          brand: 'Space vessel',
          isElectric: true,
        },
        isMarried: true,
      };

      componentStore.setState(newState);

      const result = componentStore.get();

      expect(result).toEqual(newState);
    });
  });

  describe('updater', () => {
    it("'updater' should update state correctly", () => {
      const newValues = {
        name: 'Darth Sidious',
        car: { brand: 'Executor', isElectric: true },
      };

      const updaterFn = componentStore.updater<{
        name: string;
        car: { brand: string; isElectric: boolean };
      }>((state, payload) => ({ ...state, ...payload }));

      updaterFn(newValues);

      const currentState = componentStore.get();

      const expectedState: ComponentStoreState = {
        age: INITIAL_STATE.age,
        isMarried: INITIAL_STATE.isMarried,
        ...newValues,
      };

      expect(expectedState).toEqual(currentState);
    });

    it("'updater' should use latest state on consecutive calls", () => {
      const inc = componentStore.updater<number>((state, by) => ({
        ...state,
        age: state.age + by,
      }));

      inc(1);
      inc(2);

      const currentState = componentStore.get();

      expect(currentState.age).toBe(INITIAL_STATE.age + 3);
    });
  });

  describe('setState', () => {
    it("'setState' should set state correctly", () => {
      const newState: ComponentStoreState = {
        name: 'Han Solo',
        age: 33,
        car: {
          brand: 'Millennium Falcon',
          isElectric: true,
        },
        isMarried: true,
      };

      componentStore.setState(newState);

      const result = componentStore.get();

      expect(newState).toEqual(result);
    });

    it("'setState with fn' should set state correctly", () => {
      componentStore.setState(state => ({ ...state, age: 41, name: state.car.brand }));

      const currentState = componentStore.get();

      expect(currentState).toEqual({ ...INITIAL_STATE, age: 41, name: INITIAL_STATE.car.brand });
    });

    it("'setState(fn)' should use latest state on consecutive calls", () => {
      componentStore.setState(state => ({ ...state, age: state.age + 1 }));
      componentStore.setState(state => ({ ...state, age: state.age + 1 }));

      const currentState = componentStore.get();

      expect(currentState.age).toBe(INITIAL_STATE.age + 2);
    });
  });

  describe('patchState', () => {
    it("'patchState' should patch state correctly", () => {
      const partialState = {
        name: 'Han Solo',
        car: {
          brand: 'Millennium Falcon',
          isElectric: true,
        },
      };

      componentStore.patchState(partialState);

      const currentState = componentStore.get();

      const expectedState: ComponentStoreState = {
        age: INITIAL_STATE.age,
        isMarried: INITIAL_STATE.isMarried,
        ...partialState,
      };

      expect(expectedState).toEqual(currentState);
    });

    it("'patchState with fn' should patch state correctly", () => {
      componentStore.patchState(state => ({
        name: 'Qui-Gon Jinn',
        car: { brand: state.name, isElectric: true },
      }));

      const currentState = componentStore.get();

      const expectedState: ComponentStoreState = {
        name: 'Qui-Gon Jinn',
        car: { brand: INITIAL_STATE.name, isElectric: true },
        age: INITIAL_STATE.age,
        isMarried: INITIAL_STATE.isMarried,
      };

      expect(expectedState).toEqual(currentState);
    });

    it("'patchState' should shallow-merge (nested object replaced)", () => {
      componentStore.patchState({
        car: { brand: 'Tesla', isElectric: true },
      });

      componentStore.patchState(state => ({
        car: { ...state.car, brand: 'Audi' },
      }));

      const currentState = componentStore.get();
      const expectedState = {
        ...INITIAL_STATE,
        car: { isElectric: true, brand: 'Audi' },
      };

      expect(expectedState).toEqual(currentState);
    });
  });

  describe('effect', () => {
    it("'effect' should execute with static value", () => {
      const calls: string[] = [];

      const trigger = componentStore.effect<string>(source$ =>
        source$.pipe(tap(value => calls.push(value))),
      );

      trigger('hello');

      expect(calls).toEqual(['hello']);
    });

    it("'effect' should execute with Observable input", () => {
      const calls: number[] = [];

      const trigger = componentStore.effect<number>(source$ =>
        source$.pipe(tap(value => calls.push(value))),
      );

      const input$ = new Subject<number>();

      trigger(input$);

      input$.next(1);
      input$.next(2);

      expect(calls).toEqual([1, 2]);
    });

    it("'effect' should stop when subscription unsubscribed", () => {
      const calls: number[] = [];

      const trigger = componentStore.effect<number>(source$ =>
        source$.pipe(tap(value => calls.push(value))),
      );

      const input$ = new Subject<number>();
      const sub = trigger(input$);

      input$.next(1);
      sub.unsubscribe();
      input$.next(2);

      expect(calls).toEqual([1]);
    });

    it("'effect' should support multiple triggers", () => {
      const calls: string[] = [];

      const trigger = componentStore.effect<string>(source$ =>
        source$.pipe(tap(value => calls.push(value))),
      );

      trigger('a');
      trigger('b');
      trigger('c');

      expect(calls).toEqual(['a', 'b', 'c']);
    });

    it("'effect' should be able to update state (integration)", () => {
      const incAge = componentStore.updater<number>((state, by) => ({
        ...state,
        age: state.age + by,
      }));

      const trigger = componentStore.effect<number>(source$ => source$.pipe(tap(by => incAge(by))));

      trigger(5);

      expect(componentStore.get().age).toBe(INITIAL_STATE.age + 5);
    });
  });

  it("'ngOnDestroy' should complete state$", () => {
    let completed: boolean = false;

    componentStore['state$'].subscribe({
      complete: () => {
        completed = true;
      },
    });

    componentStore.ngOnDestroy();

    expect(completed).toBeTrue();
  });

  describe('select(fn)', () => {
    it("'select(fn)' should emit initial selected value immediately", () => {
      const values: number[] = [];

      componentStore.select(state => state.age).subscribe(value => values.push(value));

      expect(values).toEqual([INITIAL_STATE.age]);
    });

    it("'select(fn)' should emit when selected value changes", () => {
      const values: number[] = [];

      componentStore.select(state => state.age).subscribe(value => values.push(value));

      componentStore.patchState(state => ({ age: state.age + 1 }));
      componentStore.patchState({ age: 100 });

      expect(values).toEqual([INITIAL_STATE.age, INITIAL_STATE.age + 1, 100]);
    });

    it("'select(fn)' should NOT emit when selected value does not change (default distinctUntilChanged)", () => {
      const values: string[] = [];

      componentStore.select(state => state.name).subscribe(value => values.push(value));

      componentStore.patchState({ age: 1, car: { brand: 'TOYOTA', isElectric: true } });
      componentStore.patchState({ age: 2 });

      expect(values).toEqual([INITIAL_STATE.name]);
    });

    it("'select(fn)' should use custom equal comparator", () => {
      const values: number[] = [];

      componentStore
        .select(state => state.age, { equal: (a, b) => a > b })
        .subscribe(value => values.push(value));

      componentStore.patchState({ age: 15 });
      componentStore.patchState({ age: 40 });
      componentStore.patchState({ age: 10 });
      componentStore.patchState({ age: 31 });

      expect(values).toEqual([30, 40]);
    });

    it("'select(fn)' debounce=true should coalesce synchronous updates into one emission (microtask)", fakeAsync(() => {
      const values: number[] = [];

      componentStore
        .select(state => state.age, { debounce: true })
        .subscribe(value => values.push(value));

      componentStore.patchState({ age: 1 });
      componentStore.patchState({ age: 2 });
      componentStore.patchState({ age: 3 });

      expect(values).toEqual([]);

      flushMicrotasks();

      expect(values).toEqual([3]);
    }));

    it("'select(fn)' debounce=true should emit initial value after microtask if no sync updates happen", fakeAsync(() => {
      const values: number[] = [];

      componentStore
        .select(state => state.age, { debounce: true })
        .subscribe(value => values.push(value));

      expect(values).toEqual([]); // initial debounced

      flushMicrotasks();

      expect(values).toEqual([INITIAL_STATE.age]);
    }));

    it("'select(fn)' debounce=true should emit again on later async update (two microtasks)", fakeAsync(() => {
      const values: number[] = [];

      componentStore
        .select(state => state.age, { debounce: true })
        .subscribe(value => values.push(value));

      flushMicrotasks();
      expect(values).toEqual([INITIAL_STATE.age]);

      componentStore.patchState({ age: 99 });

      // new tick -> debounce again
      expect(values).toEqual([INITIAL_STATE.age]);

      flushMicrotasks();

      expect(values).toEqual([INITIAL_STATE.age, 99]);
    }));

    it("'select(fn)' should replay last selected value to late subscribers (shareReplay)", () => {
      const a: number[] = [];
      const b: number[] = [];

      const age$ = componentStore.select(state => state.age);

      age$.subscribe(value => a.push(value));
      componentStore.patchState({ age: 42 });

      age$.subscribe(value => b.push(value)); // Late subscription should immediately receive 42

      expect(a).toEqual([INITIAL_STATE.age, 42]);
      expect(b).toEqual([42]);
    });

    it("'select(fn)' should resubscribe correctly after all subscribers unsubscribed (refCount)", () => {
      const values: number[] = [];

      const age$ = componentStore.select(state => state.age);

      const sub = age$.subscribe(value => values.push(value));
      sub.unsubscribe();

      componentStore.patchState({ age: 77 }); // change the state while no one is subscribed

      age$.subscribe(value => values.push(value)); // the new subscription should receive the current value 77

      expect(values).toEqual([INITIAL_STATE.age, 77]);
    });

    it("'select(fn)' should complete selector on store destroy", () => {
      let completed: boolean = false;

      componentStore
        .select(state => state.age)
        .subscribe({
          complete: () => {
            completed = true;
          },
        });

      componentStore.ngOnDestroy();

      expect(completed).toBeTrue();
    });
  });

  describe('select(vm)', () => {
    it("'select(vm)' should emit initial view model", () => {
      const values: Array<{ name: string; age: number }> = [];

      const name$ = componentStore.select(state => state.name);
      const age$ = componentStore.select(state => state.age);

      componentStore.select({ name: name$, age: age$ }).subscribe(vm => values.push(vm));

      expect(values).toEqual([{ name: INITIAL_STATE.name, age: INITIAL_STATE.age }]);
    });

    it("'select(vm)' should emit when any selector emits (updates one field)", () => {
      const values: Array<{ name: string; age: number }> = [];

      const name$ = componentStore.select(state => state.name);
      const age$ = componentStore.select(state => state.age);

      componentStore.select({ name: name$, age: age$ }).subscribe(vm => values.push(vm));

      componentStore.patchState({ age: 99 });

      expect(values).toEqual([
        { name: INITIAL_STATE.name, age: INITIAL_STATE.age },
        { name: INITIAL_STATE.name, age: 99 },
      ]);
    });

    it("'select(vm)' debounce=true should coalesce multiple synchronous selector emissions into one vm emission", fakeAsync(() => {
      const values: Array<{ name: string; age: number }> = [];

      const name$ = componentStore.select(state => state.name);
      const age$ = componentStore.select(state => state.age);

      componentStore
        .select({ name: name$, age: age$ }, { debounce: true })
        .subscribe(vm => values.push(vm));

      componentStore.patchState({ age: 1 });
      componentStore.patchState({ age: 2 });
      componentStore.patchState({ age: 3 });

      expect(values).toEqual([]); // debounceSync holds emit until microtask

      flushMicrotasks();

      expect(values).toEqual([{ name: INITIAL_STATE.name, age: 3 }]);
    }));

    it("'select(vm)' should replay last vm to late subscribers (shareReplay)", () => {
      const a: Array<{ name: string; age: number }> = [];
      const b: Array<{ name: string; age: number }> = [];

      const name$ = componentStore.select(state => state.name);
      const age$ = componentStore.select(state => state.age);

      const vm$ = componentStore.select({ name: name$, age: age$ });

      vm$.subscribe(vm => a.push(vm));

      componentStore.patchState({ age: 42 });

      vm$.subscribe(vm => b.push(vm)); // A late subscription should receive the latest immediately.

      expect(a).toEqual([
        { name: INITIAL_STATE.name, age: INITIAL_STATE.age },
        { name: INITIAL_STATE.name, age: 42 },
      ]);

      expect(b).toEqual([{ name: INITIAL_STATE.name, age: 42 }]);
    });

    it("'select(vm)' should use custom equal comparator to prevent emissions when vm values are equal", () => {
      const values: Array<{ name: string; age: number }> = [];

      const name$ = componentStore.select(state => state.name);
      const age$ = componentStore.select(state => state.age);

      // shallowEqual by fields
      const equal = (a: { name: string; age: number }, b: { name: string; age: number }) =>
        a.name === b.name && a.age === b.age;

      componentStore.select({ name: name$, age: age$ }, { equal }).subscribe(vm => values.push(vm));

      // 1) change age -> emission
      componentStore.patchState({ age: 31 });

      // 2) patch with the same value -> the leaf selector age$ doesn't emit (distinctUntilChanged),
      // but even if it did emit, equal will protect against unnecessary vm-emission.
      componentStore.patchState({ age: 31 });

      expect(values).toEqual([
        { name: INITIAL_STATE.name, age: INITIAL_STATE.age },
        { name: INITIAL_STATE.name, age: 31 },
      ]);
    });

    it("'select(vm)' should complete vm selector on store destroy", () => {
      let completed: boolean = false;

      const name$ = componentStore.select(state => state.name);
      const age$ = componentStore.select(state => state.age);

      componentStore.select({ name: name$, age: age$ }).subscribe({
        complete: () => {
          completed = true;
        },
      });

      componentStore.ngOnDestroy();

      expect(completed).toBeTrue();
    });
  });
});
