import { writeFileStringAtomically } from "@t3tools/shared/atomicWrite";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";

import { MuseSubscriptionUsage } from "./protocol.ts";

const SavedMuseUsageJson = Schema.fromJsonString(
  Schema.Struct({ identity: Schema.String, usage: MuseSubscriptionUsage }),
);
export type SavedMuseUsage = typeof SavedMuseUsageJson.Type;
const decodeSaved = Schema.decodeUnknownEffect(SavedMuseUsageJson);
const encodeSaved = Schema.encodeEffect(SavedMuseUsageJson);

/**
 * Meta reports usage only with a reply, so each instance saves its newest report with
 * the login it belongs to. A restarted driver shows it until a newer report arrives.
 */
export interface MuseUsageStore {
  /** The saved report on the first call; later calls return nothing. */
  readonly take: Effect.Effect<SavedMuseUsage | undefined>;
  readonly save: (saved: SavedMuseUsage) => Effect.Effect<void>;
}

export const makeMuseUsageStore = Effect.fn("MuseUsageStore.make")(function* (filePath: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const taken = yield* Ref.make(false);
  return {
    take: Effect.gen(function* () {
      if (yield* Ref.getAndSet(taken, true)) return undefined;
      return yield* fileSystem.readFileString(filePath).pipe(
        Effect.flatMap(decodeSaved),
        Effect.orElseSucceed(() => undefined),
      );
    }),
    save: (saved) =>
      encodeSaved(saved).pipe(
        Effect.flatMap((contents) => writeFileStringAtomically({ filePath, contents })),
        Effect.provideService(FileSystem.FileSystem, fileSystem),
        Effect.provideService(Path.Path, path),
        Effect.ignore,
      ),
  } satisfies MuseUsageStore;
});
