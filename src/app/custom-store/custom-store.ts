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
  private readonly state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly stateSubject$: BehaviorSubject<State>;

  protected constructor(@Inject(INITIAL_STATE_INJECTION_TOKEN) state: State) {
    this.stateSubject$ = new BehaviorSubject<State>(state);

    for (const key in state) {
      this.state[key] = this.getPropAsBehaviourSubject(state, key);
    }

    Object.freeze(this.state);
  }

  protected get state$(): Observable<State> {
    return this.stateSubject$.asObservable();
  }

  ngOnDestroy(): void {
    for (const key in this.state) {
      this.state[key].complete();
    }

    this.stateSubject$.complete();
  }

  protected updater<PropName extends keyof State, Data>(
    updaterFn: (state: State, data: Data) => { [Key in PropName]: State[Key] },
  ): (data: Data) => void {
    return (data: Data): void => {
      const frozenState = this.frozenState;
      const resultOfUpdater = updaterFn(frozenState, data);

      this.stateSubject$.next({
        ...frozenState,
        ...resultOfUpdater,
      });

      for (const key in resultOfUpdater) {
        this.checkAndUpdateState(key);
      }
    };
  }

  protected select<Result>(
    selectFn: (state: ReactiveState<State>) => BehaviorSubject<Result>,
  ): Observable<Result> {
    return selectFn(this.state).asObservable();
  }

  protected setState(setFn: (state: State) => State): void {
    const stateSubjectUpdatedState = setFn(this.frozenState);
    this.stateSubject$.next(stateSubjectUpdatedState);

    for (const key in stateSubjectUpdatedState) {
      this.checkAndUpdateState(key);
    }
  }

  private checkAndUpdateState(key: keyof State): void {
    const stateSubjectValueByKey = this.stateSubject$.getValue()[key];
    const stateValueByKey = this.state[key].getValue();

    if (stateSubjectValueByKey !== stateValueByKey) {
      this.state[key].next(stateSubjectValueByKey);
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
