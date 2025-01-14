import {
  distinctUntilChanged,
  BehaviorSubject,
  combineLatest,
  isObservable,
  Subscription,
  Observable,
  auditTime,
  identity,
  map,
  of,
} from 'rxjs';
import { DestroyRef, inject, Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

function isFunction(objectOrFunction: object | Function): objectOrFunction is Function {
  return typeof objectOrFunction === 'function';
}

type ViewModel<SelectorsObject extends Record<string, Observable<unknown>>> = {
  [Key in keyof SelectorsObject]: SelectorsObject[Key] extends Observable<infer U> ? U : never;
};

type SelectorsResult<Selectors extends Observable<unknown>[]> = {
  [Key in keyof Selectors]: Selectors[Key] extends Observable<infer U> ? U : never;
};

type KeysWithSelectors<SelectorsObject extends Record<string, Observable<unknown>>> = [
  keys: Array<keyof SelectorsObject>,
  selectors: Observable<unknown>[],
];

type SelectorsWithProjectorFunction<Output> = [
  selectors: Observable<unknown>[],
  projector: (...results: SelectorsResult<Observable<unknown>[]>) => Output,
];

interface SelectConfig {
  debounce: true;
}

const INITIAL_STATE_INJECTION_TOKEN = new InjectionToken<unknown>(
  'https://github.com/emmat-york/ngrx-component-store',
);

@Injectable()
export class ComponentStore<State extends object> implements OnDestroy {
  protected readonly state$: Observable<State>;

  // BehaviorSubject that holds the most recent version of the state.
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
   * second argument to `updaterFn`. This function will update the store's state
   * according to the update you provided.
   **/
  protected updater<Payload>(
    updaterFn: (state: State, payload: Payload) => State,
  ): (payload: Payload) => void {
    return (payload: Payload): void => {
      this.stateSubject$.next(updaterFn(this.frozenState, payload));
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
  protected select<Output>(
    selectFn: (state: State) => Output,
    config?: SelectConfig,
  ): Observable<Output>;

  /**
   * @description This method selects multiple parts of the state using the provided selectors
   * and returns a combined observable that emits a view model.
   * @param selectors An object whose key values are store's selectors.
   * @param config An optional object that allows controlling the frequency of value emissions in the select,
   * preventing excessive notifications during rapid state updates.
   * @return An Observable which emits an object whose properties
   * are the values returned by each selector in `selectors`.
   **/
  protected select<Selectors extends Record<string, Observable<unknown>>>(
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
  protected select<Selectors extends Observable<unknown>[], Output>(
    ...selectorsWithProjector: [
      ...selectros: Selectors,
      projector: (...results: SelectorsResult<Selectors>) => Output,
    ]
  ): Observable<Output>;

  protected select<
    Output,
    SelectFn extends (state: State) => Output,
    SelectorsObject extends Record<string, Observable<unknown>>,
    SelectorsWithProjector extends [
      ...selectros: Observable<unknown>[],
      projector: (...results: SelectorsResult<Observable<unknown>[]>) => Output,
    ],
  >(
    ...selectorsCollection: Array<SelectFn | SelectorsObject | SelectorsWithProjector>
  ): Observable<Output | ViewModel<SelectorsObject>> {
    if (isFunction(selectorsCollection[0])) {
      // Processing selectFn with config.
      const [selectFn, config] = selectorsCollection as unknown as [SelectFn, SelectConfig?];
      const isDebounceEnabled = config?.debounce ?? false;

      return this.state$.pipe(
        map(selectFn),
        distinctUntilChanged(),
        isDebounceEnabled ? auditTime(0) : identity,
      );
    } else if (isObservable(selectorsCollection[0])) {
      // Processing selectors with projectionFn.
      const [selectors, projector] = this.getSelectorsWithProjector<SelectorsWithProjector, Output>(
        selectorsCollection as unknown as SelectorsWithProjector,
      );

      return combineLatest(selectors).pipe(map(values => projector(...values)));
    } else {
      // Processing ViewModel object with selectors.
      const [vm, config] = selectorsCollection as unknown as [SelectorsObject, SelectConfig?];
      const [keys, selectors] = this.getKeysWithSelectors(vm);
      const isDebounceEnabled = config?.debounce ?? false;

      return combineLatest(selectors).pipe(
        map(selectorValues => {
          return selectorValues.reduce((viewModel: ViewModel<SelectorsObject>, value, index) => {
            return {
              ...viewModel,
              [keys[index]]: value,
            };
          }, {} as ViewModel<SelectorsObject>);
        }),
        isDebounceEnabled ? auditTime(0) : identity,
      );
    }
  }

  protected get(): State;
  protected get<Output>(getFn: (state: State) => Output): Output;

  /**
   * @description This method returns the current state snapshot.
   * @param getFn An optional function that accepts the current state object.
   * @return The current state object (if `getFn` is not provided) or a specific value,
   * depending on the selector function you provide.
   **/
  protected get<Output>(getFn?: (state: State) => Output): State | Output {
    return getFn ? getFn(this.frozenState) : this.frozenState;
  }

  protected setState(setStateFn: (state: State) => State): void;
  protected setState(state: State): void;

  /**
   * @description This method allows updating the store's state.
   * @param stateOrSetStateFn either a new state object or a function that updates
   * the state based on the current state.
   **/
  protected setState(stateOrSetStateFn: State | ((state: State) => State)): void {
    const updatedState = isFunction(stateOrSetStateFn)
      ? stateOrSetStateFn(this.frozenState)
      : stateOrSetStateFn;

    this.stateSubject$.next(updatedState);
  }

  protected patchState(state: Partial<State>): void;
  protected patchState(patchStateFn: (state: State) => Partial<State>): void;

  /**
   * @description This method allows partially updating the store's state.
   * @param partialStateOrPatchStateFn either a partial state object or a function that updates
   * the state, either partially or fully, based on the current state.
   **/
  protected patchState(
    partialStateOrPatchStateFn: Partial<State> | ((state: State) => Partial<State>),
  ): void {
    const frozenState = this.frozenState;

    const partiallyUpdatedState = isFunction(partialStateOrPatchStateFn)
      ? partialStateOrPatchStateFn(frozenState)
      : partialStateOrPatchStateFn;

    this.stateSubject$.next({ ...frozenState, ...partiallyUpdatedState });
  }

  /**
   * @description Creates an effect function.
   * @param effectFn A function that takes an origin Observable input and
   * returns an Observable. The Observable that is returned will be
   * automatically subscribed.
   * @return A function that will trigger the origin Observable.
   **/
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

  private getKeysWithSelectors<SelectorsObject extends Record<string, Observable<unknown>>>(
    objectWithValuesAsSelectors: SelectorsObject,
  ): KeysWithSelectors<SelectorsObject> {
    const keys: Array<keyof SelectorsObject> = [];
    const selectors: Observable<unknown>[] = [];

    for (const key in objectWithValuesAsSelectors) {
      selectors.push(objectWithValuesAsSelectors[key]);
      keys.push(key);
    }

    return [keys, selectors];
  }

  private getSelectorsWithProjector<
    SelectorsWithProjector extends [
      ...selectros: Observable<unknown>[],
      projector: (...results: SelectorsResult<Observable<unknown>[]>) => Output,
    ],
    Output,
  >(selectorsWithProjector: SelectorsWithProjector): SelectorsWithProjectorFunction<Output> {
    const selectors: Observable<unknown>[] = [];
    let projector!: (...results: SelectorsResult<Observable<unknown>[]>) => Output;

    for (const selectorOrProjector of selectorsWithProjector) {
      if (isObservable(selectorOrProjector)) {
        selectors.push(selectorOrProjector);
      } else {
        projector = selectorOrProjector;
      }
    }

    return [selectors, projector];
  }

  /**
   * @description This getter returns a frozen object of the most recent state.
   * Since the store state must be immutable, we need to prevent accidental mutations.
   * Therefore, it is provided in a frozen form.
   **/
  private get frozenState(): State {
    return Object.freeze(this.stateSubject$.getValue());
  }
}
