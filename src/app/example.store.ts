import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx-component-store';
import { catchError, delay, EMPTY, Observable, of, switchMap, tap } from 'rxjs';

export interface Contact {
  name: string;
  email: string;
}

export interface Car {
  isElectric: boolean;
  brand: string;
}

export interface ExampleState {
  name: string;
  sureName: string;
  contacts: Contact[];
  car: Car;
  age: number | null;
  isLoading: boolean;
}

const INITIAL_STATE: ExampleState = {
  name: 'Andrei',
  sureName: 'Smith',
  contacts: [],
  car: {
    brand: '',
    isElectric: false,
  },
  age: 29,
  isLoading: false,
};

@Injectable()
export class StoreExample extends ComponentStore<ExampleState> {
  private readonly name$ = this.select(state => state.name);
  private readonly sureName$ = this.select(state => state.sureName);
  private readonly contacts$ = this.select(state => state.contacts);
  private readonly car$ = this.select(state => state.car);
  private readonly age$ = this.select(state => state.age);

  readonly vm$ = this.select(
    {
      personName: this.name$,
      personSureName: this.sureName$,
      contactList: this.contacts$,
      personAge: this.age$,
    },
    { debounce: true },
  ).pipe(tap(v => console.log('vm$: ', v)));

  readonly map$ = this.select(
    this.name$,
    this.sureName$,
    this.age$,
    this.car$,
    (name, sureName, age, car) => ({
      fullName: `${name} ${sureName}`,
      isAllowedToDriveCar: Number(age) >= 18,
      car,
    }),
    { debounce: true },
  ).pipe(tap(v => console.log('map$: ', v)));

  readonly updaterExample = this.updater((state, sureName: string) => ({
    ...state,
    sureName,
  }));

  readonly effectExample = this.effect((id$: Observable<number>) => {
    return id$.pipe(
      switchMap(id => {
        console.log('Payload effect has been started.');
        this.setLoading(true);
        return of({ id, contacts: [] }).pipe(delay(2000));
      }),
      tap({
        next: ({ contacts }) => {
          console.log('Payload side effect has been executed.');
          this.setContacts(contacts);
        },
        complete: () => console.log('Payload effect has been completed.'),
        finalize: () => this.setLoading(false),
      }),
      catchError(() => EMPTY),
    );
  });

  readonly voidEffectExample = this.effect<void>(voidSource$ => {
    return voidSource$.pipe(
      switchMap(() => {
        console.log('Void effect has been started.');
        this.setLoading(true);
        return of({ description: 'Void effect example.' }).pipe(delay(2000));
      }),
      tap({
        next: data => {
          console.log('Void side effect has been executed.');
          console.log(data);
        },
        complete: () => console.log('Void effect has been completed.'),
        finalize: () => this.setLoading(false),
      }),
      catchError(() => EMPTY),
    );
  });

  constructor() {
    super(INITIAL_STATE);
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

  patchWithFn(brand: string): void {
    this.patchState(state => ({ car: { ...state.car, brand } }));
  }

  patchWithObjects(name: string, sureName: string): void {
    this.patchState({ name, sureName });
  }
}
