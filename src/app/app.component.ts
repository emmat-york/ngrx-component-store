import { Component } from '@angular/core';
import { ExampleState, StoreExample, Initials } from './example.store';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `<p>
      <a
        href="https://github.com/emmat-york/ngrx-component-store/blob/master/src/app/component-store/component-store.ts"
        target="_blank"
        >github</a
      >
    </p>
    <p>
      <a href="https://www.linkedin.com/in/andrei-filimonchyk-35a033135/" target="_blank"
        >linkedin</a
      >
    </p> `,
  providers: [StoreExample],
})
export class AppComponent {
  readonly latestState$ = this.storeExample.latestState$;
  readonly vm$ = this.storeExample.vm$;
  readonly mapper$ = this.storeExample.mapper$;

  constructor(private storeExample: StoreExample) {}

  updater(name: string): void {
    this.storeExample.updaterExample(name);
  }

  effect(name: string): void {
    this.storeExample.effectExample(name);
  }

  voidEffect(): void {
    this.storeExample.voidEffectExample();
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
