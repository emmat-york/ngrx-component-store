import { BehaviorSubject, Observable } from 'rxjs';
import { ReactiveState } from './interfaces/custom-component-store.interface';

export class CustomComponentStore<State extends object> {
  private readonly _state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly stateSubject$: BehaviorSubject<State>;

  protected constructor(state: State) {
    this.stateSubject$ = new BehaviorSubject<State>(state);

    for (const key in state) {
      this._state[key] = this.getPropAsSubject(state, key);
    }
  }

  protected get state$(): Observable<State> {
    return this.stateSubject$.asObservable();
  }

  protected get state(): State {
    return this.stateSubject$.getValue();
  }

  protected select<Result>(
    selectFn: (state: ReactiveState<State>) => BehaviorSubject<Result>,
  ): Observable<Result> {
    return selectFn(this._state).asObservable();
  }

  protected setState(setFn: (state: State) => State): void {
    const stateSubjectUpdatedState = setFn(this.stateSubject$.getValue());
    this.stateSubject$.next(stateSubjectUpdatedState);

    for (const key in stateSubjectUpdatedState) {
      const stateSubjectValueByKey = stateSubjectUpdatedState[key];
      const stateValueByKey = this._state[key].getValue();

      if (stateSubjectValueByKey !== stateValueByKey) {
        this._state[key].next(stateSubjectValueByKey);
      }
    }
  }

  private getPropAsSubject<K extends keyof State>(
    state: State,
    key: K,
  ): BehaviorSubject<State[K]> {
    return new BehaviorSubject<State[K]>(state[key]);
  }
}
