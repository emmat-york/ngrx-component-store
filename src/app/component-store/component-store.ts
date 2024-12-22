import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
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
   * @param selectFn A selector function that accepts the current state and returns a
   * BehaviourSubject of the selected value.
   * @return An Observable that emits the selected value.
   **/
  protected select<Output>(selectFn: (state: State) => Output): Observable<Output>;

  /**
   * @description This method selects multiple parts of the state using the provided selectors
   * and returns a combined observable that emits a view model.
   * @param selectors An object whose key values are store's selectors.
   * @return An Observable which emits an object whose properties
   * are the values returned by each selector in `selectors`.
   **/
  protected select<Selectors extends Record<string, Observable<unknown>>>(
    selectors: Selectors,
  ): Observable<ViewModel<Selectors>>;

  protected select<Selectors extends Observable<unknown>[], Output>(
    ...selectorsWithSelectFn: [
      ...selectros: Selectors,
      selectFn: (...results: SelectorsResult<Selectors>) => Output,
    ]
  ): Observable<Output>;

  /**
   * @description Selects multiple parts of the state using the provided selectors
   * and applies the given selector function to combine the results.
   * @param selectorsWithSelectorsFn A tuple of selectors and a selector function:
   *  - `selectors`: An array of observables that select different parts of the state;
   *  - `selectFn`: A function that takes the results of all the selectors and returns a combined output.
   * @return An Observable that emits the result of the `selectFn` applied to the selected state parts.
   **/
  protected select<
    SelectFn extends (state: State) => Output,
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
      return this.state$.pipe(map(firstSelector), distinctUntilChanged());
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

  /**
   * @description This getter returns a frozen object of the most recent state.
   * Since the store state must be immutable, we need to prevent accidental mutations.
   * Therefore, it is provided in a frozen form.
   **/
  private get frozenState(): State {
    return Object.freeze(this.stateSubject$.getValue());
  }
}
