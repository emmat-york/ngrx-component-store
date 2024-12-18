import {
  BehaviorSubject,
  combineLatest,
  isObservable,
  map,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import { DestroyRef, inject, Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

function isFunction(objectOrFunction: object | Function): objectOrFunction is Function {
  return typeof objectOrFunction === 'function';
}

type ReactiveState<State extends object> = {
  [Key in keyof State]: BehaviorSubject<State[Key]>;
};

type ViewModel<SelectorsObject extends Record<string, Observable<unknown>>> = {
  [Key in keyof SelectorsObject]: SelectorsObject[Key] extends Observable<infer U> ? U : never;
};

type SelectorsResult<Selectors extends Observable<unknown>[]> = {
  [Key in keyof Selectors]: Selectors[Key] extends Observable<infer U> ? U : never;
};

interface KeysWithSelectors<SelectorsObject extends Record<string, Observable<unknown>>> {
  keys: Array<keyof SelectorsObject>;
  selectors: Observable<unknown>[];
}

interface SelectorsWithSelectFunction<Output> {
  selectors: Observable<unknown>[];
  selectFn: (...results: SelectorsResult<Observable<unknown>[]>) => Output;
}

const INITIAL_STATE_INJECTION_TOKEN = new InjectionToken<unknown>(
  'https://github.com/emmat-york/ngrx-component-store',
);

@Injectable()
export class ComponentStore<State extends object> implements OnDestroy {
  protected readonly state$: Observable<State>;

  private readonly state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly stateSubject$: BehaviorSubject<State>;
  private readonly destroyRef = inject(DestroyRef);

  constructor(@Inject(INITIAL_STATE_INJECTION_TOKEN) state: State) {
    this.stateSubject$ = new BehaviorSubject<State>(state);
    this.state$ = this.stateSubject$.asObservable();

    for (const key in state) {
      this.state[key] = this.getPropAsBehaviourSubject(state, key);
    }

    Object.freeze(this.state);
  }

  ngOnDestroy(): void {
    for (const key in this.state) {
      this.state[key].complete();
    }

    this.stateSubject$.complete();
  }

  protected updater<Payload>(
    updaterFn: (state: State, payload: Payload) => State,
  ): (payload: Payload) => void {
    return (payload: Payload): void => {
      const updatedState = updaterFn(this.frozenState, payload);
      this.stateSubject$.next(updatedState);
      this.checkAndUpdateState(updatedState);
    };
  }

  protected select<Output>(
    selectFn: (state: ReactiveState<State>) => BehaviorSubject<Output>,
  ): Observable<Output>;

  protected select<Selectors extends Record<string, Observable<unknown>>>(
    selectors: Selectors,
  ): Observable<ViewModel<Selectors>>;

  protected select<Selectors extends Observable<unknown>[], Output>(
    ...selectorsWithSelectFn: [
      ...selectros: Selectors,
      selectFn: (...results: SelectorsResult<Selectors>) => Output,
    ]
  ): Observable<Output>;

  protected select<
    SelectFn extends (state: ReactiveState<State>) => BehaviorSubject<Output>,
    SelectorsObject extends Record<string, Observable<unknown>>,
    SelectorsWithSelectFn extends [
      ...selectros: Observable<unknown>[],
      selectFn: (...results: SelectorsResult<Observable<unknown>[]>) => Output,
    ],
    SelectorsWithSelectorsFn extends Array<SelectFn | SelectorsObject | SelectorsWithSelectFn>,
    Output,
  >(
    ...selectorsWithSelectorsFn: SelectorsWithSelectorsFn
  ): Observable<Output | ViewModel<SelectorsObject>> {
    const [firstSelector] = selectorsWithSelectorsFn;

    if (isFunction(firstSelector)) {
      return firstSelector(this.state).asObservable();
    } else if (isObservable(firstSelector)) {
      const selectorsWithSelectFn = selectorsWithSelectorsFn as unknown as SelectorsWithSelectFn;
      const { selectors, selectFn } = this.getSelectorsWithSelectFn<SelectorsWithSelectFn, Output>(
        selectorsWithSelectFn,
      );

      return combineLatest(selectors).pipe(map(values => selectFn(...values)));
    } else {
      const { keys, selectors } = this.getKeysWithSelectors(firstSelector as SelectorsObject);

      return combineLatest(selectors).pipe(
        map(selectorValues =>
          selectorValues.reduce((viewModel: ViewModel<SelectorsObject>, value, index) => {
            return {
              ...viewModel,
              [keys[index]]: value,
            };
          }, {} as ViewModel<SelectorsObject>),
        ),
      );
    }
  }

  protected get(): State;
  protected get<Output>(getFn: (state: State) => Output): Output;

  protected get<Output>(getFn?: (state: State) => Output): State | Output {
    const latestState = this.frozenState;
    return getFn ? getFn(latestState) : latestState;
  }

  protected setState(setStateFn: (state: State) => State): void;
  protected setState(state: State): void;

  protected setState(stateOrSetStateFn: State | ((state: State) => State)): void {
    const updatedState = isFunction(stateOrSetStateFn)
      ? stateOrSetStateFn(this.frozenState)
      : stateOrSetStateFn;

    this.stateSubject$.next(updatedState);
    this.checkAndUpdateState(updatedState);
  }

  protected patchState(state: Partial<State>): void;
  protected patchState(patchStateFn: (state: State) => Partial<State>): void;

  protected patchState(
    partialStateOrPatchStateFn: Partial<State> | ((state: State) => Partial<State>),
  ): void {
    const frozenState = this.frozenState;

    const partiallyUpdatedState = isFunction(partialStateOrPatchStateFn)
      ? partialStateOrPatchStateFn(frozenState)
      : partialStateOrPatchStateFn;

    this.stateSubject$.next({ ...frozenState, ...partiallyUpdatedState });
    this.checkAndUpdateState(partiallyUpdatedState);
  }

  protected effect<Value>(
    effectFn: (source$: Observable<Value>) => Observable<unknown>,
  ): (staticValueOrSource: Value | Observable<Value>) => Subscription {
    return (staticValueOrSource: Value | Observable<Value>) => {
      const source$ = isObservable(staticValueOrSource)
        ? staticValueOrSource
        : of(staticValueOrSource);

      return effectFn(source$).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    };
  }

  private checkAndUpdateState(stateToBeChecked: Partial<State>): void {
    const latestState = this.stateSubject$.getValue();

    for (const key in stateToBeChecked) {
      const valueOfLatestState = latestState[key];
      const valueOfOutdatedState = this.state[key].getValue();

      if (valueOfLatestState !== valueOfOutdatedState) {
        this.state[key].next(valueOfLatestState);
      }
    }
  }

  private getKeysWithSelectors<SelectorsObject extends Record<string, Observable<unknown>>>(
    selectorsObject: SelectorsObject,
  ): KeysWithSelectors<SelectorsObject> {
    const keys: Array<keyof SelectorsObject> = [];
    const selectors: Observable<unknown>[] = [];

    for (const key in selectorsObject) {
      selectors.push(selectorsObject[key]);
      keys.push(key);
    }

    return {
      selectors,
      keys,
    };
  }

  private getSelectorsWithSelectFn<
    SelectorsWithSelectFn extends [
      ...selectros: Observable<unknown>[],
      selectFn: (...results: SelectorsResult<Observable<unknown>[]>) => Output,
    ],
    Output,
  >(selectorsWithSelectFn: SelectorsWithSelectFn): SelectorsWithSelectFunction<Output> {
    const selectors: Observable<unknown>[] = [];
    let selectFn!: (...results: SelectorsResult<Observable<unknown>[]>) => Output;

    for (const selectorOrSelectFn of selectorsWithSelectFn) {
      if (isObservable(selectorOrSelectFn)) {
        selectors.push(selectorOrSelectFn);
      } else {
        selectFn = selectorOrSelectFn;
      }
    }

    return {
      selectors,
      selectFn,
    };
  }

  private getPropAsBehaviourSubject<Key extends keyof State>(
    state: State,
    key: Key,
  ): BehaviorSubject<State[Key]> {
    return new BehaviorSubject<State[Key]>(state[key]);
  }

  private get frozenState(): State {
    return Object.freeze(this.stateSubject$.getValue());
  }
}
