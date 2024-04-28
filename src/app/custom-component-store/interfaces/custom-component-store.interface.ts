import { BehaviorSubject } from 'rxjs';

export type ReactiveState<State extends object> = {
  [Key in keyof State]: BehaviorSubject<State[Key]>;
};
