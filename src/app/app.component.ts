import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppComponentStore, CarData } from './app-component.store';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [ReactiveFormsModule, AsyncPipe, NgIf],
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
    age: [null],
    carData: this.formBuilder.nonNullable.group({
      mark: [''],
      yearOfProduction: [null],
      isElectric: [false],
    }),
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

  setCarMark(): void {
    this.appComponentStore.setCarMark(
      this.formGroup.getRawValue().carData.mark,
    );
  }

  setCarsYearOfProduction(): void {
    this.appComponentStore.setCarsYearOfProduction(
      this.formGroup.getRawValue().carData.yearOfProduction,
    );
  }

  setIsElectric(): void {
    this.appComponentStore.setIsElectric(
      this.formGroup.getRawValue().carData.isElectric,
    );
  }

  setAge(): void {
    this.appComponentStore.setAge(this.formGroup.getRawValue().age);
  }
}
