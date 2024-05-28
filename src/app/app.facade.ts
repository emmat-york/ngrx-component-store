import { ComponentStore } from './component-store/component-store';
import { Injectable } from '@angular/core';
import { delay, Observable, of, switchMap, tap } from 'rxjs';

interface AppStoreState {
  name: string;
  sureName: string;
  carData: CarData;
}

export interface CarData {
  brand: string;
  isElectric: boolean;
}

const INITIAL_STATE: AppStoreState = {
  name: '',
  sureName: '',
  carData: {
    brand: '',
    isElectric: false,
  },
};

@Injectable()
export class AppFacade extends ComponentStore<AppStoreState> {
  // Select with selectFn
  readonly carData$ = this.select(state => state.carData).pipe(
    tap(v => console.log('carData$', v)),
  );
  private readonly name$ = this.select(state => state.name);
  private readonly sureName$ = this.select(state => state.sureName);

  // Select as ViewModel
  readonly vm$ = this.select({
    name: this.name$,
    sureName: this.sureName$,
  }).pipe(tap(v => console.log(v)));

  // Entire state as Observable
  readonly state2$ = this.state$;

  // Effect
  readonly someEffect = this.effect((name$: Observable<string>) => {
    return name$.pipe(
      switchMap(name => {
        console.log('effect has been called.');
        return of(name + ' (changed by effect.)').pipe(delay(2000));
      }),
      tap({
        next: value => this.setName(value),
        error: err => console.error(err),
        complete: () => console.log('effect has been completed.'),
      }),
    );
  });

  // Get entire state snapshot
  stateSnapshot = this.get();

  // Get state part snapshot
  namePropSnapshot = this.get(state => state.name);

  constructor() {
    super(INITIAL_STATE);
  }

  // Set state with setFn
  setName(name: string): void {
    this.setState(state => ({ ...state, name }));
  }

  // Set state with setFn
  setSureName(sureName: string): void {
    this.setState(state => ({ ...state, sureName }));
  }

  setIsElectric(isElectric: boolean): void {
    this.setState(state => ({
      ...state,
      carData: {
        ...state.carData,
        isElectric,
      },
    }));
  }

  // Patch state with patchFn
  setCarBrand(brand: string): void {
    this.patchState(state => ({
      carData: {
        ...state.carData,
        brand,
      },
    }));
  }

  patchV2(): void {
    this.patchState({
      name: 'Dominic',
      sureName: 'Toretto',
    });
  }

  // Set state with state object
  resetState(): void {
    this.setState({
      name: '',
      sureName: '',
      carData: {
        brand: '',
        isElectric: false,
      },
    });
  }
}
