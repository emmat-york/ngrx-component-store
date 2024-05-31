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
  // selectFn - works!!!
  // select as WV - works!!!
  // select as selectors with selectFn - works!!!
  private readonly name$ = this.select(state => state.name);
  private readonly sureName$ = this.select(state => state.sureName);
  private readonly carData$ = this.select(state => state.carData);

  // readonly vm$ = this.select({
  //   nameVM: this.name$,
  //   sureNameVM: this.sureName$,
  //   carDataVM: this.carData$,
  // }).pipe(tap(v => console.log('vm$', v)));

  readonly selectorsWithSelectFn$ = this.select(
    this.carData$,
    this.name$,
    this.sureName$,
    (carData, name, sureName) => {
      return {
        accCarData: carData,
        accName: name,
        accSureName: sureName,
      };
    },
  ).pipe(tap(v => console.log('selectorsWithSelectFn$', v)));

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

  readonly someEffect2 = this.effect((name$: Observable<void>) => {
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

  constructor() {
    super(INITIAL_STATE);
  }

  setName(name: string): void {
    this.setState(state => ({ ...state, name }));
  }

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
}
