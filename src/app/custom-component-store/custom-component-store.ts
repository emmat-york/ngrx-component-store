import { BehaviorSubject, Observable } from 'rxjs';
import { ReactiveState } from './interfaces/custom-component-store.interface';
import { Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';

const EMPTY_TOKEN = new InjectionToken<undefined>(
  'EMPTY_TOKEN_FOR_COMPONENT_STORE',
);

@Injectable()
export class CustomComponentStore<State extends object> implements OnDestroy {
  private readonly _state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly stateSubject$: BehaviorSubject<State>;

  protected constructor(@Inject(EMPTY_TOKEN) state: State) {
    this.stateSubject$ = new BehaviorSubject<State>(state);

    for (const key in state) {
      this._state[key] = this.getPropAsBehaviourSubject(state, key);
    }
  }

  protected get state$(): Observable<State> {
    return this.stateSubject$.asObservable();
  }

  protected get state(): State {
    return this.stateSubject$.getValue();
  }

  ngOnDestroy(): void {
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

  private getPropAsBehaviourSubject<K extends keyof State>(
    state: State,
    key: K,
  ): BehaviorSubject<State[K]> {
    return new BehaviorSubject<State[K]>(state[key]);
  }
}
