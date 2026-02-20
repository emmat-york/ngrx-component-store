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
  ObservedValueOf,
} from 'rxjs';
import {
  DestroyRef,
  inject,
  Inject,
  Injectable,
  InjectionToken,
  OnDestroy,
  ValueEqualityFn,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceSync } from './debounce-sync';

function isSelectConfig<T>(value: unknown): value is SelectConfig<T> {
  return (
    value !== null && typeof value === 'object' && !Array.isArray(value) && !isObservable(value)
  );
}

type ViewModel<SelectorsObject extends Record<string, Observable<unknown>>> = {
  [Key in keyof SelectorsObject]: ObservedValueOf<SelectorsObject[Key]>;
};

type SelectorsResult<Selectors extends Observable<unknown>[]> = {
  [Key in keyof Selectors]: ObservedValueOf<Selectors[Key]>;
};

type ProjectorFn<Selectors extends Observable<unknown>[], Output> = (
  ...results: SelectorsResult<Selectors>
) => Output;

interface SelectConfig<T> {
  debounce?: boolean;
  equal?: ValueEqualityFn<T>;
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
      this.commit(updaterFn(this.get(), payload));
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
  select<Output>(
    selectFn: (state: State) => Output,
    config?: SelectConfig<Output>,
  ): Observable<Output>;

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
    config?: SelectConfig<ViewModel<Selectors>>,
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
    ...selectorsWithProjector:
      | [...selectros: Selectors, projector: ProjectorFn<Selectors, Output>]
      | [
          ...selectros: Selectors,
          projector: ProjectorFn<Selectors, Output>,
          config: SelectConfig<Output>,
        ]
  ): Observable<Output>;

  select<
    SelectFn extends (state: State) => Output,
    SelectorsObject extends Record<string, Observable<unknown>>,
    Selectors extends Observable<unknown>[],
    Output,
  >(
    ...collection:
      | [SelectFn, SelectConfig<Output>?]
      | [SelectorsObject, SelectConfig<ViewModel<SelectorsObject>>?]
      | [...selectors: Selectors, projector: ProjectorFn<Selectors, Output>]
      | [
          ...selectors: Selectors,
          projector: ProjectorFn<Selectors, Output>,
          config: SelectConfig<Output>,
        ]
  ) {
    if (typeof collection.at(0) === 'function') {
      const [selectFn, config] = collection as [SelectFn, SelectConfig<Output>?];

      return this.state$.pipe(
        config?.debounce ? debounceSync() : identity,
        map(selectFn),
        distinctUntilChanged(config?.equal),
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntilDestroyed(this.destroyRef),
      );
    }

    if (isObservable(collection.at(0))) {
      const last = collection.at(-1);
      const hasConfig = isSelectConfig<Output>(last);
      const config = hasConfig ? last : undefined;

      const projector = (hasConfig ? collection.at(-2) : last) as ProjectorFn<Selectors, Output>;

      const selectors = (
        hasConfig ? collection.slice(0, -2) : collection.slice(0, -1)
      ) as Observable<unknown>[];

      return combineLatest(selectors).pipe(
        map(values => projector(...(values as SelectorsResult<Selectors>))),
        distinctUntilChanged(config?.equal),
        config?.debounce ? debounceSync() : identity,
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntilDestroyed(this.destroyRef),
      );
    }

    const [vm, config] = collection as [SelectorsObject, SelectConfig<ViewModel<SelectorsObject>>?];

    return combineLatest(vm).pipe(
      distinctUntilChanged(config?.equal),
      config?.debounce ? debounceSync() : identity,
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntilDestroyed(this.destroyRef),
    );
  }

  get(): State;
  get<Output>(getFn: (state: State) => Output): Output;

  /**
   * @description This method returns the current state snapshot.
   * @param getFn An optional function that accepts the current state object.
   * @return The current state object (if `getFn` is not provided) or a specific value,
   * depending on the selector function you provide.
   **/
  get<Output>(getFn?: (state: State) => Output) {
    const state = this.stateSubject$.getValue();
    return getFn ? getFn(state) : state;
  }

  setState(setStateFn: (state: State) => State): void;
  setState(state: State): void;

  /**
   * @description This method allows updating the store's state.
   * @param stateOrSetStateFn either a new state object or a function that updates the state based on the current state.
   **/
  setState(stateOrSetStateFn: State | ((state: State) => State)) {
    const updatedState =
      typeof stateOrSetStateFn === 'function' ? stateOrSetStateFn(this.get()) : stateOrSetStateFn;

    this.commit(updatedState);
  }

  patchState(state: Partial<State>): void;
  patchState(patchStateFn: (state: State) => Partial<State>): void;

  /**
   * @description This method allows partially updating the store's state.
   * @param partialStateOrPatchStateFn either a partial state object or a function that updates
   * the state, either partially or fully, based on the current state.
   **/
  patchState(partialStateOrPatchStateFn: Partial<State> | ((state: State) => Partial<State>)) {
    const state = this.get();
    const partial =
      typeof partialStateOrPatchStateFn === 'function'
        ? partialStateOrPatchStateFn(state)
        : partialStateOrPatchStateFn;

    this.commit({ ...state, ...partial });
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

  private commit(nextState: State): void {
    this.stateSubject$.next(nextState);
  }
}
