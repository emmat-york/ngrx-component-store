import {
  distinctUntilChanged,
  BehaviorSubject,
  combineLatest,
  isObservable,
  Subscription,
  Observable,
  shareReplay,
  identity,
  map,
  of,
} from 'rxjs';
import { DestroyRef, inject, Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceSync } from './utils';

type ViewModel<SelectorsObject extends Record<string, Observable<unknown>>> = {
  [Key in keyof SelectorsObject]: SelectorsObject[Key] extends Observable<infer U> ? U : never;
};

type SelectorsResult<Selectors extends Observable<unknown>[]> = {
  [Key in keyof Selectors]: Selectors[Key] extends Observable<infer U> ? U : never;
};

interface SelectConfig {
  debounce: true;
}

export const INITIAL_STATE_INJECTION_TOKEN = new InjectionToken<unknown>(
  'https://github.com/emmat-york/ngrx-component-store',
);

@Injectable()
export class ComponentStore<State extends object> implements OnDestroy {
  protected readonly state$: Observable<State>;

  private readonly stateSubject$: BehaviorSubject<State>;
  private readonly destroyRef = inject(DestroyRef);

  constructor(@Inject(INITIAL_STATE_INJECTION_TOKEN) state: State) {
    this.stateSubject$ = new BehaviorSubject<State>(state);
    this.state$ = this.stateSubject$.asObservable();
  }

  ngOnDestroy(): void {
    this.stateSubject$.complete();
  }

  /**
   * @description Creates an updater state function.
   * @param updaterFn A function that returns a new instance of the state and takes two parameters:
   *  - `state`: current store's state;
   *  - `payload`: any payload.
   * @return A function that accepts the payload and forwards it as the
   * second argument to `updaterFn`. This function will update the store's state according to the update you provided.
   **/
  updater<Payload>(
    updaterFn: (state: State, payload: Payload) => State,
  ): (payload: Payload) => void {
    return (payload: Payload): void => {
      this.stateSubject$.next(updaterFn(this.frozenState(), payload));
    };
  }

  /**
   * @description This method selects a specific part of the state using the provided selector function.
   * @param selectFn A selector function that accepts the current state and returns an
   * Observable of the selected store's part.
   * @param config An optional object that allows controlling the frequency of value emissions in the select,
   * preventing excessive notifications during rapid state updates.
   * @return An Observable that emits the selected value.
   **/
  select<Output>(selectFn: (state: State) => Output, config?: SelectConfig): Observable<Output>;

  /**
   * @description This method selects multiple parts of the state using the provided selectors
   * and returns a combined observable that emits a view model.
   * @param selectors An object whose key values are store's selectors.
   * @param config An optional object that allows controlling the frequency of value emissions in the select,
   * preventing excessive notifications during rapid state updates.
   * @return An Observable which emits an object whose properties are the values returned by each selector in `selectors`.
   **/
  select<Selectors extends Record<string, Observable<unknown>>>(
    selectors: Selectors,
    config?: SelectConfig,
  ): Observable<ViewModel<Selectors>>;

  /**
   * @description Selects multiple parts of the state using the provided selectors
   * and applies the given selector function to combine the results.
   * @param selectorsWithProjector A tuple of selectors and a selector function:
   *  - `selectors`: An array of observables that select different parts of the state;
   *  - `projector`: A function that takes the results of all the selectors and returns a combined output.
   * @return An Observable that emits the result of the `selectFn` applied to the selected state parts.
   **/
  select<Selectors extends Observable<unknown>[], Output>(
    ...selectorsWithProjector: [
      ...selectros: Selectors,
      projector: (...results: SelectorsResult<Selectors>) => Output,
    ]
  ): Observable<Output>;

  select<
    SelectFn extends (state: State) => Output,
    SelectorsObject extends Record<string, Observable<unknown>>,
    SelectorsWithProjector extends [...selectros: Observable<unknown>[], projector: Projector],
    Projector extends (...results: SelectorsResult<Observable<unknown>[]>) => Output,
    Output,
  >(
    ...collection:
      | [SelectFn, SelectConfig?]
      | [SelectorsObject, SelectConfig?]
      | SelectorsWithProjector
  ): Observable<Output | ViewModel<SelectorsObject>> {
    if (typeof collection[0] === 'function') {
      const [selectFn, config] = collection as [SelectFn, SelectConfig?];

      return this.state$.pipe(
        map(selectFn),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 1, refCount: true }),
        config?.debounce ? debounceSync() : identity,
      );
    } else if (isObservable(collection[0])) {
      const selectors = collection.slice(0, -1) as Observable<unknown>[];
      const projector = collection[collection.length - 1] as Projector;

      return combineLatest(selectors).pipe(
        map(values => projector(...values)),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    } else {
      const [vm, config] = collection as [SelectorsObject, SelectConfig?];

      return combineLatest(vm).pipe(
        shareReplay({ bufferSize: 1, refCount: true }),
        config?.debounce ? debounceSync() : identity,
      ) as Observable<ViewModel<SelectorsObject>>;
    }
  }

  get(): State;
  get<Output>(getFn: (state: State) => Output): Output;

  /**
   * @description This method returns the current state snapshot.
   * @param getFn An optional function that accepts the current state object.
   * @return The current state object (if `getFn` is not provided) or a specific value,
   * depending on the selector function you provide.
   **/
  get<Output>(getFn?: (state: State) => Output): State | Output {
    return getFn ? getFn(this.frozenState()) : this.frozenState();
  }

  setState(setStateFn: (state: State) => State): void;
  setState(state: State): void;

  /**
   * @description This method allows updating the store's state.
   * @param stateOrSetStateFn either a new state object or a function that updates the state based on the current state.
   **/
  setState(stateOrSetStateFn: State | ((state: State) => State)): void {
    const updatedState =
      typeof stateOrSetStateFn === 'function'
        ? stateOrSetStateFn(this.frozenState())
        : stateOrSetStateFn;

    this.stateSubject$.next(updatedState);
  }

  patchState(state: Partial<State>): void;
  patchState(patchStateFn: (state: State) => Partial<State>): void;

  /**
   * @description This method allows partially updating the store's state.
   * @param partialStateOrPatchStateFn either a partial state object or a function that updates
   * the state, either partially or fully, based on the current state.
   **/
  patchState(
    partialStateOrPatchStateFn: Partial<State> | ((state: State) => Partial<State>),
  ): void {
    const partiallyUpdatedState =
      typeof partialStateOrPatchStateFn === 'function'
        ? partialStateOrPatchStateFn(this.frozenState())
        : partialStateOrPatchStateFn;

    this.stateSubject$.next({ ...this.frozenState(), ...partiallyUpdatedState });
  }

  /**
   * @description Creates an effect function.
   * @param effectFn A function that takes an origin Observable input and
   * returns an Observable. The Observable that is returned will be automatically subscribed.
   * @return A function that will trigger the origin Observable.
   **/
  effect<Value>(
    effectFn: (source$: Observable<Value>) => Observable<unknown>,
  ): (staticValueOrSource: Value | Observable<Value>) => Subscription {
    return (staticValueOrSource: Value | Observable<Value>) => {
      const source$ = isObservable(staticValueOrSource)
        ? staticValueOrSource
        : of(staticValueOrSource);

      return effectFn(source$).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    };
  }

  private frozenState(): State {
    // Since the store state must be immutable, we need to prevent accidental mutations. Therefore, it is provided in a frozen form.
    return Object.freeze(this.stateSubject$.getValue());
  }
}
