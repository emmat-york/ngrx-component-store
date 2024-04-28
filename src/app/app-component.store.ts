import {CustomComponentStore} from "./custom-component-store/custom-component-store";
import {Injectable} from "@angular/core";

interface AppStoreState {
    name: string;
    sureName: string;
    birthDate: string;
    address: string;
    carData: CarData | null;
    age: number | null;
}

export interface CarData {
    mark: string;
    yearOfProduction: number;
    isElectric: boolean;
}

const INITIAL_STATE: AppStoreState = {
    name: '',
    sureName: '',
    birthDate: '',
    address: '',
    carData: null,
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

    setCarData(carData: CarData | null): void {
        this.setState(state => ({ ...state, carData }));
    }

    setAge(age: number | null): void {
        this.setState(state => ({ ...state, age }));
    }
}
