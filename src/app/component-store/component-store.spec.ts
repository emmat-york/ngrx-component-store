import { ComponentStore, INITIAL_STATE_INJECTION_TOKEN } from './component-store';
import { TestBed } from '@angular/core/testing';
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

  it('should be created', () => {
    expect(componentStore).toBeDefined();
  });

  it('init state check', () => {
    const initialState = componentStore.get();

    expect(initialState).toEqual(INITIAL_STATE);
  });

  it("'get with fn' should return correct snapshot", () => {
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

  it("'effect' should execute with static value", () => {
    const calls: string[] = [];

    const trigger = componentStore.effect<string>(source$ => source$.pipe(tap(v => calls.push(v))));

    trigger('hello');

    expect(calls).toEqual(['hello']);
  });

  it("'effect' should execute with Observable input", () => {
    const calls: number[] = [];

    const trigger = componentStore.effect<number>(source$ => source$.pipe(tap(v => calls.push(v))));

    const input$ = new Subject<number>();

    trigger(input$);

    input$.next(1);
    input$.next(2);

    expect(calls).toEqual([1, 2]);
  });

  it("'effect' should stop when subscription unsubscribed", () => {
    const calls: number[] = [];

    const trigger = componentStore.effect<number>(source$ => source$.pipe(tap(v => calls.push(v))));

    const input$ = new Subject<number>();
    const sub = trigger(input$);

    input$.next(1);
    sub.unsubscribe();
    input$.next(2);

    expect(calls).toEqual([1]);
  });

  it("'effect' should support multiple triggers", () => {
    const calls: string[] = [];

    const trigger = componentStore.effect<string>(source$ => source$.pipe(tap(v => calls.push(v))));

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
