import { Injectable } from '@angular/core';
import { ComponentStore } from './component-store/component-store';
import { delay, finalize, Observable, of, switchMap, tap } from 'rxjs';

export interface Initials {
  name: string;
  sureName: string;
}

export interface Contact {
  name: string;
  email: string;
}

export interface Car {
  isElectric: boolean;
  brand: string;
}

/*
 * Component store extended service
 * */

export interface ExampleState {
  name: string;
  sureName: string;
  contacts: Contact[];
  car: Car;
  age: number | null;
  isLoading: boolean;
}

const INITIAL_STATE: ExampleState = {
  name: '',
  sureName: '',
  contacts: [],
  car: {
    brand: '',
    isElectric: false,
  },
  age: null,
  isLoading: false,
};

@Injectable()
export class StoreExample extends ComponentStore<ExampleState> {
  private readonly name$ = this.select(state => state.name);
  private readonly sureName$ = this.select(state => state.sureName);
  private readonly contacts$ = this.select(state => state.contacts);
  private readonly car$ = this.select(state => state.car);
  private readonly age$ = this.select(state => state.age);

  readonly entireState$ = this.state$;

  readonly vm$ = this.select({
    personName: this.name$,
    personSureName: this.sureName$,
    contactList: this.contacts$,
    carData: this.car$,
    personAge: this.age$,
  });

  readonly map$ = this.select(
    this.name$,
    this.sureName$,
    this.age$,
    this.car$,
    (name, sureName, age, car) => {
      return {
        fullName: `${name} ${sureName}`,
        isAllowedToDriveCar: Number(age) >= 18,
        car,
      };
    },
  );

  readonly updaterExample = this.updater((state, sureName: string) => {
    return {
      ...state,
      sureName,
    };
  });

  readonly effectExample = this.effect((name$: Observable<string>) => {
    return name$.pipe(
      tap(() => this.setLoading(true)),
      switchMap(() => of({ contacts: [] }).pipe(delay(1000))),
      tap({
        next: ({ contacts }) => this.setContacts(contacts),
        error: error => console.error(error),
        complete: () => console.log('Effect has been completed.'),
      }),
      finalize(() => this.setLoading(false)),
    );
  });

  readonly voidEffectExample = this.effect<void>(voidSource$ => {
    return voidSource$.pipe(
      tap(() => this.setLoading(true)),
      switchMap(() => of({ description: 'Void effect example.' }).pipe(delay(1000))),
      tap({
        next: data => console.log(data),
        error: error => console.error(error),
        complete: () => console.log('Void effect has been completed.'),
      }),
      finalize(() => this.setLoading(false)),
    );
  });

  constructor() {
    super(INITIAL_STATE);
  }

  getSnapshot(): ExampleState {
    return this.get();
  }

  getInitials(): Initials {
    return this.get(state => ({ name: state.name, sureName: state.sureName }));
  }

  setContacts(contacts: Contact[]): void {
    this.setState(state => ({ ...state, contacts }));
  }

  setLoading(isLoading: boolean): void {
    this.setState(state => ({ ...state, isLoading }));
  }

  resetState(): void {
    this.setState({
      name: '',
      sureName: '',
      contacts: [],
      car: {
        brand: '',
        isElectric: false,
      },
      isLoading: false,
      age: null,
    });
  }

  patchCarBrand(brand: string): void {
    this.patchState(state => ({ car: { ...state.car, brand } }));
  }

  patchInitials(name: string, sureName: string): void {
    this.patchState({ name, sureName });
  }
}
