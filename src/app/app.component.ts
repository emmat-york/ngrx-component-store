import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppFacade } from './app.facade';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';

interface AppFormGroup {
  name: string;
  suneName: string;
  carData: {
    brand: string;
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
  readonly vm$ = this.appFacade.vm$;
  readonly carData$ = this.appFacade.carData$;
  readonly state$ = this.appFacade.state2$;

  readonly formGroup = this.fb.nonNullable.group({
    name: [''],
    suneName: [''],
    carData: this.fb.nonNullable.group({
      brand: [''],
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
    this.appFacade.setSureName(this.formValue.suneName);
  }

  setIsElectric(): void {
    this.appFacade.setIsElectric(this.formValue.carData.isElectric);
  }

  updateNameWithEffect(): void {
    this.appFacade.someEffect(this.formValue.name);
  }

  resetState(): void {
    this.appFacade.resetState();
  }
}
