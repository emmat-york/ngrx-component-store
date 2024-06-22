import { Component } from '@angular/core';
import { ExampleState, StoreExample, Initials } from './example.store';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<h1>https://github.com/emmat-york/ngrx-component-store</h1>',
  providers: [StoreExample],
})
export class AppComponent {
  readonly latestState$ = this.storeExample.latestState$;
  readonly vm$ = this.storeExample.vm$;
  readonly acc$ = this.storeExample.acc$;

  constructor(private storeExample: StoreExample) {}

  updater(name: string): void {
    this.storeExample.updaterExample(name);
  }

  effect(name: string): void {
    this.storeExample.effectExample(name);
  }

  emptyEffect(): void {
    this.storeExample.emptyEffectExample();
  }

  getSnapshot(): ExampleState {
    return this.storeExample.getSnapshot();
  }

  getInitials(): Initials {
    return this.storeExample.getInitials();
  }

  resetState(): void {
    this.storeExample.resetState();
  }

  patchInitials(name: string, sureName: string): void {
    this.storeExample.patchInitials(name, sureName);
  }

  patchCarBrand(brand: string): void {
    this.storeExample.patchCarBrand(brand);
  }
}
