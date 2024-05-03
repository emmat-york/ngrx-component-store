import { BehaviorSubject, Observable } from 'rxjs';

export type ReactiveState<State extends object> = {
  [Key in keyof State]: BehaviorSubject<State[Key]>;
};

export class CustomStore<State extends object> {
  private readonly _state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly stateSubject$: BehaviorSubject<State>;

  protected constructor(state: State) {
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
    return this.stateSubject$.getValue();
  }

  protected onDestroy(): void {
    for (const key in this._state) {
      this._state[key].complete();
    }

    this.stateSubject$.complete();
  }

  protected select<Result>(
    selectFn: (state: ReactiveState<State>) => BehaviorSubject<Result>,
  ): Observable<Result> {
    return selectFn(this._state).asObservable();
  }

  protected setState(setFn: (state: State) => State): void {
    const currentState = this.stateSubject$.getValue();
    const frozenState = Object.freeze(currentState);
    const stateSubjectUpdatedState = setFn(frozenState);

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
}
