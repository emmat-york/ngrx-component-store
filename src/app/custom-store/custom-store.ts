import { BehaviorSubject, Observable } from 'rxjs';
import { Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';

type ReactiveState<State extends object> = {
  [Key in keyof State]: BehaviorSubject<State[Key]>;
};

const STATE_INJECTION_TOKEN = new InjectionToken<unknown>(
  'STATE_INJECTION_TOKEN',
);

@Injectable()
export class CustomStore<State extends object> implements OnDestroy {
  readonly state$: Observable<State>;

  private readonly state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly stateSubject$: BehaviorSubject<State>;

  protected constructor(@Inject(STATE_INJECTION_TOKEN) state: State) {
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
      const resultOfUpdater = updaterFn(this.frozenState, payload);

      this.stateSubject$.next(resultOfUpdater);
      this.checkAndUpdateState(resultOfUpdater);
    };
  }

  protected select<Result>(
    selectFn: (state: ReactiveState<State>) => BehaviorSubject<Result>,
  ): Observable<Result> {
    return selectFn(this.state).asObservable();
  }

  protected setState(setFn: (state: State) => State): void;
  protected setState(state: State): void;
  protected setState(stateOrSetFn: State | ((state: State) => State)): void {
    const newState =
      typeof stateOrSetFn === 'function'
        ? stateOrSetFn(this.frozenState)
        : stateOrSetFn;

    this.stateSubject$.next(newState);
    this.checkAndUpdateState(newState);
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

  private checkAndUpdateState(stateToBeChecked: Partial<State>): void {
    for (const key in stateToBeChecked) {
      const stateSubjectValueByKey = this.stateSubject$.getValue()[key];
      const stateValueByKey = this.state[key].getValue();

      if (stateSubjectValueByKey !== stateValueByKey) {
        this.state[key].next(stateSubjectValueByKey);
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
