import { ComponentStore } from './component-store/component-store';
import { Injectable } from '@angular/core';

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
  private readonly name$ = this.select(state => state.name);
  private readonly sureName$ = this.select(state => state.sureName);
  private readonly carData$ = this.select(state => state.carData);

  readonly vm$ = this.select({
    nameVM: this.name$,
    sureNameVM: this.sureName$,
    carDataVM: this.carData$,
  });

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
  );

  constructor() {
    super(INITIAL_STATE);
  }
}
