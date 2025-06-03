/**
 * Piano State Manager
 * Manages the current state of the piano including active notes, timestamps, and client information
 * Provides state synchronization and conflict resolution capabilities
 */

interface ActiveNote {
  midiNumber: number;
  velocity: number;
  timestamp: number;
  clientId: string;
  noteOffTimestamp?: number; // For note release tracking
  priority?: number; // Priority for conflict resolution
}

interface PianoState {
  activeNotes: Map<number, ActiveNote>; // Key: midiNumber, Value: ActiveNote
  lastUpdateTimestamp: number;
  activeClientCount: number;
  stateVersion: number; // For conflict resolution
  sessionId: string; // Unique session identifier for this server instance
}

interface StateConflict {
  type: "note_conflict" | "timestamp_conflict" | "version_conflict";
  local: ActiveNote;
  remote: ActiveNote;
  resolution: "local_wins" | "remote_wins" | "merge";
  reason: string;
}

interface StateReconciliationResult {
  success: boolean;
  conflicts: StateConflict[];
  notesAdded: number;
  notesRemoved: number;
  stateVersionUpdated: boolean;
}

export type ConflictResolutionStrategy =
  | "latest_wins"
  | "velocity_priority"
  | "client_priority"
  | "highest_priority";

export class PianoStateManager {
  private state: PianoState;
  private readonly conflictResolutionStrategy: ConflictResolutionStrategy;
  private priorityClients: Set<string>; // High priority clients
  private stateHistory: Array<{
    timestamp: number;
    version: number;
    noteCount: number;
  }>; // Recent state history

  constructor(
    conflictResolutionStrategy: ConflictResolutionStrategy = "latest_wins"
  ) {
    this.state = {
      activeNotes: new Map(),
      lastUpdateTimestamp: Date.now(),
      activeClientCount: 0,
      stateVersion: 0,
      sessionId: this.generateSessionId(),
    };
    this.conflictResolutionStrategy = conflictResolutionStrategy;
    this.priorityClients = new Set();
    this.stateHistory = [];
  }

  /**
   * Add or update an active note with enhanced conflict resolution
   */
  public addNote(
    midiNumber: number,
    velocity: number,
    clientId: string,
    priority: number = 0
  ): boolean {
    const timestamp = Date.now();
    const existingNote = this.state.activeNotes.get(midiNumber);

    // If note already exists, resolve conflict
    if (existingNote && !existingNote.noteOffTimestamp) {
      const newNote: ActiveNote = {
        midiNumber,
        velocity,
        timestamp,
        clientId,
        priority,
      };

      const conflict: StateConflict = {
        type: "note_conflict",
        local: existingNote,
        remote: newNote,
        resolution: this.resolveNoteConflict(existingNote, newNote),
        reason: this.getConflictReason(existingNote, newNote),
      };

      // Apply conflict resolution
      if (conflict.resolution === "remote_wins") {
        this.state.activeNotes.set(midiNumber, newNote);
        this.updateStateMetadata();
        this.logConflictResolution(conflict);
        return true;
      } else if (conflict.resolution === "merge") {
        // Merge strategy: use higher velocity but keep original timestamp and client
        const mergedNote: ActiveNote = {
          ...existingNote,
          velocity: Math.max(existingNote.velocity, velocity),
          priority: Math.max(existingNote.priority || 0, priority),
        };
        this.state.activeNotes.set(midiNumber, mergedNote);
        this.updateStateMetadata();
        this.logConflictResolution(conflict);
        return true;
      } else {
        // Local wins - keep existing note
        this.logConflictResolution(conflict);
        return false;
      }
    }

    // Add new note
    this.state.activeNotes.set(midiNumber, {
      midiNumber,
      velocity,
      timestamp,
      clientId,
      priority,
    });

    this.updateStateMetadata();
    return true;
  }

  /**
   * Remove an active note with enhanced validation
   */
  public removeNote(midiNumber: number, clientId: string): boolean {
    const existingNote = this.state.activeNotes.get(midiNumber);

    if (!existingNote) {
      return false; // Note not found
    }

    // Enhanced permission check for note removal
    if (existingNote.clientId !== clientId) {
      const canRemove = this.canClientRemoveNote(existingNote, clientId);
      if (!canRemove) {
        console.log(
          `⚠️ Client ${clientId} attempted to remove note ${midiNumber} owned by ${existingNote.clientId}`
        );
        return false;
      }
    }

    // Mark note as released with timestamp
    existingNote.noteOffTimestamp = Date.now();

    // Remove from active notes after a short delay to prevent rapid on/off conflicts
    setTimeout(() => {
      this.state.activeNotes.delete(midiNumber);
    }, 50);

    this.updateStateMetadata();
    return true;
  }

  /**
   * Clear all active notes with optional client filtering
   */
  public clearAllNotes(clientId?: string): void {
    const timestamp = Date.now();

    if (clientId) {
      // Clear only notes from specific client
      for (const [midiNumber, note] of this.state.activeNotes) {
        if (note.clientId === clientId) {
          note.noteOffTimestamp = timestamp;
          this.state.activeNotes.delete(midiNumber);
        }
      }
    } else {
      // Clear all notes
      this.state.activeNotes.clear();
    }

    this.updateStateMetadata();
  }

  /**
   * Get current piano state for synchronization
   */
  public getCurrentState(): {
    activeNotes: Array<{
      midiNumber: number;
      velocity: number;
      timestamp: number;
      clientId: string;
    }>;
    lastUpdateTimestamp: number;
    activeClientCount: number;
    stateVersion: number;
    sessionId: string;
  } {
    const activeNotesArray = Array.from(this.state.activeNotes.values())
      .filter((note) => !note.noteOffTimestamp) // Only include active notes
      .map((note) => ({
        midiNumber: note.midiNumber,
        velocity: note.velocity,
        timestamp: note.timestamp,
        clientId: note.clientId,
      }));

    return {
      activeNotes: activeNotesArray,
      lastUpdateTimestamp: this.state.lastUpdateTimestamp,
      activeClientCount: this.state.activeClientCount,
      stateVersion: this.state.stateVersion,
      sessionId: this.state.sessionId,
    };
  }

  /**
   * Enhanced state synchronization with comprehensive conflict resolution
   */
  public synchronizeFromRemote(remoteState: {
    activeNotes: Array<{
      midiNumber: number;
      velocity: number;
      timestamp: number;
      clientId: string;
    }>;
    lastUpdateTimestamp: number;
    stateVersion: number;
    sessionId?: string;
  }): StateReconciliationResult {
    const result: StateReconciliationResult = {
      success: false,
      conflicts: [],
      notesAdded: 0,
      notesRemoved: 0,
      stateVersionUpdated: false,
    };

    // Check if remote state is from a different session
    if (
      remoteState.sessionId &&
      remoteState.sessionId === this.state.sessionId
    ) {
      console.log("🔄 Ignoring state sync from same session");
      return result;
    }

    // Check version compatibility
    if (remoteState.stateVersion <= this.state.stateVersion) {
      console.log(
        `🔄 Remote state version ${remoteState.stateVersion} <= local version ${this.state.stateVersion}, skipping sync`
      );
      return result;
    }

    console.log(
      `🔄 Starting state reconciliation: Remote v${remoteState.stateVersion} vs Local v${this.state.stateVersion}`
    );

    // Process each remote note
    for (const remoteNote of remoteState.activeNotes) {
      const localNote = this.state.activeNotes.get(remoteNote.midiNumber);

      if (localNote && !localNote.noteOffTimestamp) {
        // Conflict detected
        const conflict: StateConflict = {
          type: "note_conflict",
          local: localNote,
          remote: remoteNote,
          resolution: this.resolveNoteConflict(localNote, remoteNote),
          reason: this.getConflictReason(localNote, remoteNote),
        };
        result.conflicts.push(conflict);

        if (conflict.resolution === "remote_wins") {
          this.state.activeNotes.set(remoteNote.midiNumber, {
            midiNumber: remoteNote.midiNumber,
            velocity: remoteNote.velocity,
            timestamp: remoteNote.timestamp,
            clientId: remoteNote.clientId,
          });
          result.notesAdded++;
        } else if (conflict.resolution === "merge") {
          // Apply merge strategy
          const mergedNote: ActiveNote = {
            ...localNote,
            velocity: Math.max(localNote.velocity, remoteNote.velocity),
          };
          this.state.activeNotes.set(remoteNote.midiNumber, mergedNote);
        }

        this.logConflictResolution(conflict);
      } else {
        // No conflict, add remote note
        this.state.activeNotes.set(remoteNote.midiNumber, {
          midiNumber: remoteNote.midiNumber,
          velocity: remoteNote.velocity,
          timestamp: remoteNote.timestamp,
          clientId: remoteNote.clientId,
        });
        result.notesAdded++;
      }
    }

    // Remove local notes that are not in remote state
    for (const [midiNumber, localNote] of this.state.activeNotes) {
      const remoteNoteExists = remoteState.activeNotes.some(
        (rNote) => rNote.midiNumber === midiNumber
      );

      if (!remoteNoteExists && !localNote.noteOffTimestamp) {
        this.state.activeNotes.delete(midiNumber);
        result.notesRemoved++;
      }
    }

    // Update state metadata
    this.state.lastUpdateTimestamp = Math.max(
      this.state.lastUpdateTimestamp,
      remoteState.lastUpdateTimestamp
    );
    this.state.stateVersion = remoteState.stateVersion;
    result.stateVersionUpdated = true;

    this.updateStateHistory();
    result.success = true;

    console.log(
      `✅ State reconciliation complete: +${result.notesAdded} notes, -${result.notesRemoved} notes, ${result.conflicts.length} conflicts`
    );

    return result;
  }

  /**
   * Update client count and manage priority clients
   */
  public updateClientCount(count: number): void {
    this.state.activeClientCount = count;
    this.state.stateVersion++;
    this.state.lastUpdateTimestamp = Date.now();
  }

  /**
   * Add a client to high priority list
   */
  public addPriorityClient(clientId: string): void {
    this.priorityClients.add(clientId);
    console.log(`⭐ Client ${clientId} added to priority list`);
  }

  /**
   * Remove a client from high priority list
   */
  public removePriorityClient(clientId: string): void {
    this.priorityClients.delete(clientId);
    console.log(`⭐ Client ${clientId} removed from priority list`);
  }

  /**
   * Get active notes as array for broadcasting
   */
  public getActiveNotesArray(): Array<{
    midiNumber: number;
    velocity: number;
  }> {
    return Array.from(this.state.activeNotes.values())
      .filter((note) => !note.noteOffTimestamp)
      .map((note) => ({
        midiNumber: note.midiNumber,
        velocity: note.velocity,
      }));
  }

  /**
   * Check if a specific note is currently active
   */
  public isNoteActive(midiNumber: number): boolean {
    const note = this.state.activeNotes.get(midiNumber);
    return !!(note && !note.noteOffTimestamp);
  }

  /**
   * Get comprehensive state statistics
   */
  public getStateStatistics(): {
    activeNoteCount: number;
    lastUpdateTimestamp: number;
    activeClientCount: number;
    stateVersion: number;
    sessionId: string;
    oldestActiveNote: { midiNumber: number; timestamp: number } | undefined;
    newestActiveNote: { midiNumber: number; timestamp: number } | undefined;
    conflictResolutionStrategy: ConflictResolutionStrategy;
    priorityClientCount: number;
    stateHistoryLength: number;
  } {
    const activeNotes = Array.from(this.state.activeNotes.values()).filter(
      (note) => !note.noteOffTimestamp
    );

    const oldestNote = activeNotes.reduce(
      (oldest, note) =>
        !oldest || note.timestamp < oldest.timestamp ? note : oldest,
      undefined as ActiveNote | undefined
    );

    const newestNote = activeNotes.reduce(
      (newest, note) =>
        !newest || note.timestamp > newest.timestamp ? note : newest,
      undefined as ActiveNote | undefined
    );

    return {
      activeNoteCount: activeNotes.length,
      lastUpdateTimestamp: this.state.lastUpdateTimestamp,
      activeClientCount: this.state.activeClientCount,
      stateVersion: this.state.stateVersion,
      sessionId: this.state.sessionId,
      oldestActiveNote: oldestNote
        ? { midiNumber: oldestNote.midiNumber, timestamp: oldestNote.timestamp }
        : undefined,
      newestActiveNote: newestNote
        ? { midiNumber: newestNote.midiNumber, timestamp: newestNote.timestamp }
        : undefined,
      conflictResolutionStrategy: this.conflictResolutionStrategy,
      priorityClientCount: this.priorityClients.size,
      stateHistoryLength: this.stateHistory.length,
    };
  }

  /**
   * Enhanced conflict resolution with multiple strategies
   */
  private resolveNoteConflict(
    localNote: ActiveNote,
    remoteNote: {
      midiNumber: number;
      velocity: number;
      timestamp: number;
      clientId: string;
      priority?: number;
    }
  ): "local_wins" | "remote_wins" | "merge" {
    switch (this.conflictResolutionStrategy) {
      case "latest_wins":
        return remoteNote.timestamp > localNote.timestamp
          ? "remote_wins"
          : "local_wins";

      case "velocity_priority":
        if (remoteNote.velocity > localNote.velocity) return "remote_wins";
        if (localNote.velocity > remoteNote.velocity) return "local_wins";
        // If velocities are equal, fall back to timestamp
        return remoteNote.timestamp > localNote.timestamp
          ? "remote_wins"
          : "local_wins";

      case "client_priority":
        const remoteIsPriority = this.priorityClients.has(remoteNote.clientId);
        const localIsPriority = this.priorityClients.has(localNote.clientId);

        if (remoteIsPriority && !localIsPriority) return "remote_wins";
        if (localIsPriority && !remoteIsPriority) return "local_wins";
        // If both or neither are priority, fall back to timestamp
        return remoteNote.timestamp > localNote.timestamp
          ? "remote_wins"
          : "local_wins";

      case "highest_priority":
        const remotePriority = remoteNote.priority || 0;
        const localPriority = localNote.priority || 0;

        if (remotePriority > localPriority) return "remote_wins";
        if (localPriority > remotePriority) return "local_wins";
        // If priorities are equal, use merge strategy for better collaboration
        return "merge";

      default:
        // Default to latest wins strategy
        return remoteNote.timestamp > localNote.timestamp
          ? "remote_wins"
          : "local_wins";
    }
  }

  /**
   * Get human-readable reason for conflict resolution
   */
  private getConflictReason(
    localNote: ActiveNote,
    remoteNote: {
      midiNumber: number;
      velocity: number;
      timestamp: number;
      clientId: string;
      priority?: number;
    }
  ): string {
    switch (this.conflictResolutionStrategy) {
      case "latest_wins":
        return `Timestamp: ${remoteNote.timestamp} vs ${localNote.timestamp}`;
      case "velocity_priority":
        return `Velocity: ${remoteNote.velocity} vs ${localNote.velocity}`;
      case "client_priority":
        return `Client priority: ${this.priorityClients.has(
          remoteNote.clientId
        )} vs ${this.priorityClients.has(localNote.clientId)}`;
      case "highest_priority":
        return `Priority: ${remoteNote.priority || 0} vs ${
          localNote.priority || 0
        }`;
      default:
        return "Default resolution";
    }
  }

  /**
   * Log conflict resolution for debugging
   */
  private logConflictResolution(conflict: StateConflict): void {
    console.log(
      `⚖️ Conflict resolved: Note ${conflict.local.midiNumber} - ${conflict.resolution} (${conflict.reason})`
    );
  }

  /**
   * Check if a client can remove a note owned by another client
   */
  private canClientRemoveNote(note: ActiveNote, clientId: string): boolean {
    // Priority clients can remove any note
    if (this.priorityClients.has(clientId)) {
      return true;
    }

    // Allow removal if note is old (potential orphaned note)
    const noteAge = Date.now() - note.timestamp;
    const MAX_NOTE_AGE = 30000; // 30 seconds

    return noteAge > MAX_NOTE_AGE;
  }

  /**
   * Update state metadata and maintain history
   */
  private updateStateMetadata(): void {
    this.state.lastUpdateTimestamp = Date.now();
    this.state.stateVersion++;
    this.updateStateHistory();
  }

  /**
   * Maintain state history for debugging and analysis
   */
  private updateStateHistory(): void {
    this.stateHistory.push({
      timestamp: this.state.lastUpdateTimestamp,
      version: this.state.stateVersion,
      noteCount: this.state.activeNotes.size,
    });

    // Keep only last 100 entries
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }
  }

  /**
   * Generate unique session ID for this server instance
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
