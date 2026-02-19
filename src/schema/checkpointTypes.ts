export type UnderstandingLevel = 'green' | 'yellow' | 'red';

export type DifficultyCause =
  | 'topic'
  | 'task'
  | 'approach'
  | 'execution'
  | 'mistake'
  | 'other';

export type CheckpointResponse = {
  understanding: UnderstandingLevel;
  causes?: DifficultyCause[];  // one or more causes when understanding !== 'green'
  submittedAt: number;         // unix timestamp ms
};
