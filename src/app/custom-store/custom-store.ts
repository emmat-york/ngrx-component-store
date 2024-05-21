import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  DestroyRef,
  inject,
  Inject,
  Injectable,
  InjectionToken,
  OnDestroy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type ReactiveState<State extends object> = {
  [Key in keyof State]: BehaviorSubject<State[Key]>;
};

const STATE_INJECTION_TOKEN = new InjectionToken<unknown>(
  'STATE_INJECTION_TOKEN',
);

@Injectable()
export class CustomStore<State extends object> implements OnDestroy {
  protected readonly state$: Observable<State>;

  private readonly state: ReactiveState<State> = {} as ReactiveState<State>;
  private readonly stateSubject$: BehaviorSubject<State>;
  private readonly destroyRef = inject(DestroyRef);

  constructor(@Inject(STATE_INJECTION_TOKEN) state: State) {
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
    updaterFn: (state: State, value: Payload) => State,
  ): (value: Payload) => void {
    return (value: Payload): void => {
      const updatedState = updaterFn(this.frozenState, value);
      this.stateSubject$.next(updatedState);
      this.checkAndUpdateState(updatedState);
    };
  }

  protected select<Output>(
    selectFn: (state: ReactiveState<State>) => BehaviorSubject<Output>,
  ): Observable<Output> {
    return selectFn(this.state).asObservable();
  }

  protected setState(setFn: (state: State) => State): void;
  protected setState(state: State): void;

  protected setState(stateOrSetFn: State | ((state: State) => State)): void {
    const updatedState =
      typeof stateOrSetFn === 'function'
        ? stateOrSetFn(this.frozenState)
        : stateOrSetFn;

    this.stateSubject$.next(updatedState);
    this.checkAndUpdateState(updatedState);
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

  protected effect<Value, Output>(
    effectFn: (obs$: Observable<Value>) => Observable<Output>,
  ): (value: Value) => void {
    return (value: Value) => {
      effectFn(of(value)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    };
  }

  private checkAndUpdateState(stateToBeChecked: Partial<State>): void {
    const latestState = this.stateSubject$.getValue();

    for (const key in stateToBeChecked) {
      const valueOfLatestState = latestState[key];
      const valueOfOutdatedState = this.state[key].getValue();

      if (valueOfLatestState !== valueOfOutdatedState) {
        this.state[key].next(valueOfLatestState);
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
