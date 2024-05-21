import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppFacade } from './app.facade';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';

interface AppFormGroup {
  name: string;
  sureName: string;
  birthDate: string;
  address: string;
  age: number | null;
  carData: {
    mark: string;
    yearOfProduction: string | null;
    isElectric: boolean;
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  providers: [AppFacade],
  imports: [ReactiveFormsModule, AsyncPipe, NgIf, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly name$ = this.appFacade.name$;
  readonly sureName$ = this.appFacade.sureName$;
  readonly birthDate$ = this.appFacade.birthDate$;
  readonly address$ = this.appFacade.address$;
  readonly carData$ = this.appFacade.carData$;
  readonly age$ = this.appFacade.age$;
  readonly state$ = this.appFacade.state2$;

  readonly formGroup = this.fb.nonNullable.group({
    name: [''],
    sureName: [''],
    birthDate: [''],
    address: [''],
    age: [null],
    carData: this.fb.nonNullable.group({
      mark: [''],
      yearOfProduction: [null],
      isElectric: [false],
    }),
  });

  constructor(
    private readonly appFacade: AppFacade,
    private readonly fb: FormBuilder,
  ) {}

  get formValue(): AppFormGroup {
    return this.formGroup.getRawValue();
  }

  setName(): void {
    this.appFacade.setName(this.formValue.name);
  }

  setSureName(): void {
    this.appFacade.setSureName(this.formValue.sureName);
  }

  setBirthDate(): void {
    this.appFacade.setBirthDate(this.formValue.birthDate);
  }

  setAddress(): void {
    this.appFacade.setAddress(this.formValue.address);
  }

  setCarMark(): void {
    this.appFacade.setCarMark(this.formValue.carData.mark);
  }

  setCarsYearOfProduction(): void {
    this.appFacade.setCarsYearOfProduction(
      this.formValue.carData.yearOfProduction,
    );
  }

  setIsElectric(): void {
    this.appFacade.setIsElectric(this.formValue.carData.isElectric);
  }

  setAge(): void {
    this.appFacade.setAge(this.formValue.age);
  }

  updateYearOfCarProduction(): void {
    this.appFacade.updateYearOfProd('06-10-1995');
  }

  updateNameWithEffect(): void {
    this.appFacade.someEffect(this.formValue.name);
  }

  resetState(): void {
    this.appFacade.resetState();
  }
}
