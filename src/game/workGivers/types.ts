export interface WorkCandidate<T = any> {
  workType: string;
  task: string;
  target: T;
  distance: number;
  priority: number;
  extraData?: any;
}

export interface WorkGiverContext {
  game: any;
  colonist: any;
  getWorkPriority: (workType: string) => number;
  canDoWork: (workType: string) => boolean;
}

export interface WorkGiver {
  /** Return zero or more job candidates for the given colonist */
  getCandidates(ctx: WorkGiverContext): WorkCandidate[];
}
