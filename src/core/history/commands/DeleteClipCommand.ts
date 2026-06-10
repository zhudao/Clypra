/**
 * Delete Clip Command
 */

import type { Command } from "../Command";
import { generateCommandId } from "../Command";
import type { Clip } from "@/types";

interface TimelineState {
  clips: Clip[];
  epoch: number;
}

export class DeleteClipCommand implements Command {
  readonly id: string;
  readonly label: string;
  readonly timestamp: number;
  readonly undoable: boolean = true;

  private deletedClip: Clip | null = null;

  constructor(private readonly clipId: string) {
    this.id = generateCommandId();
    this.label = "Delete Clip";
    this.timestamp = Date.now();
  }

  apply(state: TimelineState): TimelineState {
    // Store deleted clip for undo
    this.deletedClip = state.clips.find((c) => c.id === this.clipId) || null;

    return {
      ...state,
      clips: state.clips.filter((c) => c.id !== this.clipId),
      epoch: state.epoch + 1, // ✅ Epoch increment inside command
    };
  }

  invert(): Command {
    if (!this.deletedClip) {
      throw new Error("Cannot invert DeleteClipCommand: no deleted clip stored");
    }
    return new AddClipCommand(this.deletedClip);
  }

  toJSON(): Record<string, any> {
    return {
      type: "DeleteClip",
      clipId: this.clipId,
      deletedClip: this.deletedClip,
    };
  }

  static fromJSON(data: Record<string, any>): DeleteClipCommand {
    const cmd = new DeleteClipCommand(data.clipId);
    cmd.deletedClip = data.deletedClip;
    return cmd;
  }
}

/**
 * Add Clip Command (inverse of delete)
 */
export class AddClipCommand implements Command {
  readonly id: string;
  readonly label: string;
  readonly timestamp: number;
  readonly undoable: boolean = true;

  constructor(private readonly clip: Clip) {
    this.id = generateCommandId();
    this.label = "Add Clip";
    this.timestamp = Date.now();
  }

  apply(state: TimelineState): TimelineState {
    // Check for overlap and adjust position if needed
    const trackClips = state.clips.filter((c) => c.trackId === this.clip.trackId).sort((a, b) => a.startTime - b.startTime);

    let finalStartTime = this.clip.startTime;
    let hasOverlap = true;

    // Keep checking until no overlaps (handle cascading shifts)
    while (hasOverlap) {
      hasOverlap = false;
      for (const existingClip of trackClips) {
        const existingEnd = existingClip.startTime + existingClip.duration;
        const newEnd = finalStartTime + this.clip.duration;

        // Check for overlap
        if (finalStartTime < existingEnd && newEnd > existingClip.startTime) {
          // Overlap detected - move to end of conflicting clip
          finalStartTime = existingEnd;
          hasOverlap = true; // Re-check with new position
          break; // Restart the loop from beginning
        }
      }
    }

    // Create clip with safe position
    const safeClip = { ...this.clip, startTime: finalStartTime };

    return {
      ...state,
      clips: [...state.clips, safeClip],
      epoch: state.epoch + 1, // ✅ Epoch increment inside command
    };
  }

  invert(): Command {
    return new DeleteClipCommand(this.clip.id);
  }

  toJSON(): Record<string, any> {
    return {
      type: "AddClip",
      clip: this.clip,
    };
  }

  static fromJSON(data: Record<string, any>): AddClipCommand {
    return new AddClipCommand(data.clip);
  }
}
