import { ComponentStore } from './component-store/component-store';
import { Injectable } from '@angular/core';
import { delay, Observable, of, switchMap, tap } from 'rxjs';

interface AppStoreState {
  name: string;
  sureName: string;
  birthDate: string;
  address: string;
  carData: CarData;
  age: number | null;
}

export interface CarData {
  mark: string;
  yearOfProduction: string | null;
  isElectric: boolean;
}

const INITIAL_STATE: AppStoreState = {
  name: '',
  sureName: '',
  birthDate: '',
  address: '',
  carData: {
    mark: '',
    yearOfProduction: null,
    isElectric: false,
  },
  age: null,
};

@Injectable()
export class AppFacade extends ComponentStore<AppStoreState> {
  readonly name$ = this.select(state => state.name).pipe(
    tap(v => console.log('name$', v)),
  );
  readonly sureName$ = this.select(state => state.sureName).pipe(
    tap(v => console.log('sureName$', v)),
  );
  readonly birthDate$ = this.select(state => state.birthDate).pipe(
    tap(v => console.log('birthDate$', v)),
  );
  readonly address$ = this.select(state => state.address).pipe(
    tap(v => console.log('address$', v)),
  );
  readonly carData$ = this.select(state => state.carData).pipe(
    tap(v => console.log('carData$', v)),
  );
  readonly age$ = this.select(state => state.age).pipe(
    tap(v => console.log('age$', v)),
  );
  readonly state2$ = this.state$;

  readonly updateYearOfProd = this.updater((state, year: string) => ({
    ...state,
    carData: {
      ...state.carData,
      yearOfProduction: year,
    },
  }));

  readonly someEffect = this.effect((name$: Observable<string>) => {
    return name$.pipe(
      switchMap(name => {
        console.log('someEffect has been called!');
        return of(name + ': ZDAROVA!').pipe(delay(2000));
      }),
      tap({
        next: value => this.setName(value),
        error: err => console.error(err),
        complete: () => console.log('someEffect has been completed!'),
      }),
    );
  });

  getV1 = this.get();
  getV2 = this.get(state => state.name);

  constructor() {
    super(INITIAL_STATE);
  }

  setName(name: string): void {
    this.setState(state => ({ ...state, name }));
  }

  setSureName(sureName: string): void {
    this.setState(state => ({ ...state, sureName }));
  }

  setBirthDate(birthDate: string): void {
    this.setState(state => ({ ...state, birthDate }));
  }

  setAddress(address: string): void {
    this.setState(state => ({ ...state, address }));
  }

  setCarMark(mark: string): void {
    this.setState(state => ({ ...state, carData: { ...state.carData, mark } }));
  }

  setCarsYearOfProduction(yearOfProduction: string | null): void {
    this.setState(state => ({
      ...state,
      carData: {
        ...state.carData,
        yearOfProduction,
      },
    }));
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

  setAge(age: number | null): void {
    this.setState(state => ({ ...state, age }));
  }

  patchV1(): void {
    this.patchState(state => ({
      name: "Brian O'Conner",
      carData: {
        ...state.carData,
        mark: 'Toyota Supra MK4',
        isElectric: false,
      },
    }));
  }

  patchV2(): void {
    this.patchState({
      name: 'Dominic',
      sureName: 'Toretto',
    });
  }

  resetState(): void {
    this.setState({
      name: '',
      sureName: '',
      birthDate: '',
      address: '',
      carData: {
        mark: '',
        yearOfProduction: null,
        isElectric: false,
      },
      age: null,
    });
  }
}
