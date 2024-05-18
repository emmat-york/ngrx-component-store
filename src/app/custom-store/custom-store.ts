import { BehaviorSubject, Observable } from 'rxjs';
import { Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';

export type ReactiveState<State extends object> = {
  [Key in keyof State]: BehaviorSubject<State[Key]>;
};

const INITIAL_STATE_INJECTION_TOKEN = new InjectionToken<undefined>(
  'INITIAL_STATE_INJECTION_TOKEN',
);

@Injectable()
export class CustomStore<State extends object> implements OnDestroy {
  private readonly _state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly _stateSubject$: BehaviorSubject<State>;

  protected constructor(@Inject(INITIAL_STATE_INJECTION_TOKEN) state: State) {
    this._stateSubject$ = new BehaviorSubject<State>(state);

    for (const key in state) {
      this._state[key] = this.getPropAsBehaviourSubject(state, key);
    }

    Object.freeze(this._state);
  }

  protected get state$(): Observable<State> {
    return this._stateSubject$.asObservable();
  }

  protected get state(): State {
    return this.frozenState;
  }

  ngOnDestroy(): void {
    for (const key in this._state) {
      this._state[key].complete();
    }

    this._stateSubject$.complete();
  }

  protected updater<PropName extends keyof State, Data>(
    updaterFn: (state: State, data: Data) => { [Key in PropName]: State[Key] },
  ): (data: Data) => void {
    return (data: Data): void => {
      const frozenState = this.frozenState;
      const resultOfUpdater = updaterFn(frozenState, data);

      this._stateSubject$.next({
        ...frozenState,
        ...resultOfUpdater,
      });

      for (const key in resultOfUpdater) {
        const stateSubjectValueByKey = this._stateSubject$.getValue()[key];
        const stateValueByKey = this._state[key].getValue();

        if (stateSubjectValueByKey !== stateValueByKey) {
          this._state[key].next(stateSubjectValueByKey);
        }
      }
    };
  }

  protected select<Result>(
    selectFn: (state: ReactiveState<State>) => BehaviorSubject<Result>,
  ): Observable<Result> {
    return selectFn(this._state).asObservable();
  }

  protected setState(setFn: (state: State) => State): void {
    const stateSubjectUpdatedState = setFn(this.frozenState);
    this._stateSubject$.next(stateSubjectUpdatedState);

    for (const key in stateSubjectUpdatedState) {
      const stateSubjectValueByKey = stateSubjectUpdatedState[key];
      const stateValueByKey = this._state[key].getValue();

      if (stateSubjectValueByKey !== stateValueByKey) {
        this._state[key].next(stateSubjectValueByKey);
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
    return Object.freeze(this._stateSubject$.getValue());
  }
}
