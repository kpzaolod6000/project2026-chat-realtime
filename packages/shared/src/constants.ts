/**
 * Values fixed by design.md and enforced on both sides of the wire.
 *
 * A constant belongs here only when more than one package validates
 * against it. Single-consumer values live in the module that owns them.
 */

/** Maximum characters accepted in one chat message (task 9.3). */
export const CHAT_MAX_LENGTH = 2000;

/**
 * Maximum messages kept in a client's session buffer, and the cap on a
 * history_response relayed to a late joiner (tasks 9.5, 9.8).
 */
export const MAX_HISTORY_MESSAGES = 50;
