import { CustomComponentStore } from './custom-component-store/custom-component-store';
import { Injectable } from '@angular/core';

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
export class AppComponentStore extends CustomComponentStore<AppStoreState> {
  readonly name$ = this.select(state => state.name);
  readonly sureName$ = this.select(state => state.sureName);
  readonly birthDate$ = this.select(state => state.birthDate);
  readonly address$ = this.select(state => state.address);
  readonly carData$ = this.select(state => state.carData);
  readonly age$ = this.select(state => state.age);

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
}
