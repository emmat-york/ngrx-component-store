import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from "@angular/forms";
import {AppComponentStore, CarData} from "./app-component.store";

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styles: ``,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly name$ = this.appComponentStore.name$;
  readonly sureName$ = this.appComponentStore.sureName$;
  readonly birthDate$ = this.appComponentStore.birthDate$;
  readonly address$ = this.appComponentStore.address$;
  readonly carData$ = this.appComponentStore.carData$;
  readonly age$ = this.appComponentStore.age$;

  readonly formGroup = this.formBuilder.nonNullable.group({});

  constructor(private readonly appComponentStore: AppComponentStore, private readonly formBuilder: FormBuilder) {}

  setName(name: string): void {
    this.appComponentStore.setName(name);
  }

  setSureName(sureName: string): void {
    this.appComponentStore.setSureName(sureName);
  }

  setBirthDate(birthDate: string): void {
    this.appComponentStore.setBirthDate(birthDate);
  }

  setAddress(address: string): void {
    this.appComponentStore.setAddress(address);
  }

  setCarData(carData: CarData | null): void {
    this.appComponentStore.setCarData(carData);
  }

  setAge(age: number | null): void {
    this.appComponentStore.setAge(age);
  }
}
