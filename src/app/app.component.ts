import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StoreExample } from './example.store';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  providers: [StoreExample],
  imports: [AsyncPipe, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly map$ = this.store.map$;
  protected readonly vm$ = this.store.vm$;

  constructor(private store: StoreExample) {}

  patchWithFn(): void {
    this.store.patchWithFn('BMW');
  }

  patchWithObjects(): void {
    this.store.patchWithObjects('New name', 'New SureName');
  }

  resetState(): void {
    this.store.resetState();
  }

  effectWithPayload(): void {
    this.store.effectExample(30);
  }
}
