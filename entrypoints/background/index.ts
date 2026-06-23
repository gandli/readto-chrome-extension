import '../../src/background/service-worker';

export default defineBackground({
  main() {
    // The legacy service worker module above registers all Chrome listeners
    // synchronously at module evaluation time, which is required by MV3.
  },
});
