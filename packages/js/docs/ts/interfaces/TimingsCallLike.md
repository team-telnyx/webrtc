Narrow shape of a Call as consumed by the timings builder.

Only `getEstablishmentTimings()` and `id` are accessed. Kept local so the
module is decoupled from Verto-layer imports and easy to mock in tests.
The `Call` type already provides this method (implemented on `BaseCall`),
so this interface exists only for clarity and test ergonomics.
