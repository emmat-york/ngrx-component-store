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
  private readonly state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly stateSubject$: BehaviorSubject<State>;
  readonly state$: Observable<State>;

  constructor(@Inject(STATE_INJECTION_TOKEN) state: State) {
    this.stateSubject$ = new BehaviorSubject<State>(state);
    this.state$ = this.stateSubject$.asObservable();

    for (const key in state) {
      this.state[key] = this.getPropAsBehaviourSubject(state, key);
    }
  }

  ngOnDestroy(): void {
    for (const key in this.state) {
      this.state[key].complete();
    }

    this.stateSubject$.complete();
  }

  protected updater<PropName extends keyof State, Payload>(
    updaterFn: (
      state: State,
      payload: Payload,
    ) => { [Key in PropName]: State[Key] },
  ): (payload: Payload) => void {
    return (payload: Payload): void => {
      const frozenState = this.frozenState;
      const resultOfUpdater = updaterFn(frozenState, payload);

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

  protected setState(setFn: (state: State) => State): void;
  protected setState(state: State): void;
  protected setState(stateOrSetFn: State | ((state: State) => State)): void {
    const newState =
      typeof stateOrSetFn === 'function'
        ? stateOrSetFn(this.frozenState)
        : stateOrSetFn;

    this.stateSubject$.next(newState);

    for (const key in newState) {
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
