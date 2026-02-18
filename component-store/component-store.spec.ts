import { ComponentStore, INITIAL_STATE_INJECTION_TOKEN } from './component-store';
import { TestBed } from '@angular/core/testing';

interface ComponentStoreState {
  name: string;
  age: number;
  car: {
    brand: string;
    isElectric: boolean;
  };
  isMarried: boolean;
}

const INITIAL_STATE: ComponentStoreState = {
  name: 'Andrei',
  age: 30,
  car: {
    brand: 'BMW',
    isElectric: false,
  },
  isMarried: false,
};

describe('ComponentStore', () => {
  let componentStore: ComponentStore<ComponentStoreState>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ComponentStore,
        { provide: INITIAL_STATE_INJECTION_TOKEN, useValue: INITIAL_STATE },
      ],
    });

    componentStore = TestBed.inject(ComponentStore) as ComponentStore<ComponentStoreState>;
  });

  it('should be created', () => {
    expect(componentStore).toBeDefined();
  });

  it("'get with fn' should return correct snapshot", () => {
    const partialState = {
      name: 'Emmat',
      car: { brand: 'Tesla', isElectric: true },
    };

    componentStore.patchState(partialState);

    const result = componentStore.get(state => ({ name: state.name, car: state.car }));

    expect(result).toEqual(partialState);
  });

  it("'get' should return correct snapshot", () => {
    const newState: ComponentStoreState = {
      name: 'Darth Vader',
      age: 40,
      car: {
        brand: 'Space vessel',
        isElectric: true,
      },
      isMarried: true,
    };

    componentStore.setState(newState);

    const result = componentStore.get();

    expect(result).toEqual(newState);
  });
});
