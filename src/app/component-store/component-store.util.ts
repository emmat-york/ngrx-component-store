import { MonoTypeOperatorFunction, Observable } from 'rxjs';

export function debounceSync<T>(): MonoTypeOperatorFunction<T> {
  return (source$: Observable<T>) =>
    new Observable<T>(observer => {
      let value: T | undefined;
      let hasValue = false;
      let scheduled = false;

      const subscription = source$.subscribe({
        next: val => {
          value = val;
          hasValue = true;

          if (!scheduled) {
            scheduled = true;
            queueMicrotask(() => {
              scheduled = false;
              if (hasValue) {
                observer.next(value!);
                hasValue = false;
              }
            });
          }
        },
        error: err => observer.error(err),
        complete: () => {
          if (hasValue) {
            observer.next(value!);
          }
          observer.complete();
        },
      });

      return () => subscription.unsubscribe();
    });
}
