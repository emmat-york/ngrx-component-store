import { Component } from '@angular/core';
import { ExampleState, StoreExample, Initials } from './example.store';
import { of } from 'rxjs';

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
  readonly entireState$ = this.storeExample.entireState$;
  readonly vm$ = this.storeExample.vm$;
  readonly map$ = this.storeExample.map$;

  constructor(private storeExample: StoreExample) {}

  updater(name: string): void {
    this.storeExample.updaterExample(name);
  }

  effect(id: number): void {
    this.storeExample.effectExample(id);
  }

  effectWithObs(id: number): void {
    this.storeExample.effectExample(of(id));
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
