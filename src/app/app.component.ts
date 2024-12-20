import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
