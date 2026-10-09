const ERROR_REASON = {
  pathExistsAsFile: 'path exists as a file',
  pathExistsAsDir: 'path exists as a directory',
} as const;

type ErrorReasonType = typeof ERROR_REASON;
type ReasonCb = (
  reason: ErrorReasonType,
) => ErrorReasonType[keyof ErrorReasonType];

export class CreateTreeError extends Error {
  #path: string;

  #type: 'file' | 'dir';

  constructor(
    type: 'file' | 'dir',
    path: string,
    reason?: ReasonCb | (string & {}),
  ) {
    function getReason(errorReason: NonNullable<typeof reason>): string {
      return typeof errorReason === 'function'
        ? errorReason(ERROR_REASON)
        : errorReason;
    }

    const fileType = type === 'dir' ? 'directory' : 'file';
    const errorReason = reason != null ? `: ${getReason(reason)}` : '';
    const message = `Cannot create ${fileType}${errorReason}`;

    super(message);

    this.#type = type;
    this.#path = path;
  }

  get path(): string {
    return this.#path;
  }

  get type(): string {
    return this.#type;
  }
}
