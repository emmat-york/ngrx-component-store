import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppComponentStore, CarData } from './app-component.store';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [ReactiveFormsModule, AsyncPipe],
  providers: [AppComponentStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly name$ = this.appComponentStore.name$;
  readonly sureName$ = this.appComponentStore.sureName$;
  readonly birthDate$ = this.appComponentStore.birthDate$;
  readonly address$ = this.appComponentStore.address$;
  readonly carData$ = this.appComponentStore.carData$;
  readonly age$ = this.appComponentStore.age$;

  readonly formGroup = this.formBuilder.nonNullable.group({
    name: [''],
    sureName: [''],
    birthDate: [''],
    address: [''],
    carData: this.formBuilder.nonNullable.group({}),
    age: [null],
  });

  constructor(
    private readonly appComponentStore: AppComponentStore,
    private readonly formBuilder: FormBuilder,
  ) {}

  setName(): void {
    this.appComponentStore.setName(this.formGroup.getRawValue().name);
  }

  setSureName(): void {
    this.appComponentStore.setSureName(this.formGroup.getRawValue().sureName);
  }

  setBirthDate(): void {
    this.appComponentStore.setBirthDate(this.formGroup.getRawValue().birthDate);
  }

  setAddress(): void {
    this.appComponentStore.setAddress(this.formGroup.getRawValue().address);
  }

  setCarData(carData: CarData | null): void {
    this.appComponentStore.setCarData(carData);
  }

  setAge(): void {
    this.appComponentStore.setAge(this.formGroup.getRawValue().age);
  }
}
