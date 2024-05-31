import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppFacade } from './app.facade';
import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';

interface AppFormGroup {
  name: string;
  sureName: string;
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
  // readonly name$ = this.appFacade.name$;
  // readonly sureName$ = this.appFacade.sureName$;
  // readonly carData$ = this.appFacade.carData$;

  // vm$ = this.appFacade.vm$;

  selectorsWithSelectFn$ = this.appFacade.selectorsWithSelectFn$;

  readonly formGroup = this.fb.nonNullable.group({
    name: [''],
    sureName: [''],
    carData: this.fb.nonNullable.group({
      brand: [''],
      isElectric: [false],
    }),
  });

  constructor(
    private readonly appFacade: AppFacade,
    private readonly fb: FormBuilder,
  ) {}

  eff2() {
    this.appFacade.someEffect2();
  }

  get formValue(): AppFormGroup {
    return this.formGroup.getRawValue();
  }

  setName(): void {
    this.appFacade.setName(this.formValue.name);
  }

  setSureName(): void {
    this.appFacade.setSureName(this.formValue.sureName);
  }

  setIsElectric(): void {
    this.appFacade.setIsElectric(this.formValue.carData.isElectric);
  }
}
