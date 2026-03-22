import '@testing-library/jest-dom';

HTMLCanvasElement.prototype.getContext = () => {};
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
