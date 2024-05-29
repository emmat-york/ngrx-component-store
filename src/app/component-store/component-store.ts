import { BehaviorSubject, combineLatest, EMPTY, map, Observable, of } from 'rxjs';
import { DestroyRef, inject, Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type ReactiveState<State extends object> = {
  [Key in keyof State]: BehaviorSubject<State[Key]>;
};

type VM<SelectorsObject extends Record<string, Observable<unknown>>> = {
  [Key in keyof SelectorsObject]: SelectorsObject[Key] extends Observable<infer U> ? U : never;
};

type SelectorsResult<Selectors extends Observable<unknown>[]> = {
  [Key in keyof Selectors]: Selectors[Key] extends Observable<infer U> ? U : never;
};

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
  ): Observable<VM<Selectors>>;

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
    Config extends Array<SelectorsObject | SelectFn | SelectorsWithSelectFn>,
    Output,
  >(...config: Config): Observable<Output | VM<SelectorsObject>> {
    const [firstSelector] = config;

    if (config.length === 1 && typeof firstSelector === 'function') {
      return firstSelector(this.state).asObservable();
    }

    if (config.length === 1 && typeof firstSelector === 'object') {
      const selectorsObject = firstSelector as unknown as SelectorsObject;

      const keys: Array<keyof SelectorsObject> = [];
      const selectors: Observable<unknown>[] = [];

      for (const key in selectorsObject) {
        selectors.push(selectorsObject[key]);
        keys.push(key);
      }

      return combineLatest(selectors).pipe(
        map(values => {
          return values.reduce((vm: VM<SelectorsObject>, value, index) => {
            return {
              ...vm,
              [keys[index]]: value,
            };
          }, {} as VM<SelectorsObject>);
        }),
      );
    }

    const selectorsWithSelectFn = config as unknown as SelectorsWithSelectFn;
    const selectors: Observable<unknown>[] = [];
    let fn: (...values: SelectorsResult<Observable<unknown>[]>) => Output;

    for (const selectorOrSelect of selectorsWithSelectFn) {
      if (selectorOrSelect instanceof Observable) {
        selectors.push(selectorOrSelect);
      } else {
        fn = selectorOrSelect;
      }
    }

    return combineLatest(selectors).pipe(
      map((values: SelectorsResult<Observable<unknown>[]>) => fn(...values)),
    );
  }

  protected get(): State;
  protected get<Output>(getFn: (state: State) => Output): Output;

  protected get<Output>(getFn?: (state: State) => Output): State | Output {
    const latestState = this.frozenState;
    return getFn ? getFn(latestState) : latestState;
  }

  protected setState(setFn: (state: State) => State): void;
  protected setState(state: State): void;

  protected setState(stateOrSetFn: State | ((state: State) => State)): void {
    const updatedState =
      typeof stateOrSetFn === 'function' ? stateOrSetFn(this.frozenState) : stateOrSetFn;

    this.stateSubject$.next(updatedState);
    this.checkAndUpdateState(updatedState);
  }

  protected patchState(state: Partial<State>): void;
  protected patchState(patchFn: (state: State) => Partial<State>): void;

  protected patchState(
    partialStateOrPatchFn: Partial<State> | ((state: State) => Partial<State>),
  ): void {
    const frozenState = this.frozenState;
    const partiallyUpdatedState =
      typeof partialStateOrPatchFn === 'function'
        ? partialStateOrPatchFn(frozenState)
        : partialStateOrPatchFn;

    this.stateSubject$.next({ ...frozenState, ...partiallyUpdatedState });
    this.checkAndUpdateState(partiallyUpdatedState);
  }

  protected effect<Value, Output>(
    effectFn: (source$: Observable<Value>) => Observable<Output>,
  ): (staticValueOrSource?: Value | Observable<Value>) => void {
    return (staticValueOrSource?: Value | Observable<Value>) => {
      let source$: Observable<Value | never>;

      if (staticValueOrSource instanceof Observable) {
        source$ = staticValueOrSource;
      } else if (staticValueOrSource) {
        source$ = of(staticValueOrSource);
      } else {
        source$ = EMPTY;
      }

      effectFn(source$).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
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
