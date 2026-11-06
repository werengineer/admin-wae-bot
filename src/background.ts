// A look at the meetings while the app is not open. The task is defined here, in the global scope (imported first by index.ts), so the phone can
// start it when the app is in the background. THE PHONE DECIDES WHEN IT RUNS: about every 15 minutes at the very best on Android, and on the
// iPhone at times it chooses (often much later, sometimes overnight). A notification that must come right away needs a push from the server.
import * as BackgroundTask from "expo-background-task"
import * as TaskManager from "expo-task-manager"
import { Platform } from "react-native"
import { checkMeetingsOnce } from "./meeting-check"

export const MEETINGS_TASK = "wae-meetings-check"
const supported = Platform.OS !== "web"

if (supported) {
  TaskManager.defineTask(MEETINGS_TASK, async () => {
    try {
      return (await checkMeetingsOnce()) ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed // for example not signed in any more
    }
  })
}

export async function startWatchingMeetings(): Promise<void> {
  if (!supported) return
  try {
    await BackgroundTask.registerTaskAsync(MEETINGS_TASK, { minimumInterval: 15 })
  } catch {}
}

export async function stopWatchingMeetings(): Promise<void> {
  if (!supported) return
  try {
    if (await TaskManager.isTaskRegisteredAsync(MEETINGS_TASK)) await BackgroundTask.unregisterTaskAsync(MEETINGS_TASK)
  } catch {}
}
