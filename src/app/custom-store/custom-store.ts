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
  private readonly stateSubject$: BehaviorSubject<State>;

  protected constructor(@Inject(INITIAL_STATE_INJECTION_TOKEN) state: State) {
    this.stateSubject$ = new BehaviorSubject<State>(state);

    for (const key in state) {
      this._state[key] = this.getPropAsBehaviourSubject(state, key);
    }

    Object.freeze(this._state);
  }

  protected get state$(): Observable<State> {
    return this.stateSubject$.asObservable();
  }

  protected get state(): State {
    return this.frozenState;
  }

  ngOnDestroy(): void {
    for (const key in this._state) {
      this._state[key].complete();
    }

    this.stateSubject$.complete();
  }

  protected updater<PropName extends keyof State, Data>(
    updaterFn: (
      state: State,
      data: Data,
    ) => { [K in PropName]: State[PropName] },
  ): (data: Data) => void {
    return (data: Data): void => {
      const frozenState = this.frozenState;
      const resultOfUpdater = updaterFn(this.frozenState, data);

      for (const key in resultOfUpdater) {
        this.stateSubject$.next({
          ...frozenState,
          [key]: resultOfUpdater[key],
        });

        // @ts-ignore
        this._state[key].next(resultOfUpdater[key]);
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
    this.stateSubject$.next(stateSubjectUpdatedState);

    for (const key in stateSubjectUpdatedState) {
      const stateSubjectValueByKey = stateSubjectUpdatedState[key];
      const stateValueByKey = this._state[key].getValue();

      if (stateSubjectValueByKey !== stateValueByKey) {
        this._state[key].next(stateSubjectValueByKey);
      }
    }
  }

  private getPropAsBehaviourSubject<K extends keyof State>(
    state: State,
    key: K,
  ): BehaviorSubject<State[K]> {
    return new BehaviorSubject<State[K]>(state[key]);
  }

  private get frozenState(): State {
    return Object.freeze(this.stateSubject$.getValue());
  }
}
