import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useInView } from './useInView';

let observerInstances: Array<{
  callback: IntersectionObserverCallback;
  elements: Element[];
}> = [];

function TestComponent(options?: Parameters<typeof useInView>[0]) {
  const { ref, inView } = useInView<HTMLDivElement>(options);
  return (
    <div data-testid="wrapper">
      <div ref={ref} data-testid="target" data-inview={String(inView)} />
    </div>
  );
}

describe('useInView', () => {
  beforeEach(() => {
    observerInstances = [];
    global.IntersectionObserver = class implements IntersectionObserver {
      callback: IntersectionObserverCallback;
      elements: Element[] = [];

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observerInstances.push(this);
      }

      observe(element: Element) {
        this.elements.push(element);
      }

      disconnect() {
        this.elements = [];
      }

      unobserve() {}

      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });

  it('starts with inView false', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('target').dataset.inview).toBe('false');
  });

  it('sets inView to true when the observed element intersects', () => {
    const { getByTestId } = render(<TestComponent />);
    const target = getByTestId('target');

    const observer = observerInstances[observerInstances.length - 1];
    act(() => {
      observer.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver
      );
    });

    expect(target.dataset.inview).toBe('true');
  });

  it('disconnects after first intersection when triggerOnce is true', () => {
    render(<TestComponent triggerOnce />);
    const observer = observerInstances[observerInstances.length - 1];
    const target = observer.elements[0];

    act(() => {
      observer.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver
      );
    });

    expect(observer.elements).toHaveLength(0);
  });
});
