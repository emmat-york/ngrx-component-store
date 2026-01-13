import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StoreExample } from './example.store';

/**
 * get
 * 1. full
 * 2. fn
 *
 * setState
 * 1. full
 * 2. fn
 *
 * patchState
 * 1. partial object
 * 2. fn
 *
 * effect
 *
 * 1. void
 * 2. with payload
 *
 * updater
 *
 * select
 *
 * 1. fn
 * 2. vm
 * 3. selectors + projectorFn
 *
 **/

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  providers: [StoreExample],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly entireState$ = this.store.entireState$;
  protected readonly map$ = this.store.map$;
  protected readonly vm$ = this.store.vm$;

  constructor(private store: StoreExample) {}

  onGet(): void {
    console.log('get: ', this.store.get());
  }

  patchCarBrand(): void {
    this.store.patchCarBrand('BMW');
  }

  patchInitials(): void {
    this.store.patchInitials('Varvara', 'V');
  }

  resetState(): void {
    this.store.resetState();
  }
}
