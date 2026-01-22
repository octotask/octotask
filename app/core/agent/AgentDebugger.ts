import { EventEmitter } from 'events';

export type DebuggerStatus = 'running' | 'paused';

export class AgentDebugger extends EventEmitter {
  private _status: DebuggerStatus = 'running';
  private _breakpoints = new Set<number>();

  constructor() {
    super();
  }

  getStatus(): DebuggerStatus {
    return this._status;
  }

  setBreakpoint(iteration: number) {
    this._breakpoints.add(iteration);
  }

  removeBreakpoint(iteration: number) {
    this._breakpoints.delete(iteration);
  }

  async checkBreakpoint(iteration: number) {
    if (this._breakpoints.has(iteration)) {
      this.pause();
      await this._waitForStep();
    }
  }

  pause() {
    this._status = 'paused';
    this.emit('paused');
  }

  continue() {
    this._status = 'running';
    this.emit('continued');
  }

  step() {
    this.emit('step');
  }

  private _waitForStep(): Promise<void> {
    return new Promise((resolve) => {
      const onStep = () => {
        this.removeListener('continued', onContinue);
        resolve();
      };
      const onContinue = () => {
        this.removeListener('step', onStep);
        resolve();
      };
      this.once('step', onStep);
      this.once('continued', onContinue);
    });
  }
}
